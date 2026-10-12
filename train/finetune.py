#!/usr/bin/env python3
"""Fine-tune a small Qwen on the engine's own answers.

Consumes the JSONL exported by ask.html ("Export training data"): each line is
one {question, terms, facts, sections, answer} record captured from a real
retrieval run. The model is trained in chat format to reproduce the engine's
structured prose from the same numbered facts -- it learns *this job*, from
your corpus, which is where a 1.5B specialised model beats a general chatbot
on UPSC answers.

Run on any free Colab GPU (T4 works):

    pip install -q transformers peft accelerate datasets bitsandbytes
    python finetune.py --data ask-training.jsonl --out qwen-upsc-lora

Then serve the adapter anywhere (llama.cpp, Ollama, vLLM, or a plain Python
server exposing an OpenAI-style /v1/chat/completions) and point the page at it:

    VlymbooqAskLLM.setBackend('http://localhost:8000/v1/chat/completions');

No CDN, no WebGPU, no external model -- the writer is then fully your own.
"""
import argparse
import json

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Trainer,
    TrainingArguments,
)

SYSTEM = (
    "You write UPSC mains answers strictly from the numbered corpus facts "
    "given. Never invent a claim the facts do not support. Structure: "
    "Introduction, Challenges, Way forward. Cite facts as [n]."
)


def build_prompt(rec):
    facts = "\n".join(
        "[%d] (%s) %s" % (i + 1, f.get("entity") or "corpus", f["sentence"])
        for i, f in enumerate(rec.get("facts", []))
    )
    user = "Question: %s\n\nCorpus facts:\n%s" % (rec["q"], facts)
    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user},
        {"role": "assistant", "content": rec["answer"]},
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="exported ask-training.jsonl")
    ap.add_argument("--base", default="Qwen/Qwen2.5-1.5B-Instruct")
    ap.add_argument("--out", default="qwen-upsc-lora")
    ap.add_argument("--epochs", type=float, default=3.0)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--batch", type=int, default=1)
    ap.add_argument("--seq", type=int, default=2048)
    args = ap.parse_args()

    rows = [json.loads(line) for line in open(args.data, encoding="utf-8") if line.strip()]
    rows = [r for r in rows if r.get("answer") and r.get("facts")]
    if len(rows) < 10:
        raise SystemExit(
            "Only %d usable records. Use the page for a while and export again; "
            "a few dozen examples is the realistic minimum." % len(rows))
    print("records: %d" % len(rows))

    tok = AutoTokenizer.from_pretrained(args.base)
    model = AutoModelForCausalLM.from_pretrained(
        args.base, torch_dtype=torch.float16, device_map="auto")

    def prep(rec):
        text = tok.apply_chat_template(
            build_prompt(rec), tokenize=False, add_generation_prompt=False)
        ids = tok(text, truncation=True, max_length=args.seq)
        ids["labels"] = ids["input_ids"].copy()
        return ids

    ds = Dataset.from_list(rows).map(prep, remove_columns=["q", "subject", "terms",
                                                           "facts", "plan", "sections",
                                                           "answer", "model", "ts"])
    lora = LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"])
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=args.out, num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch,
            learning_rate=args.lr, lr_scheduler_type="cosine",
            warmup_ratio=0.03, logging_steps=10,
            save_strategy="no", bf16=torch.cuda.is_bf16_supported(),
            report_to=[]),
        train_dataset=ds,
        data_collator=DataCollatorForSeq2Seq(tok, padding=True),
    ).train()

    model.save_pretrained(args.out)
    tok.save_pretrained(args.out)
    print("adapter saved to %s -- serve it and plug it in with setBackend()." % args.out)


if __name__ == "__main__":
    main()

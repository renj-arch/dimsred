#!/usr/bin/env python3
"""Fine-tune a small Qwen on the engine's own answers.

Consumes the JSONL exported by ask.html ("Export training data"): each line is
one {question, terms, facts, sections, answer} record captured from a real
retrieval run. The model is trained in chat format to reproduce the engine's
structured prose from the same numbered facts -- it learns *this job*, from
your corpus, which is where a specialised model beats a general chatbot on
UPSC answers.

Primary runner: .github/workflows/train-writer.yml (CPU, free on a public
repo). It calls this script with --merged-out, converts the merged weights to
MLC q4f16_1, and force-pushes them to the `writer-model` branch where the page
discovers them. Local/Colab runs still work:

    pip install -q transformers peft accelerate datasets
    python finetune.py --data ask-training.jsonl --out qwen-upsc-lora \
        --merged-out qwen-upsc-merged

The adapter alone can also be served anywhere (llama.cpp, Ollama, vLLM, or a
plain Python server exposing an OpenAI-style /v1/chat/completions) and the page
pointed at it:

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
    ap.add_argument("--base", default="Qwen/Qwen2.5-0.5B-Instruct")
    ap.add_argument("--out", default="qwen-upsc-lora")
    ap.add_argument("--epochs", type=float, default=3.0)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--batch", type=int, default=1)
    ap.add_argument("--seq", type=int, default=2048)
    ap.add_argument("--max-samples", type=int, default=0,
                    help="train on only the most recent N records (0 = all)")
    ap.add_argument("--merged-out", default=None,
                    help="also merge the adapter into the base and save the "
                         "full weights here (needed for MLC/WebLLM conversion)")
    args = ap.parse_args()

    rows = [json.loads(line) for line in open(args.data, encoding="utf-8") if line.strip()]
    rows = [r for r in rows if r.get("answer") and r.get("facts")]
    if args.max_samples > 0:
        rows = rows[-args.max_samples:]
    if len(rows) < 10:
        raise SystemExit(
            "Only %d usable records. Use the page for a while and export again; "
            "a few dozen examples is the realistic minimum." % len(rows))
    print("records: %d" % len(rows))

    cuda = torch.cuda.is_available()
    bf16 = cuda and torch.cuda.is_bf16_supported()
    tok = AutoTokenizer.from_pretrained(args.base)
    model = AutoModelForCausalLM.from_pretrained(
        args.base, torch_dtype=torch.float16 if cuda else torch.float32,
        device_map="auto" if cuda else None)

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

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=args.out, num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch,
            learning_rate=args.lr, lr_scheduler_type="cosine",
            warmup_ratio=0.03, logging_steps=10,
            save_strategy="no", bf16=bf16, use_cpu=not cuda,
            report_to=[]),
        train_dataset=ds,
        data_collator=DataCollatorForSeq2Seq(tok, padding=True),
    )
    trainer.train()

    if args.merged_out:
        # Full merged weights, not just the adapter: MLC/WebLLM conversion needs
        # a complete HF checkpoint (config.json + safetensors + tokenizer).
        merged = model.merge_and_unload()
        merged.save_pretrained(args.merged_out)
        tok.save_pretrained(args.merged_out)
        print("merged model saved to %s -- ready for mlc_llm convert_weight." %
              args.merged_out)

    model.save_pretrained(args.out)
    tok.save_pretrained(args.out)
    print("adapter saved to %s -- serve it and plug it in with setBackend()." % args.out)


if __name__ == "__main__":
    main()

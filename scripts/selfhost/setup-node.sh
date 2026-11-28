#!/bin/bash
# vlymbooq self-hosted generation node — run ONCE on the Oracle VM.
# Usage:  bash setup-node.sh <github-repo> <runner-name>
# Example: bash setup-node.sh renj-arch/dimsred oracle-01
#
# Does: swap, Ollama + qwen2.5:14b, repo clone, self-hosted runner install,
# systemd service. Idempotent — safe to re-run.
set -euo pipefail

REPO="${1:?usage: setup-node.sh <owner/repo> <runner-name>}"
NAME="${2:?usage: setup-node.sh <owner/repo> <runner-name>}"
WORK=/opt/vlymbooq
MODEL="${OLLAMA_MODEL:-qwen2.5:14b-instruct-q4_K_M}"

echo "== swap (24GB VM: keep 8G swap for 14B weights) =="
if ! swapon --show | grep -q swapfile; then
  sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
sudo sysctl -w vm.swappiness=10 || true

echo "== ollama =="
if ! command -v ollama >/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi
sudo mkdir -p /etc/systemd/system/ollama.service.d
printf '[Service]\nEnvironment=OLLAMA_MODELS=/usr/share/ollama/.ollama/models\nEnvironment=OLLAMA_KEEP_ALIVE=30m\nEnvironment=OLLAMA_NUM_PARALLEL=1\n' \
  | sudo tee /etc/systemd/system/ollama.service.d/runner.conf >/dev/null
sudo systemctl daemon-reload && sudo systemctl restart ollama
sleep 3
curl -sf http://127.0.0.1:11434/api/tags >/dev/null && echo "ollama up" || { echo "ollama failed"; exit 1; }

echo "== pull model $MODEL =="
ollama pull "$MODEL"

echo "== repo + runner =="
sudo mkdir -p "$WORK" && sudo chown "$USER:$USER" "$WORK"
cd "$WORK"
if [ ! -d dimsred/.git ]; then
  git clone "https://github.com/$REPO.git" dimsred
fi
cd dimsred

echo "== register self-hosted runner (needs a runner token) =="
# The operator supplies the token: gh api repos/$REPO/actions/runners/registration-token --jq .token
# or paste a fine-grained PAT with repo scope. Never hardcode it here.
TOKEN="${RUNNER_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  echo "RUNNER_TOKEN not set — install runner manually or re-run with it."
  echo "Get one: gh api repos/$REPO/actions/runners/registration-token --jq .token"
else
  RUNNER_DIR="$WORK/actions-runner"
  if [ ! -d "$RUNNER_DIR" ]; then
    mkdir -p "$RUNNER_DIR" && cd "$RUNNER_DIR"
    curl -fsSL -o runner.tgz https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-arm64-2.328.0.tar.gz
    tar xzf runner.tgz
  fi
  cd "$RUNNER_DIR"
  ./config.sh --url "https://github.com/$REPO" --token "$TOKEN" \
    --name "$NAME" --labels self-hosted,linux,arm64,local-llm --unattended --replace
  sudo ./svc.sh install "$USER"
  sudo ./svc.sh start
  echo "runner service started"
fi

echo "== done =="
echo "Runner '$NAME' online if token path ran. Ollama serving $MODEL at 127.0.0.1:11434"
echo "Next: dispatch a workflow with runs-on: [self-hosted, local-llm]"

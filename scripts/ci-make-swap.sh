#!/bin/bash
# Create the swap file the model lanes need, without letting a full runner disk
# fail the whole workflow.
#
# GitHub's stock ubuntu-latest image ships ~14GB free. A 16GB swap file plus
# the model cache and the checkout can cross that line, and several runs died
# at the old inline `dd` with "No space left on device" (Site Agent #590,
# Question Quality 2026-11-04, ...). Reclaim the bundled toolchains first, try
# 16GB, fall back to 8GB, and continue without swap if neither works: the fast
# tier fits in RAM and the heavy tier should fail later at model load, not at
# setup where no useful work has happened yet.
set -uo pipefail

# Same reclamation list the Author/Film lanes use.
sudo rm -rf /usr/share/dotnet /usr/local/lib/android /opt/ghc \
  /usr/local/share/boost "${AGENT_TOOLSDIRECTORY:-}" 2>/dev/null || true
sudo apt-get clean 2>/dev/null || true

for size in 16384 8192; do
  echo "ci-make-swap: trying ${size}MB"
  if sudo dd if=/dev/zero of=/tmp/swapfile bs=1M count="$size" status=progress \
     && sudo chmod 600 /tmp/swapfile \
     && sudo mkswap /tmp/swapfile \
     && sudo swapon /tmp/swapfile; then
    echo "ci-make-swap: ${size}MB ready"
    free -h || true
    exit 0
  fi
  sudo swapoff /tmp/swapfile 2>/dev/null || true
  sudo rm -f /tmp/swapfile
done

echo "::warning::ci-make-swap: could not create swap — continuing without it"
free -h || true
exit 0

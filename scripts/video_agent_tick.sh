#!/bin/bash
# One pass of the local half of the email video agent.
#
# TWO PROCESSES, IN THIS ORDER, AND THE ORDER IS THE POINT. Propose reads the
# source and sends a proposal; it never spends. The worker renders what has been
# approved with a code; it never interprets. Keeping them separate means one bug
# cannot both invent a job and pay for it.
#
# Run by launchd every few minutes. Everything it needs is committed except the
# env file, so a failure here is a real failure rather than a setup problem.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# nvm-managed, so this path carries a version in it and a node upgrade WILL move
# it. launchd has no shell profile and therefore no nvm shims, so it has to be
# absolute — and it has to fail loudly rather than silently doing nothing for
# weeks, which is what a missing binary in a background job looks like.
NODE="/Users/lamontevans/.nvm/versions/node/v23.11.0/bin/node"
if [ ! -x "$NODE" ]; then
  echo "  node is not at $NODE any more (nvm upgrade?) — re-run scripts/install_video_agent_launchd.sh"
  exit 1
fi

STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=== $STAMP"

# Skip entirely when the machine has no network — otherwise every offline minute
# writes a stack trace into the log and buries the real failures.
if ! /sbin/ping -c1 -t2 8.8.8.8 >/dev/null 2>&1; then
  echo "  offline, skipping"
  exit 0
fi

"$NODE" --experimental-strip-types --import ./scripts/_alias-loader.mjs \
  scripts/video_agent_propose.mjs 2>&1 | grep -vE "ExperimentalWarning|Reparsing|To eliminate|trace-warnings|MODULE_TYPELESS|^\(node:|injected env"

"$NODE" scripts/video_agent_worker.js 2>&1 | grep -vE "^\(node:|injected env"

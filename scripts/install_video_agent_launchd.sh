#!/bin/bash
# Install (or re-install) the launchd job that runs the local half of the email
# video agent.
#
# Re-run this after an nvm node upgrade: the tick script pins an absolute node
# path because launchd loads no shell profile, and that path carries a version.
set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

REPO="$(pwd)"
LABEL="com.shearquery.video-agent"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$REPO/.cache/video-agent.log"
mkdir -p "$(dirname "$LOG")" "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO/scripts/video_agent_tick.sh</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>StartInterval</key><integer>300</integer>
  <!-- Deliberately NOT RunAtLoad: loading this must not immediately start
       something that can spend money. The first pass comes on the interval. -->
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
  <key>ProcessType</key><string>Background</string>
</dict>
</plist>
PLISTEOF

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"
echo "installed $LABEL — every 300s while this Mac is awake"
echo "  log:       $LOG"
echo "  stop:      launchctl bootout gui/$UID/$LABEL"
echo "  run now:   launchctl kickstart -p gui/$UID/$LABEL"

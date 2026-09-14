#!/bin/bash
# Install the repair into an existing MiraBox plugin; preserve its settings.
set -eu
REPAIR_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
BUNDLE='com.orumad.streamdock.macshortcuts.sdPlugin'
SOURCE="$REPAIR_ROOT/$BUNDLE"
fail() { printf '\n%s\n' "$1" >&2; exit 1; }
[[ "$(/usr/bin/uname -s)" == 'Darwin' ]] || fail 'Run this installer on your Mac.'
if /usr/bin/pgrep -x 'Stream Dock' >/dev/null || /usr/bin/pgrep -x 'StreamDock' >/dev/null; then
    fail 'Quit Stream Dock completely, then run this installer again.'
fi
TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
    for PARENT in "$HOME/Library/Application Support/HotSpot/StreamDock/Plugins" "$HOME/Library/Application Support/HotSpot/StreamDock/plugins"; do
        CANDIDATE="$PARENT/$BUNDLE"
        if [[ -d "$CANDIDATE" ]]; then
            if [[ -n "$TARGET" && ! "$CANDIDATE" -ef "$TARGET" ]]; then
                fail 'More than one plugin installation exists. Run this script with the desired plugin folder as its argument.'
            fi
            TARGET="$CANDIDATE"
        fi
    done
fi
[[ -n "$TARGET" && -d "$TARGET" && ! -L "$TARGET" ]] || fail 'Could not find the existing plugin. Run this script with its .sdPlugin folder as the first argument.'
[[ -f "$TARGET/StreamDeck-Shortcuts" && -f "$TARGET/manifest.json" ]] || fail 'This folder does not contain the expected Mac Shortcuts plugin.'
for FILE in StreamDock-Wrapper normalize-info.js manifest.json pi/main_pi.html pi/main_pi.js; do
    [[ -f "$SOURCE/$FILE" ]] || fail "The repair package is missing $FILE. Extract the entire ZIP first."
done
TARGET_PARENT="$(cd -- "$(dirname -- "$TARGET")" && pwd)"
TARGET="$TARGET_PARENT/$(basename -- "$TARGET")"
STAGE="$(/usr/bin/mktemp -d "$TARGET_PARENT/.mac-shortcuts-repair.XXXXXX")"
BACKUP_ROOT="$HOME/Library/Application Support/MiraBox-Shortcuts-Backups"
/bin/mkdir -p "$BACKUP_ROOT"
BACKUP_PARENT="$(/usr/bin/mktemp -d "$BACKUP_ROOT/repair-$(/bin/date +%Y%m%d-%H%M%S).XXXXXX")"
BACKUP="$BACKUP_PARENT/$BUNDLE"
# Stage a complete copy first. No original files move until staging succeeds.
/usr/bin/ditto "$TARGET" "$STAGE/$BUNDLE"
for FILE in StreamDock-Wrapper normalize-info.js manifest.json pi/main_pi.html pi/main_pi.js; do
    /bin/cp "$SOURCE/$FILE" "$STAGE/$BUNDLE/$FILE"
done
/bin/chmod 755 "$STAGE/$BUNDLE/StreamDock-Wrapper" "$STAGE/$BUNDLE/StreamDeck-Shortcuts"
# Keep the original intact outside MiraBox's plugin scan directory.
/bin/mv "$TARGET" "$BACKUP"
if ! /bin/mv "$STAGE/$BUNDLE" "$TARGET"; then
    /bin/mv "$BACKUP" "$TARGET"
    fail 'Installation failed. Your original plugin was restored.'
fi
/bin/rmdir "$STAGE"
printf '\nRepair 1.0.1 installed. Reopen Stream Dock and select your shortcut button.\n\nOriginal plugin backup:\n%s\n\nLauncher diagnostics:\n%s\n' "$BACKUP" "$HOME/Library/Logs/MiraBox-Shortcuts/launcher.log"

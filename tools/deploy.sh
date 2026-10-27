#!/usr/bin/env bash
# Install an APK on the redroid test container and launch CSP. Reproducible.
set -euo pipefail
APK="$1"
DEV="${2:-127.0.0.1:15555}"
PKG=jp.co.celsys.clipstudiopaint.googleplay
ACT=com.celsys.pwlegacyandroidhelpers.PWLegacyJniCustomNativeActivityAndroid
SZ=$(stat -c %s "$APK")

echo "[1/4] push"
adb -s "$DEV" shell "rm -f /data/local/tmp/deploy.apk" || true
adb -s "$DEV" push "$APK" /data/local/tmp/deploy.apk | tail -1

echo "[2/4] session install"
SID=$(adb -s "$DEV" shell "pm install-create -r -t -S $SZ" | tr -d '\r' | sed -n 's/.*\[\([0-9]*\)\].*/\1/p')
[ -n "$SID" ] || { echo "install-create failed"; exit 1; }
adb -s "$DEV" shell "pm install-write -S $SZ $SID base /data/local/tmp/deploy.apk" | tr -d '\r'
adb -s "$DEV" shell "pm install-commit $SID" | tail -2 | tr -d '\r'

echo "[3/4] restart"
adb -s "$DEV" shell am force-stop "$PKG"
sleep 3
adb -s "$DEV" shell am start -n "$PKG/$ACT" >/dev/null

echo "[4/4] wait for UI"
sleep 45
adb -s "$DEV" shell pidof "$PKG" | tr -d '\r'
echo
echo "Screenshot: adb -s $DEV exec-out screencap -p > shot.png"

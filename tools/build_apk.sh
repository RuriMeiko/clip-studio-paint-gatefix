#!/usr/bin/env bash
# Build a signed CSP APK from a patched lib. Reproducible, one command.
set -euo pipefail
ROOT=/data/3dproject/.apkpatch
BASE_APK="$ROOT/csp_full_patched.apk"     # Morphe-signed 5.1.4 full APK
LIB_OUT="$1"                              # patched libClipStudioPaint.so
OUT_APK="$2"                              # output APK path
BT=/data/dev-assets/rurimeiko/Android/Sdk/build-tools/36.0.0
KS="$ROOT/morphe_p12.p12"

WORK=$(mktemp -d "$ROOT/work.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

echo "[1/5] extract base APK"
( cd "$WORK" && unzip -q -o "$BASE_APK" )

echo "[2/5] install patched lib"
cp "$LIB_OUT" "$WORK/lib/arm64-v8a/libClipStudioPaint.so"
rm -rf "$WORK/META-INF"

echo "[3/5] zip (resources.arsc + .so stored)"
OUT_U="$WORK/u.apk"
( cd "$WORK" && zip -q -r -X -n .so:arsc "$OUT_U" . -x '.*' )

echo "[4/5] zipalign"
OUT_A="$WORK/a.apk"
"$BT/zipalign" -f -p 4 "$OUT_U" "$OUT_A"

echo "[5/5] sign with Morphe key"
rm -f "$OUT_APK"
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:morphe --key-pass pass:morphe \
  --ks-key-alias morphe --out "$OUT_APK" "$OUT_A"
"$BT/apksigner" verify "$OUT_APK"

echo "OK: $OUT_APK ($(stat -c %s "$OUT_APK") bytes)"

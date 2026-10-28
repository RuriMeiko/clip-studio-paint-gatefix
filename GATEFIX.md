# CSP gate fix — RECOVERED & VERIFIED (2026-10-28)

## Ket qua

| Hang muc | Trang thai |
|---------|-----------|
| Gate khoi dong (View plans / Try for free / Log in) | **BIEN MAT** — vao thang Clip Studio START |
| Force-stop + mo lai | **Gate van khong hien** |
| Save | **HOAT DONG** — project `Illustration 20261028` duoc luu that |
| Export | OK |
| Doodle mode banner / popup | Khong con |
| Crash | Khong |

## Nguon goc

Lib gate-fix goc van con tren dia:
`csp/arm64/lib/arm64-v8a/libClipStudioPaint.so`
(195,412,600 B, md5 `7eec82920423974677b4646978a2f24f`, 27/10 17:34)

Diff voi lib sach `/tmp/base0/...` (md5 `1cbc8ea66309c6d60964d42d807c1c54`) cho ra **14 vung**, trong do 13 vung co nghia:

| VA | Goc | Moi | Y nghia |
|----|-----|-----|---------|
| `0x4a85fc0` | `13` | `1f` | clear doodle flag store 1 |
| `0x4a86030` | `13` | `1f` | clear doodle flag store 2 |
| `0x4bad268` | `09` | `1f` | clear doodle flag store 3 |
| `0x4c905c8` | `68` | `7f` | cmp #3 -> #0x7f (doodle check 4) |
| `0x4c90734` | `35` | `3f` | cbnz -> ? (doodle check 5) |
| `0x5f3ef6c` | `68008052` | `48008052` | `mov w8,#3` -> `mov w8,#0` — khong set mode 3 |
| `0x5f40700` | `68008052` | `48008052` | nhu tren, site 2 |
| `0x72015a4` | `28b17039` | `e8031f2a` | `ldrb w8,[x9,#3116]` -> `mov w8,wzr` — cached flag luon 0 |
| `0x72015e0` | `68` | `48` | `mov w8,#3` -> `mov w8,#0` |
| `0x7201600` | `0801c0d2` | `0b000014` | `mov x8,#0x800000000` -> `b 0x720162c` — **BO KHOI DUNG DIALOG** |
| `0x79b4734` | `ab273129bf01176b` | `40008052c0035fd6` | `mov w0,#2; ret` (returnAllProductPlan) |
| `0x79b8738` | `1f050071` | `1ffd0171` | `cmp w8,#1` -> `cmp w8,#0x7f` |
| `0xb591d94` | `38090094` | `05000014` | `bl ...` -> `b +5` |

**Diem mau chot:** `0x7201600` khong phai `cbnz` — no nhay qua phan dung dialog
**ngay ben trong nhanh da duoc chon**, giu nguyen `0x720162c` phia sau.
Do la ly do 12 lan thu truoc treo splash / crash: chung cat ngang blocking modal,
con patch nay chi bo phan *dung* dialog.

## Build

```bash
unzip csp_full_patched.apk -d /tmp/gfbuild   # base Morphe da co san 7 patch
cp csp/arm64/lib/arm64-v8a/libClipStudioPaint.so /tmp/gfbuild/lib/arm64-v8a/
zip -q -r -X -n .so:arsc /tmp/gf_unsigned.apk .
zipalign -f -p 4 /tmp/gf_unsigned.apk /tmp/gf_aligned.apk
apksigner sign --ks morphe_p12.p12 --ks-pass pass:morphe \
  --key-pass pass:morphe --ks-key-alias morphe \
  --out csp_gatefix_v2.apk /tmp/gf_aligned.apk
```

Ket qua: `csp_gatefix_v2.apk` (497,005,016 B)
sha256 `bf8a2ee4cee94c13a9692e6bd8e3bbe1021460e400082015d384321c1955d125`
Cert `CN=Morphe`, SHA-256 `331f1042...f86814` — **cung khoa ban dang cai, cai de khong mat du lieu**.

## Kiem chung tren may ao (127.0.0.1:15555)

1. Cai bang session install -> `Success`
2. Force-stop -> `am start` -> **Clip Studio START hien ra truc tiep, khong gate**
3. Vao Draw -> New canvas (Screen size) -> ve 2 net -> back
4. Projects tab -> **`Illustration 20261028`** hien ra voi thumbnail that
5. Force-stop lan 2 -> mo lai -> **van khong co gate**

## Y nghia voi tablet

Tablet khong root, khong mitm duoc (Android 16 chuyen CA store sang APEX read-only,
Shizuku chi co quyen shell = khong ghi duoc `/system`). Nhung khong can mitm:
**patch APK nay giai quyet truc tiep**.

## Con lai

- Doi user cam tablet de cai (can xac nhan truoc khi thao tac)
- Backup Drive cho ibis van treo (quota 64 MB)
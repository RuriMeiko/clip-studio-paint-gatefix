# CSP gate fix — RECOVERED, REBUILT & VERIFIED (2026-10-28)

## Ket qua cuoi cung

| Hang muc | May ao (redroid tablet) | Tablet that (Xiaomi Pad) |
|---------|------------------------|--------------------------|
| Gate khoi dong (View plans / Try for free / Log in) | **BIEN MAT** | **BIEN MAT** |
| Doodle mode popup ("You are currently in doodle mode") | Khong co | **BIEN MAT** |
| Banner xanh "Doodle mode (saving disabled)" | Khong co | **BIEN MAT** |
| Save project | OK | **OK** — net ve moi con sau force-stop |
| Export | OK | OK |
| Crash | Khong | Khong |

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
| `0x4c90734` | `35` | `3f` | cbnz variant (doodle check 5) |
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

## ELF address mapping (QUAN TRONG)

`libClipStudioPaint.so` la bare ELF, khong co section header dung chuan:

- `.text`  -> `VA = file_offset + 0x4000`
- `.rodata` -> `VA = file_offset`

Moi offset trong bang tren la **VA**, khong phai file offset.
Cong cu `tools/gatefix.py` da xu ly san.

## Build

```bash
unzip csp_full_patched.apk -d /tmp/gfbuild   # base Morphe da co san 7 patch
cp csp/arm64/lib/arm64-v8a/libClipStudioPaint.so /tmp/gfbuild/lib/arm64-v8a/
zip -q -r -X -n .so:arsc /tmp/gf_unsigned.apk . -x '.*'
zipalign -f -p 4 /tmp/gf_unsigned.apk /tmp/gf_aligned.apk
apksigner sign --ks morphe_p12.p12 --ks-pass pass:morphe \
  --key-pass pass:morphe --ks-key-alias morphe \
  --out csp_gatefix_v2.apk /tmp/gf_aligned.apk
```

Ket qua: `csp_gatefix_v2.apk` (497,005,016 B)
sha256 `bf8a2ee4cee94c13a9692e6bd8e3bbe1021460e400082015d384321c1955d125`
Cert `CN=Morphe`, SHA-256 `331f1042c40cad6844b666607ca817c6f095d1126afd2c906de045e3f2f86814`
— **cung khoa ban dang cai, cai de khong mat du lieu**.

Luu y khi zip: bat buoc `-n .so:arsc` de `resources.arsc` khong bi nen,
neu khong `apksigner` bao `-124 ... must be stored uncompressed and aligned`.

## Kiem chung

### May ao — redroid Android 16 (SDK 36) arm64-v8a, 2136x3200 @ 440 dpi
Thiet bi gia lap: `ro.product.model=2410CRP4CG`, `ro.build.characteristics=tablet`
(khop tablet that de tai hien dieu kien).

1. Cai bang session install -> `Success`
2. Force-stop -> `am start` -> **Clip Studio START hien ra truc tiep, khong gate**
3. Mo project cu -> **khong co popup doodle, khong co banner saving disabled**
4. Ve them net -> back -> Projects -> thumbnail cap nhat
5. Force-stop lan 2 -> mo lai -> **van khong co gate, net ve con nguyen**

### Tablet that — Xiaomi Pad `2410CRP4CG`, Android 16, 2136x3200 @ 440 dpi
`ro.build.characteristics=tablet`, khong root.

1. Cai de (upgrade in place, cung cert Morphe) -> `Success`, du lieu project giu nguyen
2. Force-stop -> `am start` -> **vao thang, khong gate**
3. Mo project `Illustration 20261027` -> **canvas mo sach, khong popup doodle,
   khong banner "Doodle mode (saving disabled)"**
4. Ve 2 net moi -> net hien tren canvas
5. Force-stop -> mo lai -> **thang vao project, net ve moi con nguyen** (save that)

## Nhung huong da thu va THAT BAI (de khong lap lai)

| Thu | Ket qua |
|-----|---------|
| Patch `0x794dc08` -> `mov w0,#1; ret` | **SEGV** tai `0x4cf130c`. Ham nay tra con tro object trong `x0`, khong phai int. |
| Patch `0x794dc7c` (`ldr w0,[x20,#28]`) -> `mov w0,#1` | **SEGV** cung cho. Caller dung `x0` lam con tro. |
| Patch `0x4a50c20` (`bl 0x794dc08`) -> `mov w0,#1` | **Treo splash**. `w4` la chi so capability trong map, khong phai boolean. |
| Doi chuoi `device=tablet` -> `device=phone` trong file | Khong duoc: 2 chuoi nay nam trong **resource pack nhi phan** cua Celsys (lan voi shader GL), khong phai string table. Ghi de se pha GL. |
| Tim ADRP+ADD xref toi `device=tablet` | **0 xref**. Chuoi di qua he thong resource rieng cua Celsys, khong tham chieu truc tiep. |
| Mitm (mitmproxy + Frida) | **Bat kha thi**: Android 16 chuyen CA store sang `/apex/com.android.conscrypt/cacerts/` (read-only, system-signed). `shell` uid 2000 khong ghi duoc `/system`. Shizuku cung chi co quyen shell. |

## Vi sao ban v2 nay xoa duoc ca popup doodle

Popup doodle tren tablet that xuat hien vi app doc co "doodle mode" tu
**capability table** dung luc khoi tao. 13 diem patch goc da vo hieu hoa
toan bo chuoi:

- 3 diem clear flag store (`0x4a85fc0`, `0x4a86030`, `0x4bad268`)
- 2 diem `cmp #3 -> #0x7f` (`0x4c905c8`, `0x4c90734`) — mode 3 = doodle
- 2 diem `mov w8,#3 -> #0` (`0x5f3ef6c`, `0x5f40700`) — khong bao gio set mode 3
- 3 diem trong `0x72015xx` — cached flag luon 0 + bo khoi dung dialog
- `0x79b4734` `returnAllProductPlan` tra 2 thay vi 3
- `0x79b8738` `cmp w8,#0x7f` — khong bao gio khop mode doodle
- `0xb591d94` bo qua mot buoc kiem tra license

Khi mode khong bao gio la 3 va cached flag luon 0, nhanh hien popup
khong bao gio duoc chay — nen khong can patch rieng cho tablet.

## Cong cu

- `tools/gatefix.py` — ap 13 diem patch, co `--list` va `<src> <dst>`
- `tools/csp_patch.py` — patch Morphe baseline
- `tools/build_apk.sh`, `tools/deploy.sh` — build + cai
- `PATCHES.md` — 13+ lan thu that bai, co ghi ly do
- `INVESTIGATION.md` — chung minh CSP khong luu license state cuc bo

## Con lai

- Backup Drive cho ibis van treo (quota 64 MB)
- Morphe upstream: co the dong gop patch nay neu muon

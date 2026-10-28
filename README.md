# CLIP STUDIO PAINT — gate & doodle-mode fix

Patch set cho **CLIP STUDIO PAINT (Android) 5.1.4** để app chạy **offline, không cần login,
không quảng cáo, lưu project bình thường**.

Xoá được hai thứ:

1. **Gate khởi động** — màn hình "View plans / Try for free / Log in" chặn vào app.
2. **Doodle mode popup** — "You are currently in doodle mode." + banner xanh
   "Doodle mode (saving disabled)" trên tablet.

Không cần root. Không cần mitm. Không cần login. Chỉ cài APK đã patch.

## Trạng thái đã kiểm chứng

| Hạng mục | Máy ảo (redroid, tablet config) | Tablet thật (Xiaomi Pad) |
|----------|--------------------------------|--------------------------|
| Gate khởi động | **biến mất** | **biến mất** |
| Doodle popup | không có | **biến mất** |
| Banner "saving disabled" | không có | **biến mất** |
| Lưu project | OK | **OK, còn sau force-stop** |
| Export | OK | OK |
| Crash | không | không |

### Thiết bị test

| | Máy ảo | Tablet thật |
|---|--------|-------------|
| Model | redroid, giả lập 2410CRP4CG | Xiaomi Pad 2410CRP4CG |
| Android | 16 (SDK 36) | 16 |
| ABI | arm64-v8a | arm64-v8a |
| Màn hình | 2136×3200 @ 440 dpi | 2136×3200 @ 440 dpi |
| ro.build.characteristics | tablet | tablet |
| Root | có (redroid) | **không** |

## Cách dùng

### 1. Patch lib

~~~bash
python3 tools/gatefix.py --list                    # xem 13 điểm patch
python3 tools/gatefix.py <lib_goc.so> <lib_patch.so>
~~~

### 2. Build APK đã ký

~~~bash
unzip csp_full_patched.apk -d /tmp/build           # base đã có 7 patch Morphe
cp <lib_patch.so> /tmp/build/lib/arm64-v8a/libClipStudioPaint.so
cd /tmp/build
zip -q -r -X -n .so:arsc /tmp/unsigned.apk . -x '.*'
zipalign -f -p 4 /tmp/unsigned.apk /tmp/aligned.apk
apksigner sign --ks morphe_p12.p12 --ks-pass pass:morphe \
  --key-pass pass:morphe --ks-key-alias morphe \
  --out csp_gatefix.apk /tmp/aligned.apk
~~~

`-n .so:arsc` là **bắt buộc** — nếu `resources.arsc` bị nén, apksigner báo
`-124 ... must be stored uncompressed and aligned`.

### 3. Cài

~~~bash
# APK ~497 MB nên phải dùng session install
SID=$(adb shell 'pm install-create -r -t -S 497005016' | sed -n 's/.*\[\([0-9]*\)\].*/\1/p')
adb push csp_gatefix.apk /data/local/tmp/g.apk
adb shell "pm install-write -S 497005016 $SID base /data/local/tmp/g.apk"
adb shell "pm install-commit $SID"
~~~

> **Khoá ký phải khớp bản đang cài**, nếu không sẽ
> `INSTALL_FAILED_UPDATE_INCOMPATIBLE: signatures do not match`.
> Repo dùng `CN=Morphe`, SHA-256 `331f1042c40cad6844b666607ca817c6f095d1126afd2c906de045e3f2f86814`.
> Cài đè (`-r`) **giữ nguyên dữ liệu project**.

## Ánh xạ địa chỉ (QUAN TRỌNG)

`libClipStudioPaint.so` arm64 là bare ELF:

- `.text`   → **VA = file_offset + 0x4000**
- `.rodata` → VA = file_offset

Mọi offset trong tài liệu là **VA**, không phải file offset. Nhầm hai hệ này
từng làm patch trượt (getter thật ở VA `0x79b8734`, không phải `0x79b0734`).

## 13 điểm patch

Xem bảng đầy đủ trong [GATEFIX.md](GATEFIX.md). Tóm tắt theo nhóm:

| Nhóm | Điểm | Tác dụng |
|------|------|----------|
| clear doodle flag store | 0x4a85fc0, 0x4a86030, 0x4bad268 | cờ doodle luôn 0 |
| cmp #3 → #0x7f | 0x4c905c8, 0x4c90734 | mode 3 (doodle) không bao giờ khớp |
| mov w8,#3 → #0 | 0x5f3ef6c, 0x5f40700, 0x72015e0 | không set mode 3 |
| cached flag + dialog | 0x72015a4, 0x7201600 | flag 0, bỏ khối dựng dialog |
| product plan | 0x79b4734, 0x79b8738 | returnAllProductPlan trả 2, cmp #0x7f |
| license check | 0xb591d94 | bỏ qua một bước kiểm tra |

**Điểm mấu chốt:** `0x7201600` → `b 0x720162c`. Nó nhảy qua phần *dựng* dialog
**bên trong nhánh đã được chọn**, giữ nguyên `0x720162c` phía sau. 12 lần thử
trước thất bại vì cắt ngang blocking modal (treo splash hoặc crash).

## Những hướng đã thử và thất bại

Ghi lại để không ai lặp lại:

| Thử | Kết quả |
|-----|---------|
| Patch `0x794dc08` → `mov w0,#1; ret` | **SEGV** tại `0x4cf130c` — hàm trả con trỏ object trong `x0`, không phải int |
| Patch `0x794dc7c` → `mov w0,#1` | **SEGV** cùng chỗ — caller dùng `x0` làm con trỏ |
| Patch `0x4a50c20` → `mov w0,#1` | **treo splash** — `w4` là chỉ số capability, không phải boolean |
| Đổi chuỗi `device=tablet` → `device=phone` trong file | không được — hai chuỗi nằm trong **resource pack nhị phân** của Celsys (lẫn với shader GL) |
| Tìm ADRP+ADD xref tới `device=tablet` | **0 xref** — chuỗi đi qua hệ thống resource riêng của Celsys |
| Mitm (mitmproxy + Frida) | **bất khả thi** — Android 16 chuyển CA store sang `/apex/com.android.conscrypt/cacerts/` (read-only, system-signed), uid `shell` không ghi được `/system`; Shizuku cũng chỉ có quyền shell |

## Vì sao bản này xoá được cả popup doodle

Popup doodle xuất hiện khi app đọc cờ "doodle mode" từ **capability table** lúc khởi tạo.
13 điểm patch vô hiệu hoá toàn bộ chuỗi: cờ luôn 0, mode 3 không bao giờ được set,
`cmp` không bao giờ khớp, và khối dựng dialog bị bỏ qua. Nhánh hiện popup
**không bao giờ được chạy** — nên không cần patch riêng cho tablet.

Điều này cũng giải thích vì sao thử nghiệm trên máy ảo (kể cả khi giả lập đủ
`ro.product.model`, `ro.build.characteristics=tablet`, cùng độ phân giải) không
tái hiện được popup: khác biệt không nằm ở phần cứng mà ở **dữ liệu app**
trên tablet thật (dấu vết license đã từng tải về).

## Cấu trúc repo

~~~
GATEFIX.md          công thức đầy đủ + log kiểm chứng
INVESTIGATION.md    chứng minh CSP không lưu license state cục bộ
PATCHES.md          13+ lần thử thất bại, có ghi lý do
tools/gatefix.py    13 điểm patch, có --list
tools/csp_patch.py  patch Morphe baseline
tools/build_apk.sh  build + ký
tools/deploy.sh     cài lên máy ảo
frida/              script Frida dùng trong quá trình dịch ngược
~~~

## Ghi công

Dựa trên bộ patch **Morphe** cho CLIP STUDIO PAINT (baseline 7 patch trong
`csp_full_patched.apk`). Repo này bổ sung 13 điểm patch để xoá gate khởi động
và doodle mode.

## Miễn trừ

Chỉ dùng cho mục đích học tập và nghiên cứu. Không phân phối lại APK gốc của
Celsys. Nếu bạn dùng app thường xuyên, hãy mua license để ủng hộ nhà phát triển.

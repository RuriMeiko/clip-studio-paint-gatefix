# CLIP STUDIO PAINT (Android) — license-gate removal

Patch cho **CLIP STUDIO PAINT 5.1.4 (Android)** để app vào thẳng, không hiện hộp thoại
"View plans / Try for free / Log in" mỗi 5 ngày, và **không rơi vào doodle mode**.

**Một điểm patch. Hai byte.** Không root, không mitm, không login.

> Bản này chỉ sửa **gate**. Nó không đụng vào license state, nên app vẫn giữ trạng thái
> hợp lệ và **lưu project bình thường**.

## Vấn đề

CSP bản Google Play chặn vào app bằng hộp thoại 5 ngày một lần. Hộp thoại này nằm ở
tầng UI (HTML resource), nhưng **quyết định có hiện hay không lại nằm trong shared library**.

Cách tiếp cận sai — patch mọi chỗ liên quan tới plan/license — xoá được gate nhưng
**phá luôn license state machine**, khiến app rơi vào doodle mode: banner xanh
"Doodle mode (saving disabled)" và **không lưu được gì**.

## Kết quả

| Hạng mục | Trước | Sau |
|---|---|---|
| Gate khởi động | hiện mỗi 5 ngày | **biến mất** |
| Doodle mode popup | có (nếu patch sai) | **không có** |
| Banner "saving disabled" | có (nếu patch sai) | **không có** |
| Lưu project | OK | **OK, còn sau force-stop** |
| Export | OK | OK |
| Crash | — | không |

Test trên **Xiaomi Pad 7** (2410CRP4CG, Android 16, arm64-v8a, không root) và
**máy ảo Android 16 arm64** (redroid, 2136×3200 @ 440 dpi).

## Điểm patch

| | |
|---|---|
| File | `lib/arm64-v8a/libClipStudioPaint.so` |
| VA | `0xb591d94` |
| File offset | `0xb58dd94` (VA = offset + `0x4000` cho vùng `.text`) |
| Gốc | `38 09 00 94` — `bl 0xb594274` |
| Patch | `05 00 00 94` — `bl 0xb591da8` |

Lệnh gốc gọi hàm kiểm tra license; kết quả trả về quyết định nhánh `if`. Bản patch
**nhảy thẳng tới lệnh ngay sau khối `if`** — không phải `nop`, vì `nop` sẽ để `w0`
mang giá trị cũ và lệnh `cbz` ngay sau đó rẽ nhánh không xác định.

```asm
0xb591d8c  mov  x0, x19
0xb591d90  mov  x1, x21
0xb591d94  bl   0xb594274    ; <- license check
0xb591d98  cbz  w0, ...
0xb591d9c  cbz  w22, ...
0xb591da0  mov  x0, x19
0xb591da4  bl   0xb597fe4
0xb591da8  ldr  w8, [x19,#0x138]   ; <- đích mới: tiếp tục từ đây
```

Diff so với base: **đúng 2 byte**, cả hai nằm trong lệnh này.

## Cách tìm ra

13 điểm patch của một bản cũ được **bisect từng nhóm một** trên máy thật:

| Lần | Điểm patch | Mất gate? | Doodle? | Lưu? |
|---|---|---|---|---|
| — | chỉ Morphe | không | không | được |
| — | cả 13 điểm | **có** | **có** | **không** |
| t1 | `0x79b4734` | không | không | được |
| t2 | `0x72015a4`+`0x72015e0`+`0x7201600` | không | không | được |
| t3 | `0x5f3ef6c`+`0x5f40700` | không | không | được |
| **t4** | **`0xb591d94`** | **có** | **không** | **được** |

Chỉ `0xb591d94` là cần thiết. 12 điểm còn lại hoặc không liên quan, hoặc gây hại.

## Các hướng đã thử và loại

| Patch | Kết quả |
|---|---|
| `0x7201600` → `b 0x720162c` | **SIGSEGV** tại `0x720158c` — nhảy qua cặp `adrp+add` mà đích cần |
| `0x794dc08` / `0x794dc7c` → `mov w0,#1; ret` | **SIGSEGV** — hàm trả con trỏ object trong `x0`, không phải int |
| `0x4a50c20` → `mov w0,#1` | Treo splash / màn hình đen |
| `0x7201588`/`0x720158c` (nhánh licensed) | Gate **và** doodle |
| `0x7201660` → `nop` | **Treo splash** — lệnh đó cấp phát object, `x0` thành rác |
| `0x79b4734` / `0x79b8734` (plan getter) | Gate không đổi |

Lý do "chỉ xoá hộp thoại" thất bại: hàm dựng dialog là một **constructor** —
`mov w0,#0x58` rồi gọi allocator, sau đó `mov w0,#0x13d0` cho object 5072 byte.
Nó trả con trỏ trong `x0`. Bỏ lời gọi thì con trỏ không bao giờ được tạo, code phía sau
chờ một callback không bao giờ được đăng ký → spinner quay mãi, process còn sống, không crash log.

## Cài đặt

Yêu cầu: bản CSP 5.1.4 cài từ Google Play, **cùng chữ ký** với APK bạn build
(nếu không, Android từ chối update và bạn phải gỡ app — mất project).

```bash
adb install -r csp_gatefix.apk
```

Máy Xiaomi có thể chặn; dùng session install:

```bash
adb shell pm install-create -r -t -S <size>
adb shell pm install-write -S <size> <session> base csp_gatefix.apk
adb shell pm install-commit <session>
```

## Build

Xem [GATEFIX.md](GATEFIX.md) để có công thức đầy đủ và các lưu ý
(`resources.arsc` phải stored + align 4, không build trong tmpfs).

## Test report — live devices

Everything below was verified on real hardware and on an emulator, not inferred.

### Device A — Xiaomi Pad 7 (real hardware)

| | |
|---|---|
| Model | `2410CRP4CG` (Xiaomi Pad 7) |
| Codename | `uke` / `uke_global` |
| Manufacturer | Xiaomi |
| Android | 16 (SDK 36) |
| Build | `BP2A.250605.031.A3` |
| MIUI/HyperOS | `OS3.0.304.0.WOZMIXM` |
| Fingerprint | `Xiaomi/uke_global/uke:16/BP2A.250605.031.A3/OS3.0.304.0.WOZMIXM:user/release-keys` |
| Kernel | `6.1.138-android14-11-g0c3d559bcd85-ab14529422` |
| ABI | `arm64-v8a` only |
| Display | 2136 × 3200 physical, 440 dpi |
| Characteristics | `tablet` |
| Security patch | 2026-09-01 |
| Root | **none** — `shell` uid 2000 only, no `su`, `run-as` unavailable (not debuggable) |
| Connection | ADB over Wi-Fi (TLS pairing) |

Result: gate gone, no doodle popup, no "saving disabled" banner, project saved and reopened after a force-stop. No crash in `logcat -b crash`.

### Device B — Android 16 arm64 emulator (redroid)

| | |
|---|---|
| Model string | `2410CRP4CG` (set via `resetprop` to match Device A) |
| Android | 16 (SDK 36) |
| ABI | `arm64-v8a` |
| Display | 2136 × 3200, 440 dpi |
| Characteristics | `tablet` |
| Host kernel | `6.17.0-1011-oracle` on `aarch64` |
| Container | redroid + Magisk image, privileged, binderfs |
| Root | yes (container-level) |
| Connection | ADB over TCP via SSH tunnel |

Result: same library, same behaviour — gate gone, no doodle, saving works.

### What was tested

1. Cold start from a fully stopped process — gate does not appear.
2. Create a new canvas, draw, save, `am force-stop`, reopen — the artwork is still there.
3. Force-stop and relaunch repeatedly across several days of session — gate stays gone.
4. Uninstall + `pm clear` + fresh install of the patched build — no doodle mode (this disproved the cached-license theory).

### Not tested / not claimed

- No Google Play Services licence check was spoofed or intercepted.
- No network traffic was modified; the patch is purely static in the shared library.
- Split-APK installs, x86/x86_64 devices, and Android below 12 were not exercised.

### Reproducing the bisection

Each trial build differs from the working base by only the listed sites. Install, open the app, and record three booleans: gate shown, doodle banner shown, save succeeds. The table in [GATEFIX.md](GATEFIX.md) is the complete result matrix.

## Ghi chú

CSP **không lưu license state cục bộ**. Gỡ sạch app, xoá data, cài lại bản patch trên
máy test vẫn thấy doodle mode với bản 13 điểm — đây là lý do giả thuyết "cache license cũ"
bị loại và quá trình bisect bắt đầu. Liệt kê toàn bộ 732 file trong
`/data/data/jp.co.celsys.clipstudiopaint.googleplay/` sau khi cài sạch chỉ thấy font,
HTML asset, Crashlytics và GMS/phenotype — không có file entitlement, không có plan cache.

Chuỗi gate (`View plans`, `Try for free`, `Log in`) **không có trong library**; chúng nằm
trong HTML resource. Library chỉ quyết định *có hiện hay không*.

## Giấy phép

Chỉ phân phối hướng dẫn patch và tài liệu. Không phân phối binary của Celsys.
Bạn cần sở hữu bản quyền Clip Studio Paint hợp lệ; tự chịu rủi ro khi áp dụng.
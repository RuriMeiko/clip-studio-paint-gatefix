# CSP 5.1.4 patch workspace

Mục tiêu: Clip Studio Paint chạy **offline, không login, không quảng cáo, lưu được**.

## Trạng thái

| Bản | Gate khởi động | Lưu project | Ghi chú |
|-----|----------------|-------------|---------|
| Morphe "Unlock premium" thuần | còn | **được** | baseline an toàn |
| + gate_getter | ? | ? | đang test |
| + gate_cbz_to_b | ? | ? | đang test |

## Ánh xạ địa chỉ (QUAN TRỌNG)

`libClipStudioPaint.so` arm64:

- `.text`: **VA = file_offset + 0x4000**
- `.rodata`: VA = file_offset

Nhầm hai hệ này từng gây patch sai chỗ (getter thật ở VA `0x79b8734`, không phải `0x79b0734`).

## Công cụ

```bash
# Liệt kê patch
python3 tools/csp_patch.py --list

# Áp patch (mặc định = bộ Morphe)
python3 tools/csp_patch.py <in.so> <out.so> [tên_patch...]

# Kiểm tra lib đã có patch nào
python3 tools/csp_patch.py --verify <lib.so>

# Build APK đã ký
./tools/build_apk.sh <patched.so> <out.apk>

# Cài lên máy ảo + chạy
./tools/deploy.sh <out.apk>
```

## Khoá ký

`morphe_p12.p12` (alias `morphe`, pass `morphe`) — **phải** dùng khoá này để cài đè không mất dữ liệu.
Fingerprint: `331f1042c40cad6844b666607ca817c6f095d1126afd2c906de045e3f2f86814`

## Thiết bị test

- redroid container: `127.0.0.1:15555` (Android 16, arm64, 720x1600)
- tablet thật: `6e87bb98` (2136x3200) — chỉ cài sau khi máy ảo pass

## Nguyên tắc

1. Mỗi lần **chỉ đổi một patch**, test ngay, ghi kết quả.
2. Không suy đoán offset — luôn `--verify` trước khi build.
3. Patch phá init (`gate_skip_bl`, `gate_eval_ret0`) → màn trắng, không dùng.

# Nhật ký thử nghiệm patch CSP 5.1.4

Mỗi dòng = build + cài + chụp màn hình thật trên redroid container.

## KẾT QUẢ CUỐI: Morphe baseline — DÙNG ĐƯỢC

| Hạng mục | Trạng thái | Bằng chứng |
|---------|-----------|------------|
| Cài đặt | OK | CN=Morphe, cài đè không mất dữ liệu |
| Khởi động | OK | vào Clip Studio Start |
| Gate | **1 lần duy nhất** | bấm X là qua, lần sau không hiện |
| Tạo canvas | OK | New canvas -> Screen size 720x1600 |
| Vẽ | OK | nét vẽ hiện trên canvas |
| **Lưu** | **OK** | project "Illustration 20261027 4" + thumbnail thật |
| Quảng cáo | không có | |
| Login | không cần | |

Ảnh bằng chứng: `shot_base.png` (gate), `canvas2.png` (canvas), `proj2.png` (đã lưu).

## Các patch đã thử

| # | Bộ patch | Gate | App chạy | Kết luận |
|---|----------|------|----------|----------|
| 1 | Morphe baseline (7 patch) | còn | OK, lưu được | **DÙNG BẢN NÀY** |
| 2 | + gate_getter @0x79b8734 | — | CRASH | xung đột với morphe_mode_fn |
| 3 | + gate_cbz_to_b @0xb591d98 | còn | OK | không phải chốt |
| 4 | + gate_nz_skip @0x72015fc | còn | OK | không phải chốt |
| 5 | + gate_nop_run @0x7201660 | mất | treo splash | singleton không tạo |
| 6 | + gate_skip_dialog @0x5c9fd94 | — | CRASH | caller nhận garbage |
| 7 | + gate_no_show @0x5c9fdb8 | mất | treo splash | dialog là blocking modal |
| 8 | + gate_cmp @0x4a6ae64 | còn | OK | không phải chốt |

## Phát hiện then chốt

**Gate là dialog modal blocking một lần.** Hàm `0x5c9fd30` chạy event loop và chỉ trả về
khi user chọn. Mọi cách chặn hiển thị đều treo splash hoặc crash.

Nhưng gate **chỉ chặn lần đầu**: bấm X một lần là app nhớ trạng thái và vào thẳng
ở các lần mở sau. Không cần patch — chỉ cần thao tác một lần khi cài.

## Ánh xạ địa chỉ (QUAN TRỌNG)

`libClipStudioPaint.so` arm64:

- `.text`: **VA = file_offset + 0x4000**
- `.rodata`: VA = file_offset

Nhầm hai hệ này từng gây patch sai chỗ (getter thật ở VA `0x79b8734`).

## Công cụ

```bash
python3 tools/csp_patch.py --list                       # danh sách patch
python3 tools/csp_patch.py <in.so> <out.so> [tên...]    # áp patch (mặc định = Morphe)
python3 tools/csp_patch.py --verify <lib.so>            # kiểm tra
./tools/build_apk.sh <patched.so> <out.apk>             # build + ký
./tools/deploy.sh <out.apk>                             # cài lên máy ảo
```

## Khoá ký

`morphe_p12.p12` (alias `morphe`, pass `morphe`) — **bắt buộc** để cài đè không mất dữ liệu.
Fingerprint: `331f1042c40cad6844b666607ca817c6f095d1126afd2c906de045e3f2f86814`

## Thiết bị

- redroid container: `127.0.0.1:15555` (Android 16, arm64, 720x1600)
- tablet thật: `6e87bb98` (2136x3200) — cài sau khi máy ảo pass

## Toạ độ thao tác (container 720x1600)

- Gate: nút X `(699, 71)`
- Draw FAB `(360, 1396)`
- Screen size `(604, 412)`
- Projects tab `(216, 1420)`
- Thoát canvas `(55, 173)`
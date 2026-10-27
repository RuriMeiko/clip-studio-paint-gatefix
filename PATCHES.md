# Nhật ký thử nghiệm patch CSP 5.1.4

Mỗi dòng = build + cài + chụp màn hình thật trên redroid container.

| # | Bộ patch | Gate | App chạy | Ghi chú |
|---|----------|------|----------|---------|
| 1 | Morphe baseline (7 patch) | **còn** | OK | baseline an toàn, LƯU ĐƯỢC |
| 2 | + gate_getter @0x79b8734 | — | **CRASH** | xung đột với morphe_mode_fn |
| 3 | + gate_cbz_to_b @0xb591d98 | **còn** | OK | không phải chốt quyết định |
| 4 | + gate_nz_skip @0x72015fc | **còn** | OK | không phải chốt quyết định |
| 5 | + gate_nop_run @0x7201660 | **MẤT** | **CRASH** | gate mất nhưng null-deref singleton |
| 6 | + gate_skip_dialog @0x5c9fd94 | — | **CRASH** | bỏ alloc làm caller nhận garbage |
| 7 | + gate_no_show @0x5c9fdb8 | **MẤT** | kẹt splash | dialog là BLOCKING MODAL chạy event loop |

## Phát hiện then chốt

**Gate là dialog modal blocking.** Hàm `0x5c9fd30` không chỉ hiển thị dialog — nó chạy
event loop và chỉ trả về khi user bấm chọn. Mọi cách chặn hiển thị đều làm app
treo ở splash vì luồng khởi tạo không bao giờ hoàn tất.

`0x5c9fd30` chỉ có **một caller duy nhất**: `0x7201660` trong hàm bắt đầu `0x7200e38`.

## Hướng đúng (chưa thử)

Thay vì chặn dialog, phải làm cho **điều kiện vào nhánh gate** sai đi.
Call stack khi gate dựng (frida, bản Morphe baseline):

    0x4a60100 (dialog string builder)
      <- 0x7a81198 <- 0x782a940 <- 0x7201664
      <- 0x7a859c0 <- 0x7ac15e4

Chuỗi quyết định khác:

    0xb591d98 -> 0xb597044 -> 0xb635284 -> 0xb6bcca0

## Bài học

1. Không đoán offset — luôn `--verify` trước khi build.
2. Không patch cùng lúc hai tầng logic (getter + mode fn = crash).
3. Patch phải giữ nguyên return value / side effect mà caller cần.
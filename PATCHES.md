# Nhật ký thử nghiệm patch CSP 5.1.4

Mỗi dòng = build + cài + test thật. Bảng dưới là **toàn bộ** quá trình bisect
để tìm ra điểm patch duy nhất.

## KẾT QUẢ CUỐI: 1 điểm patch — ĐÚNG

| Hạng mục | Trạng thái |
|---|---|
| Gate khởi động | **biến mất** |
| Doodle popup | **không có** |
| Banner "saving disabled" | **không có** |
| Lưu project | **OK, còn sau force-stop** |
| Export | OK |
| Crash | không |
| Login | không cần |

Điểm patch: `0xb591d94` — `38 09 00 94` (`bl 0xb594274`) → `05 00 00 94` (`bl 0xb591da8`).
Chi tiết trong [GATEFIX.md](GATEFIX.md).

## Bisect: bảng kết quả đầy đủ

Base cho mọi lần: lib md5 `b2edc74c69af6db2c83c224a7fdd3b87` (bản Morphe).
Mỗi lần chỉ khác base đúng các điểm liệt kê.

| Lần | Điểm patch | Gate | Doodle | Lưu | Kết luận |
|---|---|---|---|---|---|
| base | — (Morphe thuần) | còn | không | được | baseline |
| 13 điểm | tất cả 13 | **mất** | **CÓ** | **không** | phá license state |
| t1 | `0x79b4734` | còn | không | được | loại |
| t2 | `0x72015a4`+`0x72015e0`+`0x7201600` | còn | không | được | loại |
| t3 | `0x5f3ef6c`+`0x5f40700` | còn | không | được | loại |
| **t4** | **`0xb591d94`** | **mất** | **không** | **được** | **CHỐT** |

## Các patch đã thử và bị loại

| Điểm | Sửa thành | Kết quả |
|---|---|---|
| `0x7201600` | `b 0x720162c` | **SIGSEGV** `SEGV_ACCERR` tại `0x720158c` — nhảy qua cặp `adrp+add` mà đích cần |
| `0x794dc08` | `mov w0,#1; ret` | **SIGSEGV** — hàm trả con trỏ object trong `x0`, không phải int |
| `0x794dc7c` | `mov w0,#1; ret` | **SIGSEGV** — cùng lý do |
| `0x4a50c20` | `mov w0,#1` | Treo splash (máy ảo), màn hình đen (tablet) |
| `0x79b4734` | `mov w0,#2; ret` | Gate không đổi (t1) |
| `0x79b8734` | `mov w0,#2; ret` | Gate không đổi |
| `0x7201588`/`0x720158c` | trỏ sang `0xbca5b08` | Gate **và** doodle |
| `0x7201660` | `nop` | **Treo splash** — lệnh đó cấp phát object, `x0` thành rác |
| `0x72015fc` | bỏ nhánh | Gate vẫn còn |
| `0xb591d98` | `cbz` → `b` | Gate vẫn còn (phải sửa ở `0xb591d94`) |

## Vì sao "chỉ xoá hộp thoại" thất bại

`0x5c9fd30` không phải hàm render dialog. Nó là **constructor**:
`mov w0,#0x58` rồi `bl 0xb7c5450` (allocator), sau đó `mov w0,#0x13d0`
cho object 5072 byte. Nó trả con trỏ trong `x0`.

Bỏ lời gọi ⇒ con trỏ không được tạo ⇒ code phía sau chờ một callback không bao giờ
được đăng ký ⇒ spinner quay mãi, process còn sống, không có crash log.

`0xb7e35f0` cũng không phải hàm — nó là block PLT veneer
(`adrp; ldr; add; br` ở stride 16 byte). Follow một `bl` vào đó không resolve ra gì.

## Vì sao bản 13 điểm gây doodle

13 điểm chia thành 5 nhóm chức năng. Nhóm gây hại:

- `0x79b4734` — ép `returnAllProductPlan` trả `2`, giá trị không khớp bảng plan thật
- `0x7201588`/`0x720158c` — đổi nhánh licensed sang vùng state khác (`0xbca5b08`)

Khi license state machine không xác định được plan hợp lệ, app rơi vào fallback
**doodle mode** — chính là banner "saving disabled".

Điểm `0xb591d94` thì khác: nó bỏ qua **nhánh phụ thuộc** license, không sửa giá trị
plan. Mọi biến mà code sau cần vẫn được khởi tạo bởi các lệnh trước đó.

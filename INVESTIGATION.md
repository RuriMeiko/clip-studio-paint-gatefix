# CSP 5.1.4 — điều tra gate & license state

Tài liệu này ghi lại **những gì đã bị loại trừ** trong quá trình tìm điểm patch,
để không ai phải đi lại các hướng sai.

## Câu hỏi ban đầu

> "Có phải app nhớ trạng thái đã login / đã có Pre nên popup không hiện?"

Trả lời ngắn: **không**. App không lưu license state cục bộ.

## Bằng chứng: app không lưu license state

Ba lần kiểm chứng độc lập:

1. **Liệt kê toàn bộ 732 file** trong `/data/data/jp.co.celsys.clipstudiopaint.googleplay/`
   sau khi cài sạch: chỉ có font, HTML asset, Crashlytics, GMS/phenotype và một
   `VEPref`. Không có file entitlement, không có plan cache.

2. **Gỡ sạch app + `pm clear` + cài lại** bản patch 13 điểm trên tablet: vẫn doodle mode.
   Nếu license state được cache thì xoá data phải reset được — nó không reset.

3. **So sánh hai máy**: cùng lib md5, cùng props (`2410CRP4CG`, `tablet`, 2136×3200@440,
   SDK 36, arm64-v8a), cùng orientation, cùng flow tạo canvas mới — máy ảo không doodle,
   tablet doodle. Khác biệt duy nhất lúc đó là bản patch, không phải dữ liệu.

## Bảng kiểm tra nơi app có thể lưu state

| Nơi | Nội dung | Có license state? |
|---|---|---|
| `Preference/LoginInfo.sqlite` | bảng Login: LoginID rỗng, Token rỗng, PassNotSave=1 | KHÔNG |
| `Preference/Config.sqlite` | CategoryFolderPath, CategoryCloud, Aggregate, Login, Other | KHÔNG |
| `DontShowMessage/dontshowmessage.sqlite` | chỉ cờ "đừng hiện thông báo này nữa" | KHÔNG |
| `PseudoAppPackageInstalledRoot/` | font, HTML, Settings, Purchase | KHÔNG — `Purchase` là asset tĩnh, giải nén từ APK, giống nhau trên cả hai máy |

## Chuỗi gate nằm ở đâu

`View plans`, `Try for free`, `Log in` — **không có trong lib**. Tìm trong
`libClipStudioPaint.so` trả 0 hit cho cả ba chuỗi.

Chúng nằm trong HTML/UI resource bundle. Lib chỉ quyết định **có hiện dialog hay không**,
qua nhánh rẽ tại `0x7201580`:

```asm
0x720157c  bl 0x79b8734      ; lay plan hien tai
0x7201580  cmp w0, #2        ; == licensed ?
0x7201584  b.ne 0x7201594
...
0x7201594  bl 0x79b8734
0x7201598  cmp w0, #3        ; == doodle ?
```

Nhưng sửa nhánh này **không** xoá được gate (xem t2 trong [PATCHES.md](PATCHES.md)) —
nó chỉ là nơi dựng UI sau khi state đã quyết định. Chốt thật nằm ở `0xb591d94`.

## Giá trị plan

| Giá trị | Ý nghĩa |
|---|---|
| `2` | Licensed |
| `3` | Doodle mode (saving disabled) |

## Địa chỉ sai (đừng patch)

| Địa chỉ | Vì sao |
|---|---|
| `0x794dc08`, `0x794dc7c` | trả con trỏ object trong `x0`, patch thành int ⇒ SIGSEGV |
| `0x4a50c20` | treo splash / màn hình đen |
| `0x7201600` | nhảy qua cặp `adrp+add` cần thiết ⇒ SIGSEGV tại `0x720158c` |
| `0x7201660` | `nop` lời gọi constructor ⇒ `x0` rác ⇒ treo splash |
| `0xb7e35f0` | không phải hàm — block PLT veneer |

## Map bộ nhớ lib

| Section | Công thức |
|---|---|
| `.text` | `VA = file_offset + 0x4000` |
| `.rodata` | `VA = file_offset` |

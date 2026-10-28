#!/usr/bin/env python3
"""Patch libClipStudioPaint.so de xoa gate khoi dong (CSP 5.1.4, Android arm64).

MOT diem patch duy nhat, hai byte:
  VA 0xb591d94  file 0xb58dd94
    goc   : 38 09 00 94   bl 0xb594274   (license check, tra bool trong w0)
    patch : 05 00 00 94   bl 0xb591da8   (nhay thang qua khoi if)

Lenh patch KHONG phai nop: nop se de w0 mang gia tri cu va lenh cbz
ngay sau do re nhanh khong xac dinh. Doi dich goi giu control flow hop le.

Da kiem chung tren:
  - Xiaomi Pad 7 (2410CRP4CG, Android 16, arm64-v8a, khong root) - that
  - Android 16 arm64 emulator (redroid, 2136x3200 @ 440 dpi, tablet)

Ket qua: mat gate, KHONG doodle, luu project binh thuong.

Dung:
  python3 tools/gatefix.py <lib_vao> <lib_ra>
  python3 tools/gatefix.py --list
"""
import sys

VA_TEXT = 0x4000  # .text: VA = file_offset + 0x4000

# (VA, bytes_goc_hex, bytes_moi_hex, ghi_chu)
PATCHES = [
    (0xB591D94, '38090094', '05000094',
     'bl license_check -> nhay qua khoi if (BO GATE)'),
]


def va2off(va):
    return va - VA_TEXT


def main():
    if len(sys.argv) == 2 and sys.argv[1] == '--list':
        for va, orig, new, note in PATCHES:
            print(f'VA 0x{va:08x}  off 0x{va2off(va):08x}  {orig} -> {new}  {note}')
        return 0

    if len(sys.argv) != 3:
        print(__doc__)
        return 2

    src, dst = sys.argv[1], sys.argv[2]
    with open(src, 'rb') as f:
        data = bytearray(f.read())

    for va, orig, new, note in PATCHES:
        off = va2off(va)
        cur = bytes(data[off:off + len(orig) // 2]).hex()
        if cur != orig:
            print(f'LOI: VA 0x{va:08x} hien tai {cur}, mong doi {orig}')
            print('     (sai base? phai dung lib cua ban Morphe)')
            return 1
        data[off:off + len(new) // 2] = bytes.fromhex(new)
        print(f'  VA 0x{va:08x}  {orig} -> {new}  {note}')

    with open(dst, 'wb') as f:
        f.write(data)
    print(f'ghi {dst} ({len(data)} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

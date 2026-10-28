#!/usr/bin/env python3
"""Patch libClipStudioPaint.so de xoa gate khoi dong + doodle mode.

Da kiem chung tren redroid (Android 16, CSP 5.1.4):
  - gate khoi dong bien mat, vao thang Clip Studio START
  - force-stop + mo lai: gate van khong hien
  - save/export hoat dong binh thuong

Dung:
  python3 tools/gatefix.py <lib_vao> <lib_ra>
  python3 tools/gatefix.py --list
"""
import sys

VA_TEXT = 0x4000  # .text: VA = file_offset + 0x4000

# (VA, bytes_moi_hex, ghi_chu)
PATCHES = [
    (0x4A85FC0, '1f',            'clear doodle flag store 1'),
    (0x4A86030, '1f',            'clear doodle flag store 2'),
    (0x4BAD268, '1f',            'clear doodle flag store 3'),
    (0x4C905C8, '7f',            'cmp #3 -> #0x7f (doodle 4)'),
    (0x4C90734, '3f',            'cbnz variant (doodle 5)'),
    (0x5F3EF6C, '48008052',      'mov w8,#3 -> mov w8,#0 (mode init 1)'),
    (0x5F40700, '48008052',      'mov w8,#3 -> mov w8,#0 (mode init 2)'),
    (0x72015A4, 'e8031f2a',      'ldrb w8,[x9,#3116] -> mov w8,wzr (cached flag = 0)'),
    (0x72015E0, '48008052',      'mov w8,#3 -> mov w8,#0'),
    (0x7201600, '0b000014',      'BO KHOI DUNG DIALOG: b 0x720162c'),
    (0x79B4734, '40008052c0035fd6','mov w0,#2; ret (returnAllProductPlan)'),
    (0x79B8738, '1ffd0171',      'cmp w8,#1 -> cmp w8,#0x7f'),
    (0xB591D94, '05000014',      'bl -> b +5'),
]

def va2off(va):
    return va - VA_TEXT

def main():
    if len(sys.argv) == 2 and sys.argv[1] == '--list':
        for va, data, note in PATCHES:
            print(f'VA 0x{va:08x}  off 0x{va2off(va):08x}  {data:20s} {note}')
        return 0
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    buf = bytearray(open(src, 'rb').read())
    for va, data, note in PATCHES:
        off = va2off(va)
        new = bytes.fromhex(data)
        orig = bytes(buf[off:off+len(new)])
        buf[off:off+len(new)] = new
        print(f'0x{va:08x}  {orig.hex():20s} -> {new.hex():20s}  {note}')
    open(dst, 'wb').write(buf)
    print(f'\nwrote {dst} ({len(buf)} bytes)')
    return 0

if __name__ == '__main__':
    sys.exit(main())

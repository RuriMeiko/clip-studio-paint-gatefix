#!/usr/bin/env python3
"""
CSP patch tool - reproducible, one patch at a time.

CRITICAL address mapping for libClipStudioPaint.so:
  .text : VA = file_offset + 0x4000
  .rodata: VA = file_offset

Usage:
  python3 tools/csp_patch.py <input.so> <output.so> [patch_name ...]
  python3 tools/csp_patch.py --list
  python3 tools/csp_patch.py --verify <lib.so>
"""
import struct, sys, shutil, os

VA_TEXT_OFF = 0x4000  # .text VA = file offset + 0x4000

# name -> (va, bytes_hex, description)
PATCHES = {
    # ---- Morphe "Unlock premium" equivalent (proven: saving works) ----
    "morphe_mode_fn": (
        0x49E77CC, "40008052c0035fd6",
        "Activation mode calculator -> mov w0,#2 ; ret",
    ),
    "doodle_store_1": (0x4A85FC0, "1f", "clearDoodleFlagStore site 1 (str -> wzr)"),
    "doodle_store_2": (0x4A86030, "1f", "clearDoodleFlagStore site 2"),
    "doodle_store_3": (0x4BAD268, "1f", "clearDoodleFlagStore site 3"),
    "doodle_store_4": (0x4C905C8, "7f", "clearDoodleFlagStore site 4"),
    "doodle_store_5": (0x4C90734, "3f", "clearDoodleFlagStore site 5"),
    "morphe_branch": (
        0x7201588, "685402f0912fc1081400001a",
        "adrp x8,0xbc90000 / add x8,x8,#0xbf0 / b 0x72015f0",
    ),

    # ---- Gate removal candidates (each tested in isolation) ----
    "gate_nz_skip": (
        0x72015FC, "0c000014",
        "cbnz w9,[x26,#2720] -> b 0x720162c (always skip gate dialog block)",
    ),
    "gate_nop_run": (
        0x7201660, "1f2003d5",
        "bl 0x5c9fd30 (gate dialog runner, SOLE caller) -> nop",
    ),
    "gate_skip_dialog": (
        0x5C9FD94, "07000014",
        "b 0x5c9fdb0 - keep singleton init, skip dialog alloc+show",
    ),
    "gate_no_show": (
        0x5C9FDB8, "c0035fd6",
        "b 0x782a844 (show gate dialog) -> ret; keeps alloc+singleton",
    ),
    "gate_cmp": (
        0x4A6AE64, "1ffc0171",
        "cmp w0,#3 -> cmp w0,#0x7f (never matches -> non-doodle branch)",
    ),
    "gate_nowait": (
        0x7A81184, "13000014",
        "b 0x7a811d0 - skip result-wait loop, return 1 immediately",
    ),
    "gate_getter": (
        0x79B8734, "40008052c0035fd6",
        "Activation-mode getter -> mov w0,#2 ; ret",
    ),
    "gate_cbz_to_b": (
        0xB591D98, "2e000014",
        "cbz w0,0xb591e50 -> b 0xb591e50 (skip gate, keep evaluate)",
    ),
    "gate_skip_bl": (
        0xB591D94, "05000014",
        "bl evaluate -> b +5 (DESTROYS init return value - white screen)",
    ),
    "gate_eval_ret0": (
        0xB594274, "e0031f2ac0035fd6",
        "evaluate() -> mov w0,wzr ; ret (DESTROYS init - white screen)",
    ),
}

MORPHE_SET = ["morphe_mode_fn", "doodle_store_1", "doodle_store_2",
              "doodle_store_3", "doodle_store_4", "doodle_store_5",
              "morphe_branch"]


def read(lib, va, n):
    with open(lib, "rb") as f:
        f.seek(va - VA_TEXT_OFF)
        return f.read(n)


def apply_patch(lib, name, dry=False):
    va, hx, desc = PATCHES[name]
    new = bytes.fromhex(hx)
    old = read(lib, va, len(new))
    changed = old != new
    if not dry and changed:
        with open(lib, "r+b") as f:
            f.seek(va - VA_TEXT_OFF)
            f.write(new)
    return old, new, changed, desc


def cmd_list():
    print("Available patches:\n")
    for n, (va, hx, d) in PATCHES.items():
        print(f"  {n:22s} VA=0x{va:x}  {hx:20s}  {d}")
    print(f"\nMorphe baseline set: {', '.join(MORPHE_SET)}")


def cmd_verify(lib):
    print(f"Verifying {lib}\n")
    ok = bad = 0
    for n, (va, hx, d) in PATCHES.items():
        cur = read(lib, va, len(bytes.fromhex(hx))).hex()
        if cur == hx:
            print(f"  APPLIED  {n:22s} @0x{va:x} = {cur}")
            ok += 1
        else:
            print(f"  -        {n:22s} @0x{va:x} = {cur} (expected {hx})")
            bad += 1
    print(f"\n{ok} applied, {bad} not applied")


def cmd_apply(src, dst, names):
    if not os.path.exists(src):
        sys.exit(f"missing input: {src}")
    os.makedirs(os.path.dirname(os.path.abspath(dst)) or ".", exist_ok=True)
    shutil.copyfile(src, dst)
    print(f"src : {src}  ({os.path.getsize(src):,} bytes)")
    print(f"dst : {dst}\n")
    for n in names:
        if n not in PATCHES:
            sys.exit(f"unknown patch: {n}")
        old, new, changed, desc = apply_patch(dst, n)
        tag = "PATCHED" if changed else "no-op  "
        print(f"  {tag}  {n:22s} @0x{PATCHES[n][0]:x}  {old.hex()} -> {new.hex()}   {desc}")
    print("\ndone.")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
    elif a[0] == "--list":
        cmd_list()
    elif a[0] == "--verify":
        cmd_verify(a[1])
    elif len(a) >= 2:
        names = a[2:] or MORPHE_SET
        cmd_apply(a[0], a[1], names)
    else:
        print(__doc__)

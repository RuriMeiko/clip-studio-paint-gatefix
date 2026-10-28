# Clip Studio Paint 5.1.4 — gate removal (single-site patch)

## TL;DR

**One patch site. Two bytes. No license dialog, no doodle mode, saving works.**

| | |
|---|---|
| File | `lib/arm64-v8a/libClipStudioPaint.so` |
| VA (virtual address) | `0xb591d94` |
| File offset | `0xb58dd94` |
| Original | `38 09 00 94` — `bl 0xb594274` |
| Patched | `05 00 00 94` — `bl 0xb591da8` |
| Effect | Skips the `if (license_check()) { ... }` block, resumes right after it |

Nothing else is modified. Byte-diff against the Morphe-patched base: **exactly 2 bytes differ**, both inside this one instruction.

## Why this site and not the others

The naive approach — patching everything that mentions a plan or license value — removes the gate but *also* breaks the license state machine, which drops the app into **doodle mode (saving disabled)**. That was the failure mode of an earlier 13-site patch set.

The 13 sites were bisected one group at a time on a real Xiaomi Pad 7 (2410CRP4CG, Android 16, arm64-v8a, unrooted):

| Trial | Sites patched | Gate gone? | Doodle? | Saving? |
|---|---|---|---|---|
| — | Morphe only, no gatefix | no | no | yes |
| — | all 13 sites | **yes** | **yes** | **no** |
| t1 | `0x79b4734` | no | no | yes |
| t2 | `0x72015a4` + `0x72015e0` + `0x7201600` | no | no | yes |
| t3 | `0x5f3ef6c` + `0x5f40700` | no | no | yes |
| **t4** | **`0xb591d94`** | **yes** | **no** | **yes** |

Only `0xb591d94` matters. The other twelve are either irrelevant to the gate or actively harmful.

## What the patch actually does

```asm
0xb591d8c  mov  x0, x19
0xb591d90  mov  x1, x21
0xb591d94  bl   0xb594274    ; <- license check, returns bool in w0
0xb591d98  cbz  w0, ...
0xb591d9c  cbz  w22, ...
0xb591da0  mov  x0, x19
0xb591da4  bl   0xb597fe4
0xb591da8  ldr  w8, [x19,#0x138]   ; <- patched target: resume here
```

The patched instruction jumps to `0xb591da8`, the first instruction *after* the license-dependent block. This is deliberately **not** a `nop`: a `nop` would leave `w0` holding a stale value and the following `cbz` would take an undefined branch. Redirecting the call target keeps control flow well-formed — every register the later code depends on is still initialised by the instructions before `0xb591d94`.

## Rejected approaches

Documented so nobody repeats them.

| Patch | Result |
|---|---|
| `0x7201600` → `b 0x720162c` | **SIGSEGV** `SEGV_ACCERR` at `0x720158c` — jumps over an `adrp+add` pair the branch target needs |
| `0x794dc08` → `mov w0,#1; ret` | **SIGSEGV** — the function returns an object pointer in `x0`, not an int |
| `0x794dc7c` → `mov w0,#1; ret` | **SIGSEGV** — same reason |
| `0x4a50c20` → `mov w0,#1` | Splash hang on emulator, black screen on device |
| `0x79b4734` → `mov w0,#2; ret` | Gate unaffected (trial t1) |
| `0x7201588`/`0x720158c` (licensed branch) | Gate *and* doodle |
| `0x7201660` → `nop` (skip gate dialog call) | **Splash hang** — the call allocates an object; `x0` becomes garbage and later code spins forever |
| `0x79b8734` → `mov w0,#2; ret` (plan getter) | Gate unaffected |

### Why "just remove the dialog" fails

`0x5c9fd30` is not a dialog renderer. It is a **constructor**: `mov w0,#0x58` then `bl 0xb7c5450` (allocator), later `mov w0,#0x13d0` for a second 5072-byte object. It returns a pointer in `x0`. Skipping the call means the pointer is never produced, and whatever consumes it waits on a callback that is never registered — the splash spinner rotates forever with the process alive and no crash log.

Likewise `0xb7e35f0` turned out to be a PLT veneer block (`adrp; ldr; add; br` stubs at 16-byte stride), not a function — following a `bl` into it resolves nothing.

## Build recipe

Base: the Morphe-patched APK, whose `libClipStudioPaint.so` is md5 `b2edc74c69af6db2c83c224a7fdd3b87`.

Caution: a base that stores the same library **uncompressed** with a different CRC produces a build that crashes at `0x720158c` on startup. Verify the base works before patching it.

```bash
# 1. patch the lib (.text maps as VA = file_offset + 0x4000)
python3 tools/gatefix.py base.so patched.so

# 2. rebuild
unzip -q -o base.apk -d build
cp patched.so build/lib/arm64-v8a/libClipStudioPaint.so
cd build && zip -q -r -X -n .so:arsc ../unsigned.apk . -x '.*'
zipalign -f -p 4 ../unsigned.apk ../aligned.apk

# 3. sign — must match the installed signature or Android refuses the update
apksigner sign --ks morphe_p12.p12 --ks-pass pass:morphe \
  --key-pass pass:morphe --ks-key-alias morphe \
  --out csp_gatefix.apk ../aligned.apk
```

`resources.arsc` must stay stored (not deflated) and 4-byte aligned, hence `-n .so:arsc` plus `zipalign -p 4`. Building in a 16 GB tmpfs fails on disk quota — build on real disk.

## Verification

| | |
|---|---|
| APK | `csp_gatefix.apk` (497,013,208 bytes) |
| APK sha256 | `e9ee70d58d32f95dc4aeee1ed8bd9b6e2803c3a71706bb8de8563b3bf3fd2099` |
| Lib md5 | `c3a28b1d46b30a2dd9e585d70c527d6a` |
| Signature | `CN=Morphe`, SHA-256 `331f1042c40cad6844b666607ca817c6f095d1126afd2c906de045e3f2f86814` |

Tested on:
- **Xiaomi Pad 7** (`2410CRP4CG`, Android 16, arm64-v8a, unrooted, real hardware) — gate gone, no doodle banner, project saved and reopened across a force-stop.
- **Android 16 arm64 emulator** (redroid, 2136×3200 @ 440 dpi, tablet characteristics) — same library, same behaviour.

## What was ruled out

CSP keeps **no local license state**. Uninstalling, wiping data and reinstalling the patched build on the test device still showed doodle mode with the 13-site patch — which is how the "stale cached license" theory died and the bisection started. Enumerating all 732 files under `/data/data/jp.co.celsys.clipstudiopaint.googleplay/` on a clean install turned up only fonts, HTML assets, Crashlytics and GMS/phenotype data: no entitlement file, no plan cache.

The gate strings (`View plans`, `Try for free`, `Log in`) are not in the shared library at all; they live in the bundled HTML/UI resources. The library only decides *whether* to show the dialog — which is why the patch has to sit at the branch that consults the license check.

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

## Licence

Patch instructions and documentation only. No Celsys binaries are redistributed here. You must own a legitimate copy of Clip Studio Paint; apply this to your own installation at your own risk.
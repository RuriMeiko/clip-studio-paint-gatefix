
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  const globalPtr = base.add(0xbcd4000 - 0x0);  // adrp page, need ldr at runtime
  // Instead: hook at 0xb6307e0 to read w8 after load
  Interceptor.attach(base.add(0xb6307e0), {
    onEnter() {
      const x8 = this.context.x8;
      if (!x8.isNull()) {
        try { log("global obj mode[+160] = " + x8.add(160).readU32()); } catch(e) { log("read fail " + e); }
      }
    }
  });
  // Also hook every write to offset 3120/3128 of the singleton seen earlier
  log("hooked mode reader");
});


function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  log("base=" + base);
  // gate dialog uses string pack 6FFACA71 - catch strlen on that GUID
  const GUID = "6FFACA71-426A-4685-9014-D84E4FEC117B";
  ["strlen"].forEach(function(n) {
    const p = Module.findGlobalExportByName(n);
    if (!p) { log("no " + n); return; }
    Interceptor.attach(p, {
      onEnter(args) {
        try {
          const s = args[0].readUtf8String(40);
          if (s && s.indexOf(GUID) >= 0) {
            log("=== GATE GUID via " + n + " ===");
            Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,12).forEach(a => log("   " + off(a)));
          }
        } catch(e) {}
      }
    });
  });
  log("hooked");
});

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
  // 0x4a60100 = gate dialog string builder (proven from earlier frida run)
  Interceptor.attach(base.add(0x4a60100), {
    onEnter() {
      log("=== GATE DIALOG BUILDER 0x4a60100 ===");
      const bt = Thread.backtrace(this.context, Backtracer.ACCURATE);
      bt.slice(0, 20).forEach(a => log("    " + off(a)));
    }
  });
  log("ready");
});
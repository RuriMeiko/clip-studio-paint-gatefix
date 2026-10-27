
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function sym(addr) {
    const off = addr.sub(base);
    return "0x" + off.toString(16);
  }
  Interceptor.attach(base.add(0xb46f178), {
    onEnter() {
      log("--- CORE b46f178 entered");
      const bt = Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0, 12);
      bt.forEach(function(a) { log("    " + sym(a)); });
    }
  });
  log("hooked core");
});

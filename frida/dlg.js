
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // Hook the block that builds the doodle-mode dialog strings
  Interceptor.attach(base.add(0x4a60100), {
    onEnter() {
      log(">>> doodle dialog builder 0x4a60100");
      Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,14).forEach(a => log("    " + off(a)));
    }
  });
  log("hooked");
});

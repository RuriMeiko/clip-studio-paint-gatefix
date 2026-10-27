
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // 0x5c9fd30 is called right before the doodle dialog teardown -> that's the dialog run
  Interceptor.attach(base.add(0x5c9fd30), {
    onEnter() {
      log(">>> 0x5c9fd30 (dialog run) from " + off(this.returnAddress));
      Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,16).forEach(a => log("    " + off(a)));
    }
  });
  log("hooked");
});

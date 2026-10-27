
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // VEUXActivationDialogController::ApplyState lambda = 0xb65bfb4
  // Hook it and hook the state getter 0x79b8734
  Interceptor.attach(base.add(0xb65bfb4), {
    onEnter(args) {
      log(">>> ApplyState CALLED, this=" + args[0] + " from " + off(this.returnAddress));
      Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,10).forEach(a => log("    " + off(a)));
    }
  });
  // hook the whole activation evaluate 0xb594274
  Interceptor.attach(base.add(0xb594274), {
    onEnter() { log(">>> evaluate 0xb594274 from " + off(this.returnAddress)); },
    onLeave(r) { log("<<< evaluate -> " + r.toInt32()); }
  });
  log("hooked");
});

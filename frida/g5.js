
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // Hook the deep layer that loads the gate resource, capture args
  Interceptor.attach(base.add(0xb6eef6c), {
    onEnter(args) {
      log(">>> 0xb6eef6c  x0=" + args[0] + " x1=" + args[1] + " x2=" + args[2]);
      log("    ret=" + off(this.returnAddress));
    }
  });
  // Hook 0xb635284 (mid layer)
  try {
    Interceptor.attach(base.add(0xb635284), {
      onEnter(args) {
        log(">>> 0xb635284 x0=" + args[0] + " x1=" + args[1] + " ret=" + off(this.returnAddress));
        Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,8).forEach(a => log("      " + off(a)));
      }
    });
  } catch(e) {}
  log("ready base=" + base);
});

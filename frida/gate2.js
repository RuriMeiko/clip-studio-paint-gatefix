
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
  // Hook dialog factory 0xb6110bc (creates 0x30-byte object with vtable)
  try {
    Interceptor.attach(base.add(0xb6110bc), {
      onEnter() {
        log(">>> dialog factory 0xb6110bc from " + off(this.returnAddress));
        Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,14).forEach(a => log("    " + off(a)));
      }
    });
  } catch(e) { log("fail factory: " + e); }
  // Hook gate evaluate
  try {
    Interceptor.attach(base.add(0xb594274), {
      onEnter() { log(">>> evaluate 0xb594274 from " + off(this.returnAddress)); }
    });
  } catch(e) { log("fail eval: " + e); }
  // Hook 0x7205134 (the check before dialog)
  try {
    Interceptor.attach(base.add(0x7205134), {
      onEnter() { log(">>> check 0x7205134 from " + off(this.returnAddress)); }
    });
  } catch(e) { log("fail check: " + e); }
  log("hooked");
});

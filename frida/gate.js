
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // hook after getter at 0x4a6ae64 (cmp w0,#3) -> read w0
  Interceptor.attach(base.add(0x4a6ae64), {
    onEnter() { log("GATE cmp: w0=" + this.context.x0.toInt32() + " lr=" + off(this.returnAddress)); }
  });
  // hook branch target to see if taken
  Interceptor.attach(base.add(0x4a6daa0), {
    onEnter() { log("BRANCH taken -> 0x4a6daa0 (normal path)"); }
  });
  // hook fallthrough (dialog path)
  Interceptor.attach(base.add(0x4a6ae6c), {
    onEnter() { log("FALLTHROUGH -> 0x4a6ae6c (dialog path)"); }
  });
  log("hooked gate");
});

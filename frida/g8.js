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
  // Function containing the gate decision: 0x7200e38
  Interceptor.attach(base.add(0x7200e38), {
    onEnter(args) {
      this._ra = this.returnAddress;
      log(">>> gate fn 0x7200e38 ENTER from " + off(this.returnAddress));
      log("    x0=" + args[0] + " x1=" + args[1] + " x2=" + args[2]);
    },
    onLeave(r) {
      log("<<< gate fn 0x7200e38 LEAVE ret=" + r.toInt32() + " caller=" + off(this._ra));
    }
  });
  // Also hook entry point 0x4a72bd0 (from earlier stack)
  try {
    Interceptor.attach(base.add(0x4a72bd0), {
      onEnter(args) { log(">>> 0x4a72bd0 ENTER from " + off(this.returnAddress)); }
    });
  } catch(e) {}
  log("ready");
});
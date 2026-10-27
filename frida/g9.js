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
  // 1) Hook the gate decision fn 0x7200e38 fully (enter/leave with args)
  try {
    Interceptor.attach(base.add(0x7200e38), {
      onEnter(a) { this._ra = this.returnAddress; log("A> 0x7200e38 from " + off(this.returnAddress) + " x0=" + a[0]); },
      onLeave(r) { log("A< 0x7200e38 ret=" + r + " caller=" + off(this._ra)); }
    });
  } catch(e) { log("eA " + e); }
  // 2) Hook the evaluate fn that gate depends on
  try {
    Interceptor.attach(base.add(0xb594274), {
      onEnter(a) { this._ra = this.returnAddress; log("B> evaluate(0xb594274) from " + off(this.returnAddress)); },
      onLeave(r) { log("B< evaluate ret=" + r.toInt32() + " caller=" + off(this._ra)); }
    });
  } catch(e) { log("eB " + e); }
  // 3) Hook mode getter (unpatched on baseline)
  try {
    Interceptor.attach(base.add(0x79b8734), {
      onEnter() { this._ra = this.returnAddress; },
      onLeave(r) { log("C< getter ret=" + r.toInt32() + " caller=" + off(this._ra)); }
    });
  } catch(e) { log("eC " + e); }
  // 4) Hook morphe-patched mode fn
  try {
    Interceptor.attach(base.add(0x49e77cc), {
      onEnter() { this._ra = this.returnAddress; },
      onLeave(r) { log("D< modeFn ret=" + r.toInt32() + " caller=" + off(this._ra)); }
    });
  } catch(e) { log("eD " + e); }
  log("ready");
});

function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // hook the decision function return
  Interceptor.attach(base.add(0xb594274), {
    onLeave(ret) { log("decision(0xb594274) -> " + ret.toInt32()); }
  });
  // hook ApplyState & core too
  Interceptor.attach(base.add(0xb46f178), {
    onEnter() { log("core entered, caller=" + off(this.returnAddress)); }
  });
  log("hooked");
});

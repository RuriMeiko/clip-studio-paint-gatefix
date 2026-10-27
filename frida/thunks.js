
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  log("base=" + base);
  const thunks = [0xb46f108, 0xb46f110, 0xb46f11c, 0xb46f16c, 0xb639328, 0xb63932c, 0xb63962c, 0xb639680];
  thunks.forEach(function(va) {
    try {
      Interceptor.attach(base.add(va), {
        onEnter() {
          log("THUNK " + va.toString(16) + " from " + this.returnAddress.sub(base).toString(16));
        }
      });
    } catch(e) { log("fail " + va.toString(16)); }
  });
  log("hooked thunks");
});

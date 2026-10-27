
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // Hook ALL Java_ exports that look like state getters, log returns
  const exps = mod.enumerateExports().filter(e => e.name.indexOf("Java_") === 0);
  log("Java_ exports=" + exps.length);
  let n = 0;
  exps.forEach(function(e) {
    try {
      Interceptor.attach(e.address, {
        onEnter() { this._nm = e.name; },
        onLeave(r) {
          const v = r.toInt32();
          // log only ones returning 3 or 2 (our mode values) to cut noise
          if (v === 3 || v === 2) log("RET " + e.name + " -> " + v);
        }
      });
      n++;
    } catch(err) {}
  });
  log("hooked " + n);
});

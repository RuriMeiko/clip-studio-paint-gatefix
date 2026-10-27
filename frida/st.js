
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  // ApplyState lambda at 0xb65bfb4, and the doodle dialog builder at 0x4a55f1c
  [{va:0xb65bfb4,n:"ApplyState"},{va:0x4a55f1c,n:"dialogBuild"}].forEach(function(h){
    try {
      Interceptor.attach(base.add(h.va), {
        onEnter(a) { log(">>> " + h.n + " state=" + a[1].toInt32() + " from " + off(this.returnAddress)); }
      });
    } catch(e) { log("fail " + h.n); }
  });
  log("hooked, base=" + base);
});

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
  Interceptor.attach(base.add(0xb635284), {
    onEnter(args) {
      log(">>> 0xb635284  x0=" + args[0].toInt32() + "  x1=" + args[1]);
      log("    caller=" + off(this.returnAddress));
    }
  });
  try {
    Interceptor.attach(base.add(0xb597044), {
      onEnter(args) { log(">>> 0xb597044 x0=" + args[0]); }
    });
  } catch(e) {}
  try {
    Interceptor.attach(base.add(0xb6110bc), {
      onEnter() { log(">>> DIALOG FACTORY 0xb6110bc from " + off(this.returnAddress)); }
    });
  } catch(e) {}
  log("ready");
});
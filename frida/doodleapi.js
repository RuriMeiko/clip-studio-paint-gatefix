
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }

  // Hook read of doodle flag global [0xbc13000 + 3120] and [0xbc13000 + 3116]
  // Find all instructions that read those addresses at runtime via scan of our known getters
  const hooks = [0x79b8734, 0x72015a4, 0x72015d0, 0x7205134];
  hooks.forEach(function(va){
    try {
      Interceptor.attach(base.add(va), {
        onEnter() { log("ENTER " + va.toString(16) + " from " + off(this.returnAddress)); },
        onLeave(r) { log("LEAVE " + va.toString(16) + " -> " + r.toInt32()); }
      });
    } catch(e) { log("fail " + va.toString(16)); }
  });

  // Also hook JNI-ish export that Java may call for doodle state
  const exps = mod.enumerateExports().filter(e => /doodle|Doodle|DOODLE/.test(e.name));
  log("doodle exports=" + exps.length);
  exps.forEach(e => log("  " + e.name + " @" + e.address.sub(base)));
  log("ready");
});


function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }

  // Hook the getter that returns activation mode, plus the show-dialog core
  const hooks = [
    { va: 0x79b8734, name: "modeGetter" },
    { va: 0xb46f178, name: "dialogFactory" },
    { va: 0xb6bc574, name: "createObjA" },
    { va: 0xb6c1750, name: "createObjB" }
  ];
  hooks.forEach(function(h) {
    try {
      Interceptor.attach(base.add(h.va), {
        onEnter() { log(h.name + " enter from " + off(this.returnAddress)); },
        onLeave(r) { log(h.name + " leave -> " + r.toInt32()); }
      });
    } catch(e) { log("hook fail " + h.name); }
  });
  log("all hooked");
});


function log(m) { send({ t: "log", m: String(m) }); }

function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => {
    m = Process.findModuleByName(name);
    if (m) { clearInterval(t); cb(m); }
  }, 200);
}

waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  log("base=" + base);
  function at(va) { return base.add(va); }

  try {
    Interceptor.attach(at(0x79b8734), {
      onLeave(ret) { log("mode -> " + ret.toInt32()); }
    });
    log("hooked mode getter");
  } catch(e) { log("getter fail " + e); }

  try {
    Interceptor.attach(at(0xb65bfb4), {
      onEnter() { log("ApplyState"); }
    });
    log("hooked ApplyState");
  } catch(e) { log("applystate fail " + e); }
});


function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  function off(a) { return "0x" + a.sub(base).toString(16); }
  const GUIDS = ["6FFACA71-426A-4685-9014-D84E4FEC117B", "742DEA58-ED6B-4402-BC11-20DFC6D08040"];

  // Hook memcpy/memcmp/strcmp-likes and scan for GUID reads
  const targets = ["memcmp","strcmp","strncmp","strlen","strstr"];
  targets.forEach(function(n) {
    const p = Module.findGlobalExportByName(n);
    if (!p) return;
    try {
      Interceptor.attach(p, {
        onEnter(args) {
          try {
            const s = args[0].readUtf8String(40);
            if (s && GUIDS.some(g => s.indexOf(g) >= 0)) {
              log("READ GUID via " + n + " from " + off(this.returnAddress));
              Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,8)
                .forEach(a => log("    " + off(a)));
            }
          } catch(e) {}
        }
      });
    } catch(e) {}
  });
  log("hooked string funcs");
});

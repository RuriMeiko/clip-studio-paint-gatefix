
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
  // 1. hook known dialog factory
  Interceptor.attach(base.add(0xb6110bc), {
    onEnter() { log(">>> factory 0xb6110bc from " + off(this.returnAddress)); }
  });
  // 2. hook the string-load helper 0xa59308c seen earlier in gate dialog build
  try {
    Interceptor.attach(base.add(0xa59308c), {
      onEnter() { log(">>> strload 0xa59308c from " + off(this.returnAddress)); }
    });
  } catch(e) { log("e1 " + e); }
  // 3. catch any large-string strlen containing 6FFACA71 OR "Draw and create"
  const NEEDLES = ["6FFACA71", "Draw and create with Clip Studio Paint"];
  const sl = Module.findGlobalExportByName("strlen");
  if (sl) {
    Interceptor.attach(sl, {
      onEnter(args) {
        try {
          const p = args[0];
          const b = p.readByteArray(48);
          if (!b) return;
          const s = String.fromCharCode.apply(null, new Uint8Array(b));
          for (var i=0;i<NEEDLES.length;i++) {
            if (s.indexOf(NEEDLES[i]) === 0) {
              log("### strlen needle[" + i + "] from " + off(this.returnAddress));
              Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,12).forEach(a => log("     " + off(a)));
            }
          }
        } catch(e) {}
      }
    });
  }
  log("hooked all");
});

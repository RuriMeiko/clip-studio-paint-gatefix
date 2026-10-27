function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(n, cb){let m=Process.findModuleByName(n); if(m){cb(m);return;} const t=setInterval(()=>{m=Process.findModuleByName(n); if(m){clearInterval(t);cb(m);}},100);}
waitFor("libClipStudioPaint.so", function(mod){
  const base = mod.base;
  const off = a => "0x" + a.sub(base).toString(16);
  log("base=" + base);
  const NEEDLE = "Draw and create with Clip Studio Paint";
  // Hook many string funcs
  ["strlen","strcmp","strncmp","memcpy","strstr","strchr"].forEach(function(fn){
    const p = Module.findGlobalExportByName(fn);
    if (!p) return;
    try {
      Interceptor.attach(p, {
        onEnter(a){
          try {
            const s = a[0].readUtf8String(NEEDLE.length + 4);
            if (s === NEEDLE) {
              log("HIT " + fn + " ret=" + off(this.returnAddress));
              Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,16).forEach(x=>log("   "+off(x)));
            }
          } catch(e){}
        }
      });
    } catch(e){ log("hookfail "+fn+" "+e); }
  });
  log("ready");
});
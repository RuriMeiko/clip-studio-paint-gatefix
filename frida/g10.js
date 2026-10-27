function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(n, cb){let m=Process.findModuleByName(n); if(m){cb(m);return;} const t=setInterval(()=>{m=Process.findModuleByName(n); if(m){clearInterval(t);cb(m);}},100);}
waitFor("libClipStudioPaint.so", function(mod){
  const base = mod.base;
  const off = a => "0x" + a.sub(base).toString(16);
  log("base=" + base);
  // Dialog factory: everything that creates the gate object goes through here
  Interceptor.attach(base.add(0xb6110bc), {
    onEnter(a){
      log("FACTORY 0xb6110bc  x0=" + a[0] + "  ret=" + off(this.returnAddress));
      log("  backtrace:");
      Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,14).forEach(x => log("    " + off(x)));
    }
  });
  log("ready");
});
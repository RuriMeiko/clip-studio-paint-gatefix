function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(n, cb){let m=Process.findModuleByName(n); if(m){cb(m);return;} const t=setInterval(()=>{m=Process.findModuleByName(n); if(m){clearInterval(t);cb(m);}},100);}
waitFor("libClipStudioPaint.so", function(mod){
  const base = mod.base;
  const off = a => "0x" + a.sub(base).toString(16);
  log("base=" + base);
  let fired = 0;
  // 0x4a6018c: proven resource-pack string resolver for gate dialog
  Interceptor.attach(base.add(0x4a6018c), {
    onEnter(a){
      fired++;
      if (fired > 3) return;
      log("RESOLVER 0x4a6018c x0=" + a[0] + " ret=" + off(this.returnAddress));
      Thread.backtrace(this.context, Backtracer.ACCURATE).slice(0,18).forEach(x=>log("   "+off(x)));
    }
  });
  log("ready");
});
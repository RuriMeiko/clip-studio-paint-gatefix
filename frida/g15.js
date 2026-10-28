function log(m){send({t:"l",m:String(m)});}
function waitFor(n,cb){let m=Process.findModuleByName(n);if(m){cb(m);return;}const t=setInterval(()=>{m=Process.findModuleByName(n);if(m){clearInterval(t);cb(m);}},100);}
waitFor("libClipStudioPaint.so",function(mod){
  const base=mod.base; const off=a=>"0x"+a.sub(base).toString(16);
  log("base="+base);
  Interceptor.attach(base.add(0x79b8734),{
    onLeave(r){ log("GETTER -> "+r.toInt32()+" from "+off(this.returnAddress)); }
  });
  log("ready");
});
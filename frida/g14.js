function log(m){send({t:"l",m:String(m)});}
function waitFor(n,cb){let m=Process.findModuleByName(n);if(m){cb(m);return;}const t=setInterval(()=>{m=Process.findModuleByName(n);if(m){clearInterval(t);cb(m);}},100);}
waitFor("libClipStudioPaint.so",function(mod){
  const base=mod.base; const off=a=>"0x"+a.sub(base).toString(16);
  log("base="+base);
  // Morphe-patched mode fn: returns 2 always. See what reads it.
  let c=0;
  Interceptor.attach(base.add(0x49e77cc),{
    onEnter(){ if(++c<=10){ log("MODEFN called #"+c+" from "+off(this.returnAddress)); } }
  });
  // getter (unpatched): returns real mode
  let g=0;
  Interceptor.attach(base.add(0x79b8734),{
    onLeave(r){ if(++g<=10){ log("GETTER -> "+r.toInt32()+" from "+off(this.returnAddress)); } }
  });
  log("ready");
});
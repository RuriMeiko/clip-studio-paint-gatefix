function log(m){send({t:"l",m:String(m)});}
function waitFor(n,cb){let m=Process.findModuleByName(n);if(m){cb(m);return;}const t=setInterval(()=>{m=Process.findModuleByName(n);if(m){clearInterval(t);cb(m);}},100);}
waitFor("libClipStudioPaint.so",function(mod){
  const base=mod.base; const off=a=>"0x"+a.sub(base).toString(16);
  log("base="+base);
  let n1=0,n2=0,n3=0;
  // branch taken: no-gate path
  Interceptor.attach(base.add(0xb591e50),{onEnter(){if(++n1<=3)log("NOGATE 0xb591e50 hit #"+n1+" from "+off(this.returnAddress));}});
  // gate path continues
  Interceptor.attach(base.add(0xb591da8),{onEnter(){if(++n2<=3)log("GATEPATH 0xb591da8 hit #"+n2);}});
  // evaluate
  Interceptor.attach(base.add(0xb594274),{onLeave(r){if(++n3<=5)log("evaluate -> "+r.toInt32());}});
  log("ready");
});
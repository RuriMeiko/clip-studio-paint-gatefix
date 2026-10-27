
function log(m) { send({ t: "log", m: String(m) }); }

function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => {
    m = Process.findModuleByName(name);
    if (m) { clearInterval(t); cb(m); }
  }, 100);
}

waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  log("base=" + base);
  function at(va) { return base.add(va); }

  // Dump the exported symbols that contain "Activation" or "Venser" in name
  const exps = mod.enumerateExports();
  log("total exports=" + exps.length);
  const rel = exps.filter(e => /Activation|Venser|Doodle|Licen|Trial|ProductPlan/i.test(e.name));
  log("relevant exports=" + rel.length);
  rel.slice(0, 40).forEach(e => log("  " + e.name + " @" + e.address.sub(base)));

  // Dump symbols (ELF symtab may be stripped, but try)
  try {
    const syms = mod.enumerateSymbols();
    log("symbols=" + syms.length);
    const rel2 = syms.filter(s => /VEUXActivationDialogController|VEActivation/i.test(s.name));
    log("rel syms=" + rel2.length);
    rel2.slice(0, 40).forEach(s => log("  S " + s.name + " @" + s.address.sub(base)));
  } catch(e) { log("sym err " + e); }
});

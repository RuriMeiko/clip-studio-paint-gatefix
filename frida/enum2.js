
function log(m) { send({ t: "log", m: String(m) }); }
function waitFor(name, cb) {
  let m = Process.findModuleByName(name);
  if (m) { cb(m); return; }
  const t = setInterval(() => { m = Process.findModuleByName(name); if (m) { clearInterval(t); cb(m); } }, 100);
}
waitFor("libClipStudioPaint.so", function(mod) {
  const base = mod.base;
  const syms = mod.enumerateSymbols();
  const pats = [/VEUX/i, /Dialog/i, /Planeswalker/i, /Venser/i];
  const rel = syms.filter(s => pats.some(p => p.test(s.name)));
  log("matched=" + rel.length);
  rel.slice(0, 120).forEach(s => log(s.name + " @" + s.address.sub(base)));
});

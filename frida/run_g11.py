import frida, time
JS = open("/data/3dproject/.apkpatch/frida/g11.js").read()
PKG = "jp.co.celsys.clipstudiopaint.googleplay"
def om(msg, data):
    if msg.get("type")=="send": print(msg["payload"].get("m",""), flush=True)
    elif msg.get("type")=="error": print("ERR:", msg.get("description"), flush=True)
dev = frida.get_device_manager().add_remote_device("127.0.0.1:27042")
pid = dev.spawn([PKG]); s0 = dev.attach(pid)
s = s0.create_script(JS); s.on("message", om); s.load(); dev.resume(pid)
time.sleep(55)
try: s0.detach()
except Exception: pass
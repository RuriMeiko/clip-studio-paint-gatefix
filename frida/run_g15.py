import frida,time
JS=open("/data/3dproject/.apkpatch/frida/g15.js").read()
PKG="jp.co.celsys.clipstudiopaint.googleplay"
def om(m,d):
    if m.get("type")=="send": print(m["payload"].get("m",""),flush=True)
    elif m.get("type")=="error": print("ERR:",m.get("description"),flush=True)
dev=frida.get_device_manager().add_remote_device("127.0.0.1:27042")
pid=dev.spawn([PKG]); s0=dev.attach(pid)
s=s0.create_script(JS); s.on("message",om); s.load(); dev.resume(pid)
time.sleep(50)
try: s0.detach()
except Exception: pass
import frida, time
JS = open('/data/3dproject/.apkpatch/frida/dec.js').read()
PKG = "jp.co.celsys.clipstudiopaint.googleplay"
def on_message(msg, data):
    if msg.get('type') == 'send': print(msg['payload'].get('m',''), flush=True)
    elif msg.get('type') == 'error': print("ERR:", msg.get('description'), flush=True)
dev = frida.get_device_manager().add_remote_device("127.0.0.1:27042")
pid = dev.spawn([PKG]); sess = dev.attach(pid)
s = sess.create_script(JS); s.on('message', on_message); s.load(); dev.resume(pid)
time.sleep(35)
try: sess.detach()
except Exception: pass

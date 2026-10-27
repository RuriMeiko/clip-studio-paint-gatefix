import frida, sys, time, json

JS = open('/data/3dproject/.apkpatch/frida/probe.js').read()
PKG = "jp.co.celsys.clipstudiopaint.googleplay"

msgs = []
def on_message(msg, data):
    if msg.get('type') == 'send':
        msgs.append(msg['payload'])
        print("MSG:", json.dumps(msg['payload']), flush=True)
    elif msg.get('type') == 'error':
        print("ERR:", msg.get('description'), flush=True)

dev = frida.get_device_manager().add_remote_device("127.0.0.1:27042")
pid = dev.spawn([PKG])
print("spawned pid", pid, flush=True)
sess = dev.attach(pid)
script = sess.create_script(JS)
script.on('message', on_message)
script.load()
dev.resume(pid)
print("resumed", flush=True)
time.sleep(35)
try:
    sess.detach()
except Exception:
    pass
print("total msgs", len(msgs), flush=True)

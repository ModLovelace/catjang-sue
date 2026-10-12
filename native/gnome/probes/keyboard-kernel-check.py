#!/usr/bin/env python3
"""Exercise the real parser with an exclusively owned QA uinput device, never the user's keyboard."""
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import select
import struct
import subprocess
import time
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('activity_counter', root / 'keyboard-counter.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
observations = []


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    observations.append(message)


def event(kind, code, value):
    return module.EVENT.pack(0, 0, kind, code, value)


owned = os.open('/dev/uinput', os.O_WRONLY | os.O_NONBLOCK)
reader = None
created = False
try:
    fcntl.ioctl(owned, 0x40045564, 1)  # UI_SET_EVBIT(EV_KEY)
    for code in (28, 30, 44, 57, 29, 42):
        fcntl.ioctl(owned, 0x40045565, code)
    name = b'Catjang-QA-exclusive-counter'
    description = struct.pack('80sHHHHI', name, 6, 1, 1, 1, 0) + bytes(64 * 4 * 4)
    os.write(owned, description)
    fcntl.ioctl(owned, 0x5501)  # UI_DEV_CREATE for our own descriptor only.
    created = True
    system_name = bytearray(64)
    fcntl.ioctl(owned, (2 << 30) | (64 << 16) | (ord('U') << 8) | 44, system_name, True)
    directory = Path('/sys/devices/virtual/input') / bytes(system_name).split(b'\0', 1)[0].decode()
    device = None
    for _ in range(100):
        events = list(directory.glob('event*'))
        if events:
            candidate = Path('/dev/input') / events[0].name
            if candidate.exists() and os.access(candidate, os.R_OK):
                device = candidate
                break
        time.sleep(.02)
    check(device is not None, 'Kernel created a readable QA keyboard without changing device permissions')
    check((directory / 'name').read_text().strip() == name.decode(), 'The test device belongs exclusively to this QA process')
    reader = os.open(device, os.O_RDONLY | os.O_NONBLOCK)
    # Only our freshly created virtual keyboard is grabbed. Production never grabs.
    fcntl.ioctl(reader, 0x40044590, 1)
    check(module.is_keyboard(reader), 'Production capability detection recognizes the real kernel keyboard')
    received = []
    counter = module.KeyboardCounter(lambda: received.append({'event': 'typing'}))

    def send(data):
        os.write(owned, data + event(0, 0, 0))
        deadline = time.monotonic() + .3
        while time.monotonic() < deadline:
            ready, _, _ = select.select([reader], [], [], .05)
            if not ready:
                continue
            chunk = os.read(reader, module.EVENT.size * 64)
            # Fragment input deliberately; kernel messages must still be counted once.
            cut = len(chunk) // 2
            counter.consume('owned-qa', chunk[:cut])
            counter.consume('owned-qa', chunk[cut:])

    send(event(1,30,1) + event(1,30,2) + event(1,30,0))
    check(len(received) == 2, 'Physical-format press and autorepeat count once each; release does not count')
    send(event(1,29,1) + event(1,30,1) + event(1,30,0) + event(1,29,0))
    check(len(received) == 2, 'Shortcut modifier and modified key do not produce typing activity')
    send(event(1,42,1) + event(1,30,1) + event(1,30,0) + event(1,42,0))
    check(len(received) == 3, 'Shift itself is ignored while a shifted letter remains a typing pulse')
    check(all(item == {'event': 'typing'} for item in received), 'Only activity crosses the boundary: no character, key identifier or typed text')
finally:
    if reader is not None:
        fcntl.ioctl(reader, 0x40044590, 0)
        os.close(reader)
    if created:
        fcntl.ioctl(owned, 0x5502)
    os.close(owned)

worker = subprocess.Popen(['python3', str(root / 'keyboard-counter.py')], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
try:
    ready, _, _ = select.select([worker.stdout], [], [], 3)
    check(bool(ready), 'Production reader advertises its desktop keyboard readiness')
    status = json.loads(worker.stdout.readline())
    check(status['event'] == 'status' and status['devices'] > 0, 'Current user can read desktop keyboards without adding permissions or root services')
    worker.stdin.close()
    worker.wait(timeout=2)
    check(worker.returncode == 0, 'Closing the parent pipe stops the production reader cleanly')
finally:
    if worker.poll() is None:
        worker.terminate()
        worker.wait(timeout=2)

output = Path(os.environ['CATJANG_PROTOTYPE_OUTPUT']) / 'keyboard-kernel.json'
output.write_text(json.dumps({'timestampUtc': datetime.now(timezone.utc).isoformat(), 'observations': observations,
    'limitations': ['Own exclusive uinput device; physical external-app rhythm still requires human observation']}, indent=2) + '\n')
print(f'Keyboard kernel observations: {len(observations)}')

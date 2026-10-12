#!/usr/bin/env python3
"""Read-only evdev activity counter. Never emit key codes or text; never grab devices."""
import fcntl
import json
import os
from pathlib import Path
import selectors
import signal
import struct
import sys
import time

EVENT = struct.Struct('@llHHi')
EV_KEY = 1
MODIFIERS = {29, 42, 54, 56, 97, 100, 125, 126, 58, 69, 70}
SHORTCUT_MODIFIERS = {29, 56, 97, 100, 125, 126}


def is_keyboard(fd):
    bits = bytearray(96)
    # EVIOCGBIT(EV_KEY, 96): read advertised capabilities, without grabbing input.
    fcntl.ioctl(fd, (2 << 30) | (96 << 16) | (ord('E') << 8) | (0x20 + EV_KEY), bits, True)
    return all(bits[code // 8] & (1 << (code % 8)) for code in (28, 30, 44, 57))


class KeyboardCounter:
    def __init__(self, pressed):
        self.pressed = pressed
        self.buffers = {}
        self.modifiers = {}

    def consume(self, identity, chunk):
        data = self.buffers.get(identity, b'') + chunk
        complete = len(data) - len(data) % EVENT.size
        for offset in range(0, complete, EVENT.size):
            _seconds, _microseconds, kind, code, value = EVENT.unpack_from(data, offset)
            if kind != EV_KEY:
                continue
            held = self.modifiers.setdefault(identity, set())
            if code in MODIFIERS:
                if value == 0:
                    held.discard(code)
                elif code in SHORTCUT_MODIFIERS:
                    held.add(code)
                continue
            if value in (1, 2) and not any(self.modifiers.values()):
                self.pressed()  # No key identifier survives this boundary.
        self.buffers[identity] = data[complete:]

    def remove(self, identity):
        self.buffers.pop(identity, None)
        self.modifiers.pop(identity, None)


def main():
    selector = selectors.DefaultSelector()
    selector.register(sys.stdin.fileno(), selectors.EVENT_READ, 'parent')
    devices = {}
    running = True
    last_status = None

    def emit(item):
        nonlocal running
        try:
            print(json.dumps(item, separators=(',', ':')), flush=True)
        except BrokenPipeError:
            running = False

    counter = KeyboardCounter(lambda: emit({'event': 'typing'}))

    def stop(*_args):
        nonlocal running
        running = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        next_scan = 0
        while running:
            now = time.monotonic()
            if now >= next_scan:
                next_scan = now + 2
                present = set(Path('/dev/input').glob('event*'))
                for node in present - devices.keys():
                    fd = None
                    try:
                        fd = os.open(node, os.O_RDONLY | os.O_NONBLOCK)
                        if not is_keyboard(fd):
                            os.close(fd)
                            continue
                        selector.register(fd, selectors.EVENT_READ, node)
                        devices[node] = fd
                    except OSError:
                        if fd is not None:
                            os.close(fd)
                for node in set(devices) - present:
                    fd = devices.pop(node)
                    selector.unregister(fd)
                    os.close(fd)
                    counter.remove(node)
                status = len(devices)
                if status != last_status:
                    last_status = status
                    emit({'event': 'status', 'devices': status})
            for key, _mask in selector.select(.2):
                if key.data == 'parent':
                    if not os.read(key.fd, 1):
                        running = False
                    continue
                try:
                    chunk = os.read(key.fd, EVENT.size * 64)
                    if not chunk:
                        raise OSError('Device disconnected')
                    counter.consume(key.data, chunk)
                except BlockingIOError:
                    continue
                except OSError:
                    selector.unregister(key.fd)
                    os.close(devices.pop(key.data))
                    counter.remove(key.data)
    finally:
        for fd in devices.values():
            os.close(fd)
        selector.close()


if __name__ == '__main__':
    main()

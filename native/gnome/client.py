#!/usr/bin/env python3
"""JSON-lines bridge between Electron and the native session-bus pet."""
import json
import os
import signal
import sys

import gi
gi.require_version('Gio', '2.0')
from gi.repository import Gio, GLib

INTERFACE = 'dev.catjang.GnomePet1'
OBJECT = '/dev/catjang/GnomePet'
connection = Gio.bus_get_sync(Gio.BusType.SESSION, None)
loop = GLib.MainLoop()
attached = False
stopping = False


def emit(value):
    try:
        print(json.dumps(value, separators=(',', ':')), flush=True)
    except BrokenPipeError:
        stop()


def call(method, value=None):
    parameters = None if value is None else GLib.Variant('(s)', (value,))
    result = connection.call_sync('org.gnome.Shell', OBJECT, INTERFACE, method,
        parameters, GLib.VariantType('(s)'), Gio.DBusCallFlags.NO_AUTO_START, 3000, None)
    return json.loads(result.unpack()[0])


def stop(*_args):
    global stopping, attached
    if stopping:
        return GLib.SOURCE_REMOVE
    stopping = True
    if attached:
        try:
            call('Detach')
        except GLib.Error:
            pass
    attached = False
    loop.quit()
    return GLib.SOURCE_REMOVE


buffer = b''


def handle(line):
    global attached
    request = {}
    try:
        if len(line) > 8192 or not line.endswith('\n'):
            raise ValueError('Bridge request exceeds its size limit')
        request = json.loads(line)
        method = request.get('method')
        if method not in {'Attach', 'Update', 'SetControls', 'SetActivity', 'Animate', 'Notify', 'Detach', 'GetState'}:
            raise ValueError('Unknown bridge request')
        value = request.get('value')
        if method in {'Attach', 'Update', 'SetControls', 'SetActivity'}:
            value = json.dumps(value, separators=(',', ':'))
        elif method in {'Animate', 'Notify'} and not isinstance(value, str):
            raise ValueError('Request requires text')
        result = call(method, value)
        if method == 'Attach':
            attached = True
        elif method == 'Detach':
            attached = False
        emit({'id': request.get('id'), 'ok': True, 'state': result})
    except (ValueError, TypeError, GLib.Error) as error:
        emit({'id': request.get('id'), 'ok': False, 'error': str(error)})


def on_input(_source, condition):
    global buffer
    if condition & GLib.IOCondition.IN:
        chunk = os.read(sys.stdin.fileno(), 8192)
        if not chunk:
            return stop()
        buffer += chunk
        while b'\n' in buffer:
            line, buffer = buffer.split(b'\n', 1)
            if len(line) > 8192:
                return stop()
            handle(line.decode('utf-8') + '\n')
        if len(buffer) > 8192:
            return stop()
    if condition & (GLib.IOCondition.HUP | GLib.IOCondition.ERR):
        return stop()
    return GLib.SOURCE_CONTINUE


def on_position(_connection, _sender, _path, _interface, _signal, parameters):
    if attached:
        x, y = parameters.unpack()
        emit({'event': 'position', 'x': x, 'y': y})


def on_preferences(*_args):
    if attached:
        emit({'event': 'preferences'})


def on_petting(_connection, _sender, _path, _interface, _signal, parameters):
    if attached:
        emit({'event': 'petting', 'active': parameters.unpack()[0]})


def on_context(_connection, _sender, _path, _interface, _signal, parameters):
    if attached:
        emit({'event': 'context', 'action': parameters.unpack()[0]})


connection.signal_subscribe('org.gnome.Shell', INTERFACE, 'PettingChanged', OBJECT,
    None, Gio.DBusSignalFlags.NONE, on_petting)
connection.signal_subscribe('org.gnome.Shell', INTERFACE, 'PositionChanged', OBJECT,
    None, Gio.DBusSignalFlags.NONE, on_position)
connection.signal_subscribe('org.gnome.Shell', INTERFACE, 'PreferencesRequested', OBJECT,
    None, Gio.DBusSignalFlags.NONE, on_preferences)
connection.signal_subscribe('org.gnome.Shell', INTERFACE, 'ContextAction', OBJECT,
    None, Gio.DBusSignalFlags.NONE, on_context)
GLib.io_add_watch(sys.stdin.fileno(), GLib.IOCondition.IN | GLib.IOCondition.HUP | GLib.IOCondition.ERR, on_input)
GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, stop)
GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, stop)
emit({'event': 'ready'})
loop.run()

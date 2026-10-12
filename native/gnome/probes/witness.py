#!/usr/bin/env python3
"""Wayland client that records clicks delivered beneath the prototype."""
import json
import os
from pathlib import Path

os.environ['GDK_BACKEND'] = 'wayland'

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Gdk', '4.0')
from gi.repository import Gdk, Gtk

APP_ID = 'io.github.ModLovelace.CatjangInputWitness'
output = Path(os.environ['CATJANG_PROTOTYPE_OUTPUT']) / 'witness-events.jsonl'
output.write_text('')


class Witness(Gtk.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID)
        self.count = 0

    def do_activate(self):
        window = Gtk.ApplicationWindow(application=self, title='Catjang input witness')
        window.set_default_size(1000, 700)
        self.label = Gtk.Label(label='Cliente Wayland debajo de la mascota\nClics recibidos: 0')
        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.label.set_vexpand(True)
        content.append(self.label)
        entry = Gtk.Entry(placeholder_text='Escribe aquí para comprobar que la mascota conserva el foco')
        entry.connect('changed', lambda widget: self.text_changed(len(widget.get_text())))
        content.append(entry)
        window.set_child(content)
        css = Gtk.CssProvider()
        css.load_from_string('window { background: #334155; color: white; } label { font-size: 24px; }')
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        gesture = Gtk.GestureClick()
        gesture.set_button(1)
        gesture.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        gesture.connect('pressed', self.pressed)
        gesture.connect('released', self.clicked)
        content.add_controller(gesture)
        window.maximize()
        window.present()
        entry.grab_focus()

    def text_changed(self, length):
        self.get_dbus_connection().emit_signal(None,
            '/io/github/ModLovelace/CatjangInputWitness', APP_ID, 'Typing', None)
        # Record delivery evidence, never the user's text or key values.
        with output.open('a') as stream:
            stream.write(json.dumps({'phase': 'text', 'length': length}) + '\n')

    def record(self, phase, x, y):
        with output.open('a') as stream:
            stream.write(json.dumps({'phase': phase, 'click': self.count, 'x': x, 'y': y}) + '\n')

    def pressed(self, _gesture, _presses, x, y):
        self.record('pressed', x, y)

    def clicked(self, _gesture, _presses, x, y):
        self.count += 1
        self.label.set_label(f'Cliente Wayland debajo de la mascota\nClics recibidos: {self.count}')
        self.record('released', x, y)


Witness().run(None)

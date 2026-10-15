import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {Accordion, HuntingMotion} from './animation.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const CONTROL_PATH = '/dev/catjang/GnomePet';
const CONTROL_IFACE = 'dev.catjang.GnomePet1';
const CONTROL_XML = `<node><interface name="${CONTROL_IFACE}">
    <method name="Attach"><arg type="s" direction="in"/><arg type="s" direction="out"/></method>
    <method name="Update"><arg type="s" direction="in"/><arg type="s" direction="out"/></method>
    <method name="SetControls"><arg type="s" direction="in"/><arg type="s" direction="out"/></method>
    <method name="Animate"><arg type="s" direction="in"/><arg type="s" direction="out"/></method>
    <method name="SetActivity"><arg type="s" direction="in"/><arg type="s" direction="out"/></method>
    <method name="Notify"><arg type="s" direction="in"/><arg type="s" direction="out"/></method>
    <method name="Detach"><arg type="s" direction="out"/></method>
    <method name="GetState"><arg type="s" direction="out"/></method>
    <signal name="PositionChanged"><arg type="i"/><arg type="i"/></signal>
    <signal name="PreferencesRequested"/>
    <signal name="PettingChanged"><arg type="b"/></signal>
    <signal name="ContextAction"><arg type="s"/></signal>
</interface></node>`;


export default class CatjangPrototype extends Extension {
    enable() {
        this._disabling = false;
        this._signals = [];
        this._regions = [];
        this._clicks = 0;
        this._debug = false;
        this._grab = null;
        this._gesture = null;
        this._dragging = false;
        this._effect = null;
        this._hunting = null;
        this._huntingMotion = new HuntingMotion();
        this._frame = null;
        this._tick = 0;
        this._positioned = false;
        this._typingLeft = false;
        this._look = '0,0';
        this._texture = null;
        this._stroke = null;
        this._purring = false;
        this._heat = 0;
        this._fatigue = 0;
        this._typingLeft = false;
        this._physics = null;
        this._releaseStarted = 0;
        this._motionTime = GLib.get_monotonic_time();
        this._lastPointerTick = 0;
        this._keyTimes = [];
        this._heatTime = GLib.get_monotonic_time();
        this._stretchActor = null;
        this._activity = null; this._sleeping = false;
        this._lastActivity = GLib.get_monotonic_time();
        this._size = 200;
        this._owner = null;
        this._mascot = 'cat';
        this._ownerWatch = 0;
        this._menu = null;
        this._menuManager = null;
        this._controls = {pomodoroRunning: false, stretchIntervalMin: 0, nameVisible: true};
        this._requestedVisible = this.uuid === 'catjang-prototype@modlovelace.github.io';
        try {
            const [, bytes] = Gio.File.new_for_path(`${this.path}/assets/input-regions.json`).load_contents(null);
            const geometry = JSON.parse(new TextDecoder().decode(bytes));
            const readAsset = file => {
                const [,data] = Gio.File.new_for_path(`${this.path}/assets/${file}`).load_contents(null);
                return JSON.parse(new TextDecoder().decode(data));
            };
            this._catalog = readAsset('catalog.json');
            this._geometries = new Map(Object.entries(this._catalog).map(([id,info]) => [id, id === 'cat' ? geometry : readAsset(info.geometry)]));
            this._frames = geometry.frames;
            this._stretchFrames = geometry.stretch;
            this._chainFrames = geometry.dragChain;
            this._icons = new Map();
            this._contents = new Map();
            for (const [name, frame] of Object.entries(this._frames)) {
                const path = `${this.path}/assets/${frame.file}`;
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file(path);
                if (frame.width !== geometry.width || frame.height !== geometry.height ||
                    pixbuf.get_width() !== frame.width || pixbuf.get_height() !== frame.height)
                    throw new Error(`Input map and image dimensions differ: ${name}`);
                this._icons.set(frame.file, new Gio.FileIcon({file: Gio.File.new_for_path(path)}));
                for (const file of Object.values(frame.looks ?? {}))
                    this._icons.set(file, new Gio.FileIcon({file: Gio.File.new_for_path(`${this.path}/assets/${file}`)}));
            }
            this._actor = new Clutter.Actor({
                name: 'catjang-gnome-prototype', width: geometry.width, height: geometry.height,
                reactive: false, layout_manager: new Clutter.FixedLayout(),
            });
            this._visual = new St.Icon({
                name: 'catjang-prototype-image', icon_size: geometry.width,
                width: geometry.width, height: geometry.height, reactive: false,
                style: 'padding: 0; margin: 0;',
            });
            // Shell may destroy chrome before disabling extensions at shutdown.
            // Dispose the timer and external handlers as soon as our actor dies.
            this._actor.connect('destroy', () => {
                if (this._disabling) return;
                this._actor = null;
                this._dragLayer = null;
                this._dragPieces = [];
                this.disable();
            });
            this._actor.add_child(this._visual);
            this._visualHeat = new St.Icon({icon_size: 200, width: 200, height: 200, reactive: false,
                style: 'padding: 0; margin: 0;', opacity: 0});
            this._actor.add_child(this._visualHeat);
            this._dragLayer = new Clutter.Actor({width: 320, height: 592, reactive: false, visible: false});
            this._dragLayer.set_position(-60, 36);
            this._actor.add_child(this._dragLayer);
            this._dragPieces = this._chainFrames[0].map(info => {
                const group = new Clutter.Actor({width: info.width, height: info.height, reactive: false});
                const image = new Clutter.Actor({width: info.width, height: info.height, reactive: false});
                const heat = new Clutter.Actor({width: info.width, height: info.height, reactive: false, opacity: 0});
                group.add_child(image); group.add_child(heat); this._dragLayer.add_child(group);
                return {group, image, heat, file: null};
            });
            this._nameLabel = new St.Label({text: '', reactive: false, style: 'font-size: 12px; color: white; text-align: center;'});
            this._nameLabel.set_position(0, geometry.height + 2);
            this._actor.add_child(this._nameLabel);
            this._messageLabel = new St.Label({text: '', reactive: false, visible: false,
                style: 'font-size: 12px; color: white; background-color: rgba(25,35,48,.9); padding: 8px; border-radius: 8px;'});
            this._messageLabel.clutter_text.set_line_wrap(true);
            this._actor.add_child(this._messageLabel);
            this._statusLabel = new St.Label({text: '', reactive: false, visible: false,
                style: 'font-size: 17px; color: white;'});
            this._actor.add_child(this._statusLabel);
            this._confetti = [];
            const colors = ['#ff6688','#66ccff','#ffcc33','#77dd99','#bb88ff'];
            for (let i=0;i<20;i++) {
                const piece = new Clutter.Actor({width: 4, height: 4, reactive: false, visible: false});
                const color=colors[i%colors.length];
                piece.set_background_color(new Cogl.Color({red:parseInt(color.slice(1,3),16),green:parseInt(color.slice(3,5),16),blue:parseInt(color.slice(5,7),16),alpha:255}));
                this._actor.add_child(piece); this._confetti.push(piece);
            }
            this._hearts = [];
            for (let index = 0; index < 3; index++) {
                const heart = new St.Label({text: '♥', reactive: false, visible: false,
                    style: 'font-size: 20px; color: #ff8eba;'});
                this._actor.add_child(heart);
                this._hearts.push(heart);
            }
            this._steam = [];
            for (let index = 0; index < 3; index++) {
                const steam = new St.Label({text: '∿', reactive: false, visible: false,
                    style: 'font-size: 20px; color: #dc2828;'});
                this._actor.add_child(steam); this._steam.push(steam);
            }
            // Keep these actors alive across pose changes, including while a
            // button is held. Destroying a pressed child can cancel its sequence.
            const capacity = Math.max(...[...this._geometries.values()].flatMap(data => Object.values(data.frames).map(frame => frame.rects.length)));
            for (let index = 0; index < capacity; index++) {
                const region = new Clutter.Actor({name: `catjang-prototype-hit-${index}`, reactive: true});
                region.connect('event', (_region, event) => this._onEvent(event));
                this._actor.add_child(region);
                this._regions.push(region);
            }
            this._actor.connect('event', (_actor, event) => this._onEvent(event));
            this._setFrame('idle');
            Main.layoutManager.addChrome(this._actor, {affectsStruts: false});
            this._connect(Main.layoutManager, 'monitors-changed', () => this._place());
            this._connect(global.display, 'workareas-changed', () => this._place());
            this._connect(global.display, 'in-fullscreen-changed', () => this._syncVisibility());
            this._connect(Main.overview, 'showing', () => this._syncVisibility());
            this._connect(Main.overview, 'hidden', () => this._syncVisibility());
            this._connect(Main.sessionMode, 'updated', () => this._syncVisibility());
            // The isolated GTK witness sends a payload-free typing intent.
            // Native Wayland keys go directly to the client; stage capture is
            // not a reliable global keyboard observer. Do not intercept keys.
            this._typingSubscription = Gio.DBus.session.signal_subscribe(
                'io.github.ModLovelace.CatjangInputWitness',
                'io.github.ModLovelace.CatjangInputWitness', 'Typing',
                '/io/github/ModLovelace/CatjangInputWitness', null,
                Gio.DBusSignalFlags.NONE, () => {
                    if (this._owner || !this._actor?.visible || this._gesture)
                        return;
                    this._typingPulse();
                });
            const api = {};
            for (const method of ['Attach', 'Update', 'SetControls', 'SetActivity', 'Animate', 'Notify', 'Detach', 'GetState'])
                api[`${method}Async`] = (parameters, invocation) => this._control(method, parameters, invocation);
            this._controlObject = Gio.DBusExportedObject.wrapJSObject(CONTROL_XML, api);
            this._controlObject.export(Gio.DBus.session, CONTROL_PATH);
            this._animationSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
                this._animate();
                return GLib.SOURCE_CONTINUE;
            });
            this._place();
            console.log(`[Catjang GNOME] ready: ${Object.keys(this._frames).length} animated frames`);
        } catch (error) {
            this.disable();
            throw error;
        }
    }

    _state() {
        return {connected: Boolean(this._owner), visible: Boolean(this._actor?.visible),
            sleeping: this._sleeping, activity: this._activity?.state ?? 'idle', activityText: this._activity?.text ?? '',
            size: this._size, name: this._nameLabel?.text ?? '',
            x: Math.round(this._actor?.x ?? 0), y: Math.round(this._actor?.y ?? 0),
            frame: this._frame, heat: this._heat, fatigue: this._fatigue, accordion: this._physics?.t ?? 0, stretching: Boolean(this._stretchActor), look: this._look, hunting: Boolean(this._hunting), purring: this._purring, mascot: this._mascot, version: this.metadata.version};
    }

    _configuration(json) {
        if (json.length > 4096)
            throw new Error('Configuration is too large');
        const settings = JSON.parse(json);
        if (!settings || Array.isArray(settings) || !Object.hasOwn(this._catalog, settings.mascot))
            throw new Error('Unknown native mascot');
        if (!Number.isInteger(settings.size) || settings.size < 40 || settings.size > 400 ||
            typeof settings.name !== 'string' || settings.name.length > 24 ||
            typeof settings.nameVisible !== 'boolean' || typeof settings.visible !== 'boolean')
            throw new Error('Invalid native pet configuration');
        if (settings.position !== null && (!settings.position ||
            !Number.isInteger(settings.position.x) || !Number.isInteger(settings.position.y) ||
            Math.abs(settings.position.x) > 100000 || Math.abs(settings.position.y) > 100000))
            throw new Error('Invalid native position');
        return settings;
    }

    _apply(settings) {
        this._wake();
        this._cancelHunting();
        this._finishStretch();
        this._endGesture(true);
        this._resetAccordion();
        if (settings.mascot !== this._mascot) {
            this._setPurring(false); this._stroke = null; this._effect = null;
            this._mascot = settings.mascot;
            const geometry = this._geometries.get(this._mascot);
            this._frames = geometry.frames; this._stretchFrames = geometry.stretch;
            // The cat keeps its verified 16-band accordion; other canonical
            // hanging poses use Electron's whole-body pendulum.
            this._chainFrames = geometry.dragChain;
            this._frame = null; this._texture = null; this._maskTexture = null;
            this._look = '0,0'; this._setFrame('idle');
        }
        this._size = settings.size;
        const scale = settings.size / 200;
        this._actor.set_scale(scale, scale);
        this._nameLabel.set_scale(1 / scale, 1 / scale);
        this._nameLabel.set_width(settings.size);
        this._nameLabel.text = settings.name;
        const rects = this._frames.idle.rects;
        const left = Math.min(...rects.map(r=>r.x)), right = Math.max(...rects.map(r=>r.x+r.width));
        const bottom = Math.max(...rects.map(r=>r.y+r.height));
        this._bodyCenter = (left+right)/2;
        this._nameLabel.set_position(this._bodyCenter-100, bottom+8/scale);
        this._statusLabel.set_scale(1/scale,1/scale);
        this._statusLabel.set_position(this._bodyCenter+25,30);
        this._nameRequestedVisible = settings.nameVisible;
        this._nameLabel.visible = settings.nameVisible;
        this._updateMessage();
        this._requestedVisible = settings.visible;
        if (settings.position) {
            this._actor.set_position(settings.position.x, settings.position.y);
            this._positioned = true;
        } else {
            this._positioned = false;
        }
        this._place();
    }

    _detachController() {
        this._activity = null; this._wake();
        this._cancelHunting();
        this._menu?.close();
        this._controls = {pomodoroRunning: false, stretchIntervalMin: 0, nameVisible: true, fixedMessage: ''};
        if (this._actor && this._messageLabel) { this._messageLabel.text = ''; this._messageLabel.hide(); }
        this._finishStretch();
        this._resetAccordion();
        this._keyTimes = [];
        this._heat = 0; this._fatigue = 0;
        this._setPurring(false);
        this._stroke = null;
        if (this._ownerWatch)
            Gio.bus_unwatch_name(this._ownerWatch);
        this._ownerWatch = 0;
        this._owner = null;
        this._effect = null;
        this._requestedVisible = this.uuid === 'catjang-prototype@modlovelace.github.io';
        this._syncVisibility();
    }

    _control(method, parameters, invocation) {
        const sender = invocation.get_sender();
        try {
            if (method === 'Attach') {
                if (this._owner && this._owner !== sender)
                    throw new Error('Another Catjang controller is already connected');
                const settings = this._configuration(parameters[0]);
                if (!this._owner) {
                    this._owner = sender;
                    this._ownerWatch = Gio.bus_watch_name_on_connection(Gio.DBus.session, sender,
                        Gio.BusNameWatcherFlags.NONE, () => {}, () => this._detachController());
                }
                this._apply(settings);
            } else {
                // A session-bus unique name identifies the live helper connection.
                // Another process cannot Update/Detach someone else's mascot.
                if (this._owner !== sender)
                    throw new Error('Caller does not own the native pet');
                if (method === 'Update')
                    this._apply(this._configuration(parameters[0]));
                else if (method === 'SetControls') {
                    if (parameters[0].length > 1024) throw new Error('Controls exceed size limit');
                    const controls = JSON.parse(parameters[0]);
                    if (!controls || typeof controls.pomodoroRunning !== 'boolean' || typeof controls.nameVisible !== 'boolean' ||
                        typeof controls.fixedMessage !== 'string' || controls.fixedMessage.length > 80 ||
                        ![0, 1, 10, 15, 20, 30, 45, 60, 90, 120].includes(controls.stretchIntervalMin))
                        throw new Error('Invalid native controls');
                    this._controls = controls;
                    this._updateMessage();
                }
                else if (method === 'Detach')
                    this._detachController();
                else if (method === 'Animate') {
                    const effects = {typing: ['press-left', 'press-right'], scroll: ['scroll', 'scroll-alt'],
                        jump: ['jump-start', 'jump-ing'], stretch: ['stretch']};
                    const frames = effects[parameters[0]];
                    if (!frames)
                        throw new Error('Unknown animation');
                    if (parameters[0] === 'typing') { this._typingPulse(); }
                    else if (!this._gesture) {
                        if (parameters[0] === 'stretch') this._startStretch();
                        else { this._finishStretch(); this._play(frames, 700); }
                    }
                } else if (method === 'SetActivity') {
                    if (parameters[0].length > 2048) throw new Error('Activity exceeds size limit');
                    const a=JSON.parse(parameters[0]);
                    if (!a || !['thinking','working','complete','notification','error','idle'].includes(a.state) ||
                        typeof a.text!=='string' || a.text.length>512) throw new Error('Invalid activity');
                    this._wake();
                    const now=GLib.get_monotonic_time();
                    this._activity={state:a.state,text:a.text,start:now,until:now+(['thinking','working'].includes(a.state)?15000000:5500000)};
                    if (a.state==='complete' || a.state==='notification') this._play(['jump-start','jump-ing'],700);
                    this._updateMessage();
                } else if (method === 'Notify') {
                    if (parameters[0].length > 512)
                        throw new Error('Notification is too large');
                    Main.notify('Catjang', parameters[0]);
                }
            }
            invocation.return_value(new GLib.Variant('(s)', [JSON.stringify(this._state())]));
        } catch (error) {
            invocation.return_dbus_error(`${CONTROL_IFACE}.Error`, error.message);
        }
    }

    _connect(object, signal, callback) {
        this._signals.push([object, object.connect(signal, callback)]);
    }

    _setFrame(name) {
        if (!this._actor || name === this._frame)
            return;
        this._frame = name;
        this._refreshVisual();
        this._updateRegions();
    }

    _refreshVisual() {
        if (!this._actor || !this._frames?.[this._frame]) return;
        const frame = this._frames[this._frame];
        const file = frame.looks?.[this._look] ?? frame.file;
        const mask = frame.heatMasks?.[this._look] ?? frame.heatMasks?.['0,0'];
        const icon = name => {
            if (!this._icons.has(name)) this._icons.set(name, new Gio.FileIcon({file: Gio.File.new_for_path(`${this.path}/assets/${name}`)}));
            return this._icons.get(name);
        };
        if (file !== this._texture) { this._texture = file; this._visual.gicon = icon(file); }
        if (mask && mask !== this._maskTexture) { this._maskTexture = mask; this._visualHeat.gicon = icon(mask); }
        this._visualHeat.opacity = mask ? Math.round(this._heat * .9 * 255) : 0;
    }

    _setPurring(active) {
        if (active === this._purring) return;
        this._purring = active;
        for (const heart of this._actor ? this._hearts ?? [] : []) heart.visible = active;
        if (this._owner)
            this._controlObject?.emit_signal('PettingChanged', new GLib.Variant('(b)', [active]));
        if (!active && this._actor && this._frame?.startsWith('purr')) this._setFrame('idle');
    }

    _trackPointer() {
        const [x, y] = global.get_pointer();
        if (this._lastPointer && Math.hypot(x-this._lastPointer[0],y-this._lastPointer[1])>=2) this._wake();
        this._lastPointer=[x,y];
        const nx = (x - this._actor.x) / this._size;
        const ny = (y - this._actor.y) / this._size;
        const direction = value => value > .2 ? 1 : value < -.2 ? -1 : 0;
        const hit = this._catalog[this._mascot].petting;
        const look = `${direction(nx - hit.cx)},${direction(ny - hit.cy)}`;
        if (look !== this._look) { this._look = look; this._refreshVisual(); }
        const now = GLib.get_monotonic_time() / 1000;
        if (this._catalog[this._mascot].hunting && !this._gesture && !this._effect && !this._menu?.isOpen && (!this._hunting || now < this._hunting.until)) {
            if (this._huntingMotion.sample(x, y, this._actor.x + this._size*hit.cx, this._actor.y + this._size*hit.cy, this._size, now)) {
                if (!this._hunting) this._hunting = {start: now, until: now + 1100};
                else this._hunting.until = now + 1100;
                this._setPurring(false); this._stroke = null;
            }
        } else this._huntingMotion.reset();
        const opaque = this._frames[this._frame].rects.some(rect =>
            nx * 200 >= rect.x && nx * 200 < rect.x + rect.width &&
            ny * 200 >= rect.y && ny * 200 < rect.y + rect.height);
        const head = opaque && ((nx - hit.cx) / hit.rx) ** 2 + ((ny - hit.cy) / hit.ry) ** 2 <= 1;
        if (this._gesture || this._effect || this._hunting || this._menu?.isOpen || !head) {
            if (this._stroke && now - this._stroke.lastMove > 250) this._stroke = null;
            this._setPurring(false);
            return;
        }
        if (!this._stroke || now - this._stroke.lastMove > 450) {
            this._stroke = {start: now, lastMove: now, x, y, distance: 0};
            this._setPurring(false);
            return;
        }
        const distance = Math.hypot(x - this._stroke.x, y - this._stroke.y);
        if (distance >= 1.5) {
            this._stroke.distance += distance;
            this._stroke.lastMove = now;
            this._stroke.x = x; this._stroke.y = y;
        }
        if (now - this._stroke.start >= 1400 && this._stroke.distance >= 70)
            this._setPurring(true);
        if (this._purring) {
            this._hearts.forEach((heart, index) => {
                const phase = (now / 900 + index / 3) % 1;
                heart.set_position(58 + index * 25, 42 - phase * 35);
                heart.opacity = Math.round(255 * (1 - phase));
            });
        }
    }

    _updateRegions() {
        if (!this._actor) return;
        const rects = this._frames[this._frame].rects;
        this._regions.forEach((region, index) => {
            const rect = rects[index];
            region.visible = Boolean(rect);
            region.reactive = Boolean(rect) && !this._grab && !this._releaseStarted;
            if (rect) {
                region.set_position(rect.x, rect.y);
                region.set_size(rect.width, rect.height);
            }
            region.set_background_color(new Cogl.Color({
                red: 255, green: 64, blue: 64, alpha: this._debug ? 100 : 0,
            }));
        });
    }

    _cancelHunting() {
        this._hunting = null;
        this._huntingMotion?.reset();
    }

    _wake() {
        this._lastActivity=GLib.get_monotonic_time(); this._sleeping=false;
    }

    _play(frames, milliseconds) {
        this._wake();
        this._cancelHunting();
        this._setPurring(false);
        this._stroke = null;
        this._effect = {frames, start: GLib.get_monotonic_time(), duration: milliseconds * 1000};
        this._setFrame(frames[0]);
    }

    _typingPulse() {
        this._wake();
        this._recordTyping();
        this._typingLeft = !this._typingLeft;
        if (this._gesture || this._releaseStarted || this._stretchActor || !this._actor?.visible) return;
        this._play([this._typingLeft ? 'press-left' : 'press-right'], 180);
    }

    _recordTyping() {
        const now = GLib.get_monotonic_time() / 1000;
        this._keyTimes.push(now);
        this._keyTimes = this._keyTimes.filter(time => now - time <= 1500).slice(-100);
    }

    _updateHeat() {
        const time = GLib.get_monotonic_time();
        if (!this._keyTimes.length && this._heat === 0 && this._fatigue === 0) { this._heatTime = time; return; }
        const now = time / 1000;
        this._keyTimes = this._keyTimes.filter(stamp => now - stamp <= 1500);
        const seconds = Math.max(0, Math.min(.1, (time - this._heatTime) / 1000000));
        const kps = this._keyTimes.length / 1.5;
        const speed = Math.max(0, Math.min(1, (kps - 4) / 10));
        const recent = this._keyTimes.length && now - this._keyTimes[this._keyTimes.length - 1] < 200;
        if (recent && speed > 0) this._fatigue = Math.min(1, this._fatigue + speed * seconds / 4);
        else this._fatigue *= Math.exp(-seconds * 3);
        if (this._fatigue < .005) this._fatigue = 0;
        const target = Math.max(speed ** 1.5, this._fatigue * .85);
        const ease = 1 - .9 ** ((time - this._heatTime) / 16667);
        this._heatTime = time;
        this._heat += (target - this._heat) * ease;
        if (target === 0 && this._heat < .005) this._heat = 0;
        this._refreshVisual();
        const opacity = Math.max(0, Math.min(1, (this._heat - .5) * 2));
        this._steam?.forEach((steam, index) => {
            steam.visible = opacity > 0 && !this._stretchActor && !this._gesture;
            const phase = (now / 1100 + index / 3) % 1;
            steam.set_position(65 + index * 25 + Math.sin(phase * Math.PI * 2) * 4, 52 - phase * 45);
            steam.opacity = Math.round(opacity * 220 * (1 - phase));
        });
    }

    _startStretch() {
        if (!this._catalog[this._mascot].stretchSupported) return;
        this._wake();
        this._cancelHunting();
        this._finishStretch();
        this._resetAccordion();
        this._endGesture(true);
        this._setPurring(false); this._stroke = null; this._effect = null;
        const index = this._monitorIndex();
        const monitor = Main.layoutManager.monitors[index];
        if (!monitor) return;
        const width = Math.min(monitor.width * .85, monitor.height * .8 * 72 / 56);
        const height = width * 56 / 72;
        this._stretchActor = new St.Icon({reactive: false, width, height,
            icon_size: Math.round(width), style: 'padding: 0; margin: 0;'});
        this._stretchActor.set_position(monitor.x + (monitor.width - width) / 2, monitor.y + (monitor.height - height) / 2);
        this._stretchStarted = GLib.get_monotonic_time();
        this._stretchIndex = -1;
        this._stretchActor.set_pivot_point(.5, .5);
        Main.layoutManager.addChrome(this._stretchActor, {affectsStruts: false});
        if (this._frames.stretch) this._setFrame('stretch');
        this._actor.visible = false;
        this._animateStretch();
    }

    _animateStretch() {
        const progress = (GLib.get_monotonic_time() - this._stretchStarted) / 3000000;
        if (progress >= 1) { this._finishStretch(); this._syncVisibility(); return; }
        const fadeIn = Math.min(1, progress / (.26 / 3));
        const fadeOut = Math.min(1, (1-progress) / .09);
        const middleOpacity = 1 - .5 * Math.sin(Math.PI * progress) ** 2;
        this._stretchActor.opacity = Math.round(255 * fadeIn * fadeOut * middleOpacity);
        const scale = .88 + .12 * (1 - (1-fadeIn) ** 3);
        this._stretchActor.set_scale(scale, scale);
        const index = Math.min(this._stretchFrames.length - 1, Math.floor(progress * this._stretchFrames.length));
        if (index !== this._stretchIndex) {
            this._stretchIndex = index;
            this._stretchActor.gicon = new Gio.FileIcon({file: Gio.File.new_for_path(`${this.path}/assets/${this._stretchFrames[index]}`)});
        }
    }

    _finishStretch() {
        if (!this._stretchActor) return;
        this._stretchActor.destroy(); this._stretchActor = null;
        this._setFrame('idle');
        this._syncVisibility();
    }

    _beginAccordion() {
        this._resetAccordion();
        this._physics = new Accordion(); this._motionTime = GLib.get_monotonic_time();
        const accordion = this._catalog[this._mascot].dragStyle === 'accordion';
        this._dragLayer.visible = accordion; this._visual.visible = !accordion; this._visualHeat.visible = !accordion;
        if (!accordion) this._setFrame('drag');
        this._nameLabel.visible = false;
        this._messageLabel.visible = false;
        this._renderAccordion();
    }

    _imageContent(file) {
        if (!this._contents.has(file)) {
            const pixels = GdkPixbuf.Pixbuf.new_from_file(`${this.path}/assets/${file}`);
            const content = St.ImageContent.new_with_preferred_size(pixels.get_width(), pixels.get_height());
            content.set_bytes(Clutter.get_default_backend().get_cogl_context(), pixels.read_pixel_bytes(),
                Cogl.PixelFormat.RGBA_8888, pixels.get_width(), pixels.get_height(), pixels.get_rowstride());
            this._contents.set(file, content);
        }
        return this._contents.get(file);
    }

    _renderAccordion() {
        if (!this._physics || !this._actor) return;
        const now = GLib.get_monotonic_time();
        if (this._releaseStarted && now-this._releaseStarted >= 450000) {
            this._resetAccordion(); this._setFrame('idle'); return;
        }
        const area = Main.layoutManager.getWorkAreaForMonitor(this._monitorIndex());
        const room = (area.y + area.height - this._actor.y) * 200 / this._size - 36;
        const maxExtension = Math.max(0, Math.min(1, (room / 4 - 55) / 90));
        this._physics.update((now - this._motionTime) / 1000000, maxExtension);
        this._motionTime = now;
        if (this._catalog[this._mascot].dragStyle !== 'accordion') {
            for (const image of [this._visual,this._visualHeat]) {
                image.set_pivot_point(.5,.15); image.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, -this._physics.angle*.4);
            }
            this._setFrame(Math.floor(now / 140000) % 2 ? 'drag' : 'drag-alt');
            if (this._releaseStarted && now-this._releaseStarted >= 450000) { this._resetAccordion(); this._setFrame('idle'); }
            return;
        }
        const index = Math.max(0, Math.min(20, Math.round(this._physics.t * 20)));
        const offsets = this._physics.offsets();
        const infos = this._chainFrames[index];
        this._dragPieces.forEach((piece, part) => {
            const info = infos[part];
            piece.group.set_position(part === 0 ? 0 : offsets[part-1] * 4, info.top);
            if (piece.file !== info.file) {
                piece.file = info.file;
                piece.image.set_content(this._imageContent(info.file));
                piece.heat.set_content(this._imageContent(info.mask));
            }
            piece.heat.opacity = Math.round(this._heat * .9 * 255);
        });
        if (this._releaseStarted && GLib.get_monotonic_time() - this._releaseStarted >= 450000) this._resetAccordion();
    }

    _resetAccordion() {
        this._physics = null; this._releaseStarted = 0;
        if (!this._actor || !this._dragLayer) return;
        this._dragLayer.visible = false; this._visual.visible = true; this._visualHeat.visible = true;
        for (const image of [this._visual,this._visualHeat]) image.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, 0);
        this._nameLabel.visible = this._nameRequestedVisible ?? false;
        this._updateMessage();
        this._updateRegions();
    }

    _animate() {
        if (!this._actor) return;
        this._updateHeat();
        if (this._stretchActor) { this._animateStretch(); return; }
        if (!this._actor?.visible)
            return;
        if (this._physics) { this._renderAccordion(); return; }
        const clock = GLib.get_monotonic_time();
        if (this._activity && clock>=this._activity.until) { this._activity=null; this._updateMessage(); }
        const active=['thinking','working'].includes(this._activity?.state);
        const alert=['notification','error'].includes(this._activity?.state);
        this._statusLabel.visible=active || this._sleeping || alert;
        this._statusLabel.text=this._sleeping?'Z z z':alert?'!':'.'.repeat(1+Math.floor(clock/350000)%3);
        this._statusLabel.opacity=alert?Math.round(180+75*Math.sin(clock/250000)):255;
        this._confetti.forEach((piece,i)=>{
            const t=(clock-(this._activity?.start??0))/1000000;
            piece.visible=this._activity?.state==='complete' && t>=0 && t<2;
            if(piece.visible){const a=i*Math.PI*2/20;piece.set_position(this._bodyCenter+Math.cos(a)*t*45,65+Math.sin(a)*t*40+t*t*12);piece.opacity=Math.round(255*(1-t/2));}
        });
        if (clock - this._lastPointerTick >= 32000) { this._trackPointer(); this._lastPointerTick = clock; }
        this._tick = Math.floor(clock / 140000);
        if (this._gesture) {
            return;
        }
        if (this._effect) {
            const elapsed = GLib.get_monotonic_time() - this._effect.start;
            if (elapsed < this._effect.duration) {
                this._setFrame(this._effect.frames[Math.floor(elapsed / 140000) % this._effect.frames.length]);
                return;
            }
            this._effect = null;
        }
        if (this._hunting) {
            const now = GLib.get_monotonic_time() / 1000, elapsed = Math.max(0, now - this._hunting.start);
            if (now < this._hunting.until) {
                const index = elapsed < 440 ? Math.floor(elapsed/40) : 11 + Math.floor((elapsed-440)/40) % 17;
                this._setFrame(`hunt-${index}`); return;
            }
            const returned = now - this._hunting.until;
            if (returned < 420) { this._setFrame(`hunt-return-${Math.min(11, Math.floor(returned/40))}`); return; }
            this._cancelHunting();
        }
        if (this._purring) { this._setFrame(this._tick % 2 ? 'purr' : 'purr-alt'); return; }
        this._sleeping=!active && clock-this._lastActivity>=60000000;
        if(this._sleeping){this._setFrame('blink');return;}
        const phase = this._tick % 28;
        const wave = Math.floor(phase / 3) % 8;
        this._setFrame(phase === 26 ? 'blink' : (wave === 0 ? 'idle' : `idle-${wave}`));
    }

    _updateMessage() {
        if (!this._messageLabel || !this._actor) return;
        const scale = this._size / 200;
        const width = Math.max(120, Math.min(280, this._size * 1.5));
        this._messageLabel.set_scale(1 / scale, 1 / scale);
        this._messageLabel.set_width(width);
        this._messageLabel.text = this._activity?.text || this._controls.fixedMessage || '';
        const [, height] = this._messageLabel.get_preferred_height(width);
        this._messageLabel.set_position((200 - width / scale) / 2, -height / scale - 8);
        this._messageLabel.visible = Boolean(this._messageLabel.text) && !this._physics;
    }

    _openContextMenu() {
        if (!this._owner || !this._actor?.visible || this._gesture) return;
        this._cancelHunting();
        this._setPurring(false); this._stroke = null;
        if (!this._menu) {
            const menu = new PopupMenu.PopupMenu(this._actor, .5, St.Side.LEFT);
            this._menu = menu;
            this._menuManager = new PopupMenu.PopupMenuManager(this._actor);
            this._menuManager.addMenu(menu);
            Main.uiGroup.add_child(menu.actor);
            menu.actor.hide();
            menu.actor.connect('destroy', () => {
                this._menuManager?.removeMenu(menu);
                if (this._menu === menu) { this._menu = null; this._menuManager = null; }
            });
        }
        if (this._menu.isOpen) { this._menu.close(); return; }
        this._menu.removeAll();
        this._contextItems = new Map();
        const action = (id, label, parent = this._menu) => {
            const item = parent.addAction(label, () => {
                this._menu?.close();
                if (this._owner) this._controlObject.emit_signal('ContextAction', new GLib.Variant('(s)', [id]));
            });
            this._contextItems.set(id, item); return item;
        };
        action('preferences', 'Configuración');
        const pomodoro = new PopupMenu.PopupSubMenuMenuItem('Pomodoro');
        this._menu.addMenuItem(pomodoro);
        action('pomodoro-toggle', this._controls.pomodoroRunning ? 'Pausar' : 'Iniciar / continuar', pomodoro.menu);
        action('pomodoro-reset', 'Reiniciar', pomodoro.menu);
        action('pomodoro-settings', 'Duración y estado…', pomodoro.menu);
        action('reminders', 'Recordatorios…');
        if (this._catalog[this._mascot].stretchSupported) action('stretch', 'Estirarse ahora');
        action('jump', 'Saltar');
        const size = new PopupMenu.PopupSubMenuMenuItem('Tamaño');
        this._menu.addMenuItem(size);
        action('size-smaller', 'Más pequeño', size.menu); action('size-larger', 'Más grande', size.menu);
        action('name-toggle', this._controls.nameVisible ? 'Ocultar nombre' : 'Mostrar nombre');
        action('agents-setup', 'Configurar agentes de IA…');
        const mascots = new PopupMenu.PopupSubMenuMenuItem('Mascotas');
        this._menu.addMenuItem(mascots);
        for (const [id,info] of Object.entries(this._catalog)) {
            const item = action(`mascot-${id}`, info.defaultName, mascots.menu);
            if (id === this._mascot) item.setOrnament(PopupMenu.Ornament.DOT);
        }
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        action('quit', 'Salir de Catjang');
        const area = Main.layoutManager.getWorkAreaForMonitor(this._monitorIndex());
        this._menu.actor.set_style(`max-height: ${area.height - 32}px;`);
        this._menu.open();
    }

    _onEvent(event) {
        this._wake();
        switch (event.type()) {
        case Clutter.EventType.BUTTON_PRESS:
            if (event.get_button() === Clutter.BUTTON_PRIMARY && !this._gesture) {
                const [x, y] = event.get_coords();
                this._cancelHunting();
                this._resetAccordion();
                this._effect = null;
                this._setPurring(false);
                this._stroke = null;
                this._gesture = {x, y, previousX: x, originX: this._actor.x, originY: this._actor.y};
                // Explicit native capture continues outside the silhouette and
                // across texture changes. Dismiss on release, Escape or hide.
                this._actor.reactive = true;
                this._grab = global.stage.grab(this._actor);
                this._updateRegions();
            }
            return Clutter.EVENT_STOP;
        case Clutter.EventType.MOTION:
            if (!this._gesture)
                return Clutter.EVENT_PROPAGATE;
            {
                const [x, y] = event.get_coords();
                const dx = x - this._gesture.x;
                const dy = y - this._gesture.y;
                if (!this._dragging && Math.hypot(dx, dy) >= 6) {
                    this._dragging = true;
                    this._setFrame('drag');
                    this._beginAccordion();
                }
                if (this._dragging) {
                    this._physics?.move(x - this._gesture.previousX);
                    this._gesture.previousX = x;
                    const index = Main.layoutManager.monitors.findIndex(monitor =>
                        x >= monitor.x && x < monitor.x + monitor.width &&
                        y >= monitor.y && y < monitor.y + monitor.height);
                    this._clampPosition(this._gesture.originX + dx, this._gesture.originY + dy,
                        index >= 0 ? index : Main.layoutManager.primaryIndex);
                    this._positioned = true;
                }
            }
            return Clutter.EVENT_STOP;
        case Clutter.EventType.BUTTON_RELEASE:
            if (event.get_button() === Clutter.BUTTON_PRIMARY && this._gesture)
                this._endGesture(false);
            else if (event.get_button() === Clutter.BUTTON_SECONDARY) {
                if (this._owner) {
                    this._openContextMenu();
                    return Clutter.EVENT_STOP;
                }
                this._debug = !this._debug;
                this._updateRegions();
                console.log(`[Catjang GNOME] input regions visible: ${this._debug}`);
            }
            return Clutter.EVENT_STOP;
        case Clutter.EventType.SCROLL:
            if (!this._gesture)
                this._play(['scroll', 'scroll-alt'], 840);
            return Clutter.EVENT_STOP;
        case Clutter.EventType.KEY_PRESS:
            if (this._gesture && event.get_key_symbol() === Clutter.KEY_Escape) {
                this._endGesture(true);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        default:
            return Clutter.EVENT_PROPAGATE;
        }
    }

    _endGesture(cancel) {
        const gesture = this._gesture;
        if (!gesture)
            return;
        const dragged = this._dragging;
        if (cancel) this._resetAccordion();
        else if (dragged && this._physics) { this._physics.release(); this._releaseStarted = GLib.get_monotonic_time(); }
        if (cancel && this._actor)
            this._actor.set_position(gesture.originX, gesture.originY);
        this._gesture = null;
        this._dragging = false;
        const grab = this._grab;
        this._grab = null;
        if (this._actor) this._actor.reactive = false;
        grab?.dismiss();
        if (!this._physics || this._mascot === 'cat') this._setFrame('idle');
        this._updateRegions();
        if (!cancel && dragged && this._owner)
            this._controlObject.emit_signal('PositionChanged', new GLib.Variant('(ii)',
                [Math.round(this._actor.x), Math.round(this._actor.y)]));
        if (!cancel && !dragged) {
            this._clicks++;
            this._play(['press-left'], 180);
            console.log(`[Catjang GNOME] pet click ${this._clicks}`);
        }
    }

    _clampPosition(x, y, index) {
        const area = Main.layoutManager.getWorkAreaForMonitor(index);
        this._actor.set_position(
            Math.max(area.x, Math.min(x, area.x + Math.max(0, area.width - this._size))),
            Math.max(area.y, Math.min(y, area.y + Math.max(0, area.height - this._size))));
    }

    _monitorIndex() {
        if (!this._actor || !this._positioned)
            return Main.layoutManager.primaryIndex;
        const x = this._actor.x + this._size / 2;
        const y = this._actor.y + this._size / 2;
        const index = Main.layoutManager.monitors.findIndex(monitor =>
            x >= monitor.x && x < monitor.x + monitor.width &&
            y >= monitor.y && y < monitor.y + monitor.height);
        return index >= 0 ? index : Main.layoutManager.primaryIndex;
    }

    _place() {
        if (!this._actor || !Main.layoutManager.primaryMonitor)
            return;
        this._endGesture(true);
        const index = this._monitorIndex();
        if (index < 0)
            return;
        const area = Main.layoutManager.getWorkAreaForMonitor(index);
        this._clampPosition(this._positioned ? this._actor.x : area.x + area.width - this._size - 16,
            this._positioned ? this._actor.y : area.y + area.height - this._size - 16, index);
        this._syncVisibility();
    }

    _syncVisibility() {
        if (!this._actor)
            return;
        const index = this._monitorIndex();
        const fullscreen = index >= 0 && global.display.get_monitor_in_fullscreen(index);
        const visible = this._requestedVisible && Main.sessionMode.hasWindows && !Main.sessionMode.isLocked &&
            !Main.overview.visible && !fullscreen;
        if (!visible) {
            this._cancelHunting();
            this._menu?.close();
            this._finishStretch();
            this._endGesture(true);
            this._setPurring(false);
            this._stroke = null;
        }
        this._actor.visible = visible && !this._stretchActor;
    }

    disable() {
        if (this._disabling) return;
        this._disabling = true;
        this._detachController();
        this._menu?.destroy();
        this._menu = null;
        this._menuManager = null;
        this._contextItems = null;
        this._controlObject?.unexport();
        this._controlObject = null;
        if (this._animationSource)
            GLib.Source.remove(this._animationSource);
        this._animationSource = 0;
        if (this._typingSubscription)
            Gio.DBus.session.signal_unsubscribe(this._typingSubscription);
        this._typingSubscription = 0;
        this._endGesture(true);
        for (const [object, id] of this._signals ?? [])
            object.disconnect(id);
        this._signals = [];
        this._actor?.destroy();
        this._actor = null;
        this._visual = null;
        this._visualHeat = null;
        this._dragLayer = null;
        this._dragPieces = [];
        this._chainFrames = null;
        this._nameLabel = null;
        this._messageLabel = null;
        this._hearts = [];
        this._steam = [];
        this._stretchFrames = null;
        this._stroke = null;
        this._texture = null;
        this._regions = [];
        this._icons?.clear();
        this._contents?.clear();
        this._frames = null;
        this._effect = null;
        this._frame = null;
        this._clicks = 0;
        this._debug = false;
        this._disabling = false;
    }
}

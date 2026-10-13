import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read, waitFor, command, startDriver, capture} from './integration.js';
import {displayConfig} from './manual.js';

export const METRICS = {};
const output = GLib.getenv('CATJANG_PROTOTYPE_OUTPUT');
const UUID = 'catjang-native@modlovelace.github.io';
const observations = [];
const limitations = ['Virtual pointer and virtual monitors; physical desktop acceptance remains pending'];
function assert(value, message) { if (!value) throw new Error(message); observations.push(message); console.log(`[Catjang matrix] ${message}`); }
const configure = size => ({mascot: 'cat', name: 'Prueba Wayland', nameVisible: true, size});
async function layout(scales, count = 2) {
    const [serial, monitors] = await displayConfig('GetCurrentState');
    let x = 0;
    const logical = monitors.slice(0, count).map((monitor, index) => {
        const mode = monitor[1].find(item => item[6]['is-current']?.unpack()) ?? monitor[1][0];
        const scale = scales[index] ?? 1;
        if (!mode[5].includes(scale)) throw new Error(`Unsupported scale ${scale}: ${JSON.stringify(mode[5])}`);
        const item = [x, 0, scale, 0, index === 0, [[monitor[0][0], mode[0], {}]]];
        x += Math.round(mode[1] / scale);
        return item;
    });
    await displayConfig('ApplyMonitorsConfig', new GLib.Variant('(uua(iiduba(ssa{sv}))a{sv})', [serial, 1, logical, {}]));
    await Scripting.sleep(500);
}
async function click(pointer, x, y, button = Clutter.BUTTON_PRIMARY) {
    pointer.notify_absolute_motion(GLib.get_monotonic_time(), x, y);
    await Scripting.sleep(70);
    pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.PRESSED);
    await Scripting.sleep(70);
    pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.RELEASED);
    await Scripting.sleep(130);
}
async function drag(pointer, pet, x, y, release = true) {
    pointer.notify_absolute_motion(GLib.get_monotonic_time(), pet._actor.x + pet._size / 2, pet._actor.y + pet._size / 2);
    await Scripting.sleep(70);
    pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.PRESSED);
    await Scripting.sleep(70);
    pointer.notify_absolute_motion(GLib.get_monotonic_time(), x, y);
    await Scripting.sleep(100);
    if (release) {
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(150);
    }
}
async function sample(pet) {
    await waitFor(() => !pet._releaseStarted, 'Accordion release did not finish');
    // Freeze an actual rendered frame while comparing the native stage picks.
    pet._play(['idle'], 10000);
    await Scripting.sleep(80); // Allow stage paint/pick caches to use the selected frame.
    const pixbuf = GdkPixbuf.Pixbuf.new_from_file(`${pet.path}/assets/${pet._frames.idle.file}`);
    const pixels = pixbuf.get_pixels();
    const [x, y] = pet._actor.get_transformed_position();
    const size = pet._size;
    let count = 0;
    for (let sy = 2; sy < 200; sy += 8) for (let sx = 2; sx < 200; sx += 8) {
        const alpha = pixels[sy * pixbuf.get_rowstride() + sx * 4 + 3];
        const picked = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x + (sx + 0.5) * size / 200, y + (sy + 0.5) * size / 200);
        if (Boolean(picked && pet._actor.contains(picked)) !== (alpha >= 16)) throw new Error(`Scaled native pick mismatch: size=${size} sample=${sx},${sy} alpha=${alpha} pet=${x},${y} picked=${picked?.name} bounds=${picked?.get_transformed_position()}/${picked?.get_transformed_size()}`);
        count++;
    }
    return count;
}
export async function run() {
    // First D-Bus call applies the helper option parsed after its initial timer.
    await Scripting.waitTestWindows();
    const pointer = Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    await Scripting.sleep(400);
    Main.overview.hide();
    await Scripting.sleep(500);
    const dir = `${output}/driver`;
    let application = null;
    let witness = null;
    try {
        await layout([1, 1]);
        assert(Main.layoutManager.monitors.length === 2, 'Two real virtual Wayland monitors are active');
        await waitFor(() => Main.extensionManager.lookup(UUID)?.stateObj?._controlObject, 'GNOME extension was not ready');
        application = startDriver(dir);
        await waitFor(() => read(`${dir}/ready.json`), 'Application did not attach in monitor matrix');
        let pet = Main.extensionManager.lookup(UUID).stateObj;
        await command(dir, 'hide');
        witness = Gio.Subprocess.new(['python3', GLib.getenv('CATJANG_PROTOTYPE_WITNESS')], Gio.SubprocessFlags.NONE);
        await Scripting.sleep(1500);
        for (const size of [40, 140, 400]) {
            await command(dir, 'configure', configure(size));
            await Scripting.sleep(200);
            assert(await sample(pet) === 625, `Native alpha geometry matches 625 stage picks at size ${size}`);
        }
        await command(dir, 'configure', configure(200));
        const second = Main.layoutManager.monitors[1];
        await drag(pointer, pet, second.x + 250, second.y + 260);
        assert(pet._actor.x >= second.x && !pet._grab, 'Drag crosses to the second monitor and releases capture');
        const saved = await command(dir, 'query');
        const secondPosition = {x: pet._actor.x, y: pet._actor.y};
        assert(saved.saved.petPosition.x === secondPosition.x, 'Application persists a position on the second monitor');
        await command(dir, 'configure', configure(200));
        assert(pet._actor.x === secondPosition.x && pet._actor.y === secondPosition.y, 'Updating settings preserves the second-monitor position');
        await command(dir, 'reconnect');
        assert(pet._actor.x === secondPosition.x && pet._actor.y === secondPosition.y && pet._owner, 'Helper reconnect preserves the second-monitor position');
        const client = global.get_window_actors().map(actor => actor.meta_window).find(win => win.get_title() === 'Catjang input witness');
        client.unmaximize();
        client.move_to_monitor(1);
        client.make_fullscreen();
        client.activate(global.get_current_time());
        await Scripting.sleep(600);
        assert(!pet._actor.visible && !pet._grab, 'Fullscreen on the pet monitor hides the pet');
        client.unmake_fullscreen();
        await Scripting.sleep(400);
        assert(pet._actor.visible, 'Leaving fullscreen restores the pet');
        client.move_to_monitor(0);
        client.make_fullscreen();
        client.activate(global.get_current_time());
        await Scripting.sleep(600);
        assert(pet._actor.visible, 'Fullscreen on another monitor preserves the pet');
        client.unmake_fullscreen();
        await Scripting.sleep(400);
        for (const scale of [1.25, 1.5, 2]) {
            await layout([scale, 1]);
            const first = Main.layoutManager.monitors[0];
            await drag(pointer, pet, first.x + 220, first.y + 220);
            assert(pet._actor.visible && await sample(pet) === 625, `Real monitor scale ${scale} preserves native alpha geometry`);
            await capture(`scale-${scale}.png`);
        }
        await layout([1, 1]);
        await command(dir, 'configure', configure(200));
        const secondAgain = Main.layoutManager.monitors[1];
        await drag(pointer, pet, secondAgain.x + 240, 240, false);
        assert(pet._grab && pet._dragging, 'Monitor removal is exercised during active dragging');
        await layout([1], 1);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(150);
        const area = Main.layoutManager.getWorkAreaForMonitor(0);
        assert(!pet._grab && pet._actor.x >= area.x && pet._actor.x + pet._size <= area.x + area.width, 'Removing a monitor cancels capture and relocates the pet into the remaining work area');
        await command(dir, 'hide');
        await click(pointer, pet._actor.x + 100, pet._actor.y + 100, Clutter.BUTTON_SECONDARY);
        assert(pet._menu?.isOpen, 'Native right click opens a GNOME context menu');
        const preferencesItem = pet._contextItems.get('preferences');
        const [menuX, menuY] = preferencesItem.get_transformed_position();
        const [menuWidth, menuHeight] = preferencesItem.get_transformed_size();
        await click(pointer, menuX + menuWidth / 2, menuY + menuHeight / 2, Clutter.BUTTON_PRIMARY);
        const rightClick = await command(dir, 'query');
        assert(rightClick.windowVisible && !pet._menu.isOpen, 'Context menu opens the real preferences and releases its modal grab');
        for (const pose of ['typing', 'scroll', 'jump', 'stretch']) {
            await command(dir, 'pose', pose);
            const prefix = pose === 'typing' ? 'press-' : pose;
            assert(pet._frame.startsWith(prefix), `Real preferences IPC drives ${pose}`);
        }
        await command(dir, 'submit-form', configure(180));
        const submitted = await command(dir, 'query');
        assert(submitted.saved.petSize === 180 && pet._size === 180 && submitted.saved.catName === 'Prueba Wayland', 'Submitting the actual preferences form saves and renders the selected settings');
        await command(dir, 'hide');
        await Scripting.sleep(3100);
        const petX = pet._actor.x;
        const petY = pet._actor.y;
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), petX - 100, petY + 70);
        await Scripting.sleep(180);
        const leftTexture = pet._texture;
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), petX + pet._size + 100, petY + 70);
        await Scripting.sleep(180);
        assert(pet._look.startsWith('1,') && pet._texture !== leftTexture, 'Native pupils follow the real pointer across the pet');
        await capture('eye-tracking.png');
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), petX + pet._size * .4, petY + pet._size * .4);
        await Scripting.sleep(300);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), petX - 100, petY - 100);
        await Scripting.sleep(300);
        assert(!pet._purring && !pet._hearts.some(heart => heart.visible), 'A brief pass over the head does not trigger petting');
        for (let index = 0; index < 13; index++) {
            pointer.notify_absolute_motion(GLib.get_monotonic_time(), petX + pet._size * (index % 2 ? .52 : .34), petY + pet._size * .42);
            await Scripting.sleep(150);
        }
        assert(pet._purring && pet._frame.startsWith('purr') && pet._hearts.every(heart => heart.visible), 'Deliberate head strokes trigger closed eyes and animated hearts');
        const audio = await command(dir, 'query');
        assert(!audio.audio.paused && !audio.audio.error && audio.audio.time > 0, 'Petting signal reaches the real preferences renderer and starts decoded purring audio');
        await capture('petting.png');
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), petX - 100, petY - 100);
        await Scripting.sleep(350);
        const stoppedAudio = await command(dir, 'query');
        assert(!pet._purring && pet._hearts.every(heart => !heart.visible) && stoppedAudio.audio.paused, 'Leaving the head clears hearts, petting and purring audio');
        await command(dir, 'typing-burst', {count: 5, delay: 350});
        assert(pet._heat < .005, 'Slow local typing below four keys per second does not heat the pet');
        await command(dir, 'typing-burst', {count: 50, delay: 50});
        assert(pet._heat > .8 && pet._steam.some(steam => steam.visible), 'Fast real Electron input builds progressive red heat and animated steam');
        assert(pet._visualHeat.opacity > 180 && pet._maskTexture,
            'Fast input raises the anatomical red overlay continuously while white materials remain in the base texture');
        await capture('typing-heat.png');
        const peak = pet._heat;
        await Scripting.sleep(950);
        assert(pet._heat > 0 && pet._heat < peak, 'Stopping typing cools gradually rather than clearing red abruptly');
        await Scripting.sleep(2600);
        assert(pet._heat === 0 && !pet._steam.some(steam => steam.visible), 'Cooling finishes without red texture or residual steam');
        const originalPosition = {x: pet._actor.x, y: pet._actor.y};
        await command(dir, 'hide');
        client.maximize();
        await Scripting.sleep(300);
        await command(dir, 'pose', 'stretch');
        const monitor = Main.layoutManager.monitors[pet._monitorIndex()];
        assert(pet._stretchActor && !pet._actor.visible && !pet._stretchActor.reactive && pet._stretchActor.width > monitor.width * .5,
            'Stretch creates a large native overlay on the pet monitor and hides the normal sprite');
        const firstStretchFrame = pet._stretchIndex;
        await Scripting.sleep(500);
        assert(pet._stretchIndex !== firstStretchFrame, 'Fullscreen stretch advances the canonical limb, body and eye keyframes');
        await capture('fullscreen-stretch.png');
        const beforeClicks = Gio.File.new_for_path(`${output}/witness-events.jsonl`).load_contents(null)[1].length;
        await click(pointer, monitor.x + monitor.width / 2, monitor.y + monitor.height / 2);
        const afterClicks = Gio.File.new_for_path(`${output}/witness-events.jsonl`).load_contents(null)[1].length;
        assert(afterClicks > beforeClicks && !pet._grab, 'The fullscreen stretch overlay lets native clicks reach the underlying Wayland client');
        await Scripting.sleep(2700);
        assert(!pet._stretchActor && pet._actor.visible && pet._actor.x === originalPosition.x && pet._actor.y === originalPosition.y,
            'Stretch ends after three seconds and restores the original size and position');
        const beforeInvalid = (await command(dir, 'query')).saved;
        let rejected = false;
        try { await command(dir, 'configure', {...configure(200), size: 401}); } catch { rejected = true; }
        const afterInvalid = (await command(dir, 'query')).saved;
        assert(rejected && afterInvalid.petSize === beforeInvalid.petSize && pet._size === beforeInvalid.petSize, 'Invalid preferences are rejected without changing persisted settings');
        await command(dir, 'kill-helper');
        await waitFor(() => !pet._owner, 'Killed helper kept ownership');
        assert(!pet._actor.visible && !pet._grab, 'Helper crash removes the pet and releases capture');
        await command(dir, 'reconnect');
        await waitFor(() => pet._owner && pet._actor.visible, 'Helper did not reconnect');
        assert(Main.layoutManager.uiGroup.get_children().filter(actor => actor.name === 'catjang-gnome-prototype').length === 1, 'Reconnection creates no duplicate mascot');
        await command(dir, 'reconnect-burst');
        await waitFor(() => pet._owner && pet._actor.visible, 'Rapid reconnect did not restore ownership');
        const rapid = await command(dir, 'query');
        assert(rapid.state.connected, 'Rapid repeated reconnect finishes with one usable controller');
        await command(dir, 'hide');
        await drag(pointer, pet, pet._actor.x + 140, pet._actor.y + 140, false);
        assert(pet._grab, 'Extension restart is exercised while the application is dragging');
        Main.extensionManager.disableExtension(UUID);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(5300);
        const disabled = await command(dir, 'query');
        assert(!pet._actor && !pet._grab && !disabled.state.connected, 'Disabling the extension clears capture and the application reports disconnection');
        Main.extensionManager.enableExtension(UUID);
        await waitFor(() => pet._actor && pet._controlObject, 'Extension did not re-enable');
        await command(dir, 'reconnect');
        await waitFor(() => pet._owner && pet._actor.visible, 'Application did not reconnect to re-enabled extension');
        assert(!pet._grab, 'Re-enabling and reconnecting restore the pet without stale capture');
        // Use GNOME's real session-mode transition in the isolated shell only.
        Main.sessionMode.pushMode('unlock-dialog');
        await Scripting.sleep(500);
        assert(!pet._actor || !pet._actor.visible, 'Locked session mode removes the mascot');
        Main.sessionMode.popMode('unlock-dialog');
        await Scripting.sleep(700);
        pet = Main.extensionManager.lookup(UUID).stateObj;
        await command(dir, 'reconnect');
        await waitFor(() => pet._owner && pet._actor.visible, 'Application did not recover after unlock');
        assert(!pet._grab && pet._actor.visible, 'Unlock and explicit reconnect recover without active capture');
        await capture('matrix-final-scene.png');
        await command(dir, 'quit');
        await waitFor(() => !pet._owner && !pet._actor.visible, 'Matrix Quit left the pet active');
        application = null;
        assert(!pet._grab, 'Matrix finishes without a native capture or owner');
        limitations.push('Lock test uses the real GNOME session-mode transition; password dialog and physical screen lock require human acceptance');
        GLib.file_set_contents(`${output}/matrix-observations.json`, JSON.stringify({timestampUtc: GLib.DateTime.new_now_utc().format_iso8601(), observations, limitations}, null, 2));
    } finally {
        application?.force_exit();
        witness?.force_exit();
        await Scripting.sleep(500);
    }
}

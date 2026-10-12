import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import St from 'gi://St';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

export const METRICS = {};
const UUID = 'catjang-prototype@modlovelace.github.io';
const output = GLib.getenv('CATJANG_PROTOTYPE_OUTPUT');
const observations = [];

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
    observations.push(message);
}
function readText(file) {
    const [, bytes] = Gio.File.new_for_path(file).load_contents(null);
    return new TextDecoder().decode(bytes);
}
function witnessEvents() {
    const file = `${output}/witness-events.jsonl`;
    if (!GLib.file_test(file, GLib.FileTest.EXISTS))
        return [];
    return readText(file).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}
function witnessClicks() {
    return witnessEvents().filter(event => event.phase === 'released').length;
}
async function click(pointer, x, y, button = Clutter.BUTTON_PRIMARY) {
    pointer.notify_absolute_motion(GLib.get_monotonic_time(), x, y);
    await Scripting.sleep(100);
    pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.PRESSED);
    await Scripting.sleep(60);
    pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.RELEASED);
    await Scripting.sleep(150);
}
async function capture(name, x, y, width, height) {
    const stream = Gio.File.new_for_path(`${output}/${name}`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    try {
        await new Shell.Screenshot().screenshot_area(x, y, width, height, stream);
    } finally {
        stream.close(null);
    }
}

export async function run() {
    // First D-Bus call applies the helper option parsed after its initial timer.
    await Scripting.waitTestWindows();
    // Advertise the headless seat's pointer before the Wayland client binds it.
    const pointer = Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    const keyboard = Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
    await Scripting.sleep(300);
    const witness = Gio.Subprocess.new(['python3', GLib.getenv('CATJANG_PROTOTYPE_WITNESS')], Gio.SubprocessFlags.NONE);
    try {
        await Scripting.sleep(2000);
        Main.overview.hide();
        await Scripting.sleep(600);
        const extension = Main.extensionManager.lookup(UUID);
        assert(extension?.stateObj?._actor, 'extension created a native actor');
        const pet = extension.stateObj;
        const actor = pet._actor;
        const [x, y] = actor.get_transformed_position();
        const width = actor.width;
        const height = actor.height;
        assert(actor.visible && !actor.reactive, 'painted parent is visible and non-reactive');
        assert(pet._visual instanceof St.Icon && pet._visual.gicon instanceof Gio.FileIcon, 'sprite uses the native GNOME file-icon renderer');
        assert(global.display.focus_window?.get_client_type() === Meta.WindowClientType.WAYLAND, 'underlying witness is a real Wayland client');
        const focus = global.display.focus_window;
        const pixbuf = GdkPixbuf.Pixbuf.new_from_file(`${extension.path}/assets/${pet._frames[pet._frame].file}`);
        const pixels = pixbuf.get_pixels();
        let sampled = 0;
        for (let py = 1; py < height; py += 4) {
            for (let px = 1; px < width; px += 4) {
                const alpha = pixels[py * pixbuf.get_rowstride() + px * 4 + 3];
                const picked = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x + px + 0.5, y + py + 0.5);
                const onPet = picked && actor.contains(picked);
                if (Boolean(onPet) !== (alpha >= 16))
                    throw new Error(`Native pick disagrees with PNG alpha at ${px},${py}: alpha ${alpha}, actor ${picked?.name}`);
                sampled++;
            }
        }
        observations.push(`native compositor picks agree with PNG alpha at ${sampled} samples`);
        await capture('native-pet.png', x, y, width, height);
        const still = GdkPixbuf.Pixbuf.new_from_file(`${output}/native-pet.png`).get_pixels();
        // Two points in a periodic animation can paint the same pose. Observe
        // a bounded sequence of actual compositor frames instead of one delay.
        let idleChanged = false;
        for (let attempt = 0; attempt < 10 && !idleChanged; attempt++) {
            await Scripting.sleep(140);
            await capture('native-idle-motion.png', x, y, width, height);
            const moving = GdkPixbuf.Pixbuf.new_from_file(`${output}/native-idle-motion.png`).get_pixels();
            idleChanged = still.some((value, index) => value !== moving[index]);
        }
        assert(idleChanged, 'idle animation changes pixels painted by the native compositor');

        await click(pointer, 200, 200);
        assert(witnessClicks() === 1, 'control click outside pet reaches Wayland client');
        const clicksBefore = witnessClicks();
        // This transparent pixel is INSIDE the pet's 200x200 drawing rectangle.
        await click(pointer, x + 2, y + 2);
        assert(witnessClicks() === clicksBefore + 1, 'transparent sprite corner delivers its click to the Wayland client');
        const hx = x + 100;
        const hy = y + 100;
        const belowBefore = witnessEvents().length;
        await click(pointer, hx, hy);
        assert(pet._clicks === 1 && witnessEvents().length === belowBefore, 'opaque sprite press and release reach only the pet');
        assert(global.display.focus_window === focus, 'pet click preserves the client keyboard focus');
        assert(pet._frame.startsWith('press-'), 'pet click starts the canonical animated press poses');
        await capture('native-click-pose.png', x, y, width, height);
        await Scripting.sleep(750);
        await click(pointer, hx, hy, Clutter.BUTTON_SECONDARY);
        assert(pet._debug, 'right click enables visible input-region diagnostics');
        await capture('native-input-regions.png', x, y, width, height);
        await click(pointer, hx, hy, Clutter.BUTTON_SECONDARY);
        assert(!pet._debug, 'right click turns diagnostics off');

        keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_a, Clutter.KeyState.PRESSED);
        await Scripting.sleep(60);
        keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_a, Clutter.KeyState.RELEASED);
        await Scripting.sleep(80);
        assert(pet._frame.startsWith('press-') && witnessEvents().some(event => event.phase === 'text' && event.length === 1),
            'witness typing intent animates the pet while its Wayland entry receives text');
        await Scripting.sleep(350);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), hx, hy);
        await Scripting.sleep(100);
        pointer.notify_discrete_scroll(GLib.get_monotonic_time(), Clutter.ScrollDirection.DOWN, Clutter.ScrollSource.WHEEL);
        await Scripting.sleep(100);
        assert(pet._frame.startsWith('scroll'), 'wheel over the pet starts the canonical scroll animation');
        await capture('native-scroll-pose.png', x, y, width, height);
        await Scripting.sleep(900);

        const inputBeforeDrag = witnessEvents().length;
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), hx, hy);
        await Scripting.sleep(80);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.PRESSED);
        await Scripting.sleep(80);
        assert(pet._grab && pet._gesture, 'press obtains native capture for the drag sequence');
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), hx - 260, hy - 200);
        await Scripting.sleep(100);
        assert(pet._dragging && pet._frame.startsWith('drag') && actor.x === x - 260 && actor.y === y - 200,
            'native motion moves the pet and switches to a suspended pose');
        await capture('native-drag-pose.png', actor.x, actor.y, width, height);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), 20, 40);
        await Scripting.sleep(100);
        assert(actor.x === 0 && actor.y === Main.layoutManager.getWorkAreaForMonitor(0).y,
            'fast motion outside the silhouette keeps capture and clamps the pet into the work area');
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(80);
        assert(!pet._grab && !pet._gesture && !actor.reactive && witnessEvents().length === inputBeforeDrag,
            'release outside the sprite clears capture without leaking the drag to the client');
        const previousLocationClicks = witnessClicks();
        await click(pointer, hx, hy);
        assert(witnessClicks() === previousLocationClicks + 1, 'old pet position returns input to the Wayland client after dragging');
        const newX = actor.x;
        const newY = actor.y;
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), newX + 100, newY + 100);
        await Scripting.sleep(80);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.PRESSED);
        await Scripting.sleep(80);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), newX + 280, newY + 280);
        await Scripting.sleep(100);
        keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_Escape, Clutter.KeyState.PRESSED);
        await Scripting.sleep(80);
        keyboard.notify_keyval(GLib.get_monotonic_time(), Clutter.KEY_Escape, Clutter.KeyState.RELEASED);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(100);
        assert(!pet._grab && !pet._gesture && actor.x === newX && actor.y === newY,
            'Escape cancels dragging and restores the previous position');

        Main.overview.show();
        await Scripting.sleep(350);
        assert(!actor.visible, 'pet hides during overview');
        Main.overview.hide();
        await Scripting.sleep(500);
        assert(actor.visible, 'pet returns after overview');

        const [finalX, finalY] = actor.get_transformed_position();
        await capture('native-before-disable.png', finalX, finalY, width, height);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), finalX + 100, finalY + 100);
        await Scripting.sleep(80);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.PRESSED);
        await Scripting.sleep(80);
        assert(pet._grab, 'teardown is exercised with an active native input capture');
        Main.extensionManager.disableExtension(UUID);
        await Scripting.sleep(300);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(80);
        assert(pet._actor === null && pet._signals.length === 0 && pet._animationSource === 0 && !pet._grab && pet._typingSubscription === 0, 'disable removes actors, external signals, animation timer and native capture');
        assert(!Main.layoutManager.uiGroup.get_children().some(child => child.name === 'catjang-gnome-prototype'), 'no pet remains in compositor chrome');
        await capture('native-without-pet.png', finalX, finalY, width, height);
        const before = GdkPixbuf.Pixbuf.new_from_file(`${output}/native-before-disable.png`).get_pixels();
        const after = GdkPixbuf.Pixbuf.new_from_file(`${output}/native-without-pet.png`).get_pixels();
        let changed = 0;
        for (let i = 0; i < before.length; i++) {
            if (before[i] !== after[i]) changed++;
        }
        assert(changed > 100, 'compositor capture contains the painted sprite and removes it on disable');
        const count = witnessClicks();
        await click(pointer, finalX + 100, finalY + 100);
        assert(witnessClicks() === count + 1, 'former opaque pet area delivers clicks to client after disable');
        Main.extensionManager.enableExtension(UUID);
        await Scripting.sleep(400);
        assert(pet._actor?.visible && Main.layoutManager.uiGroup.get_children().filter(child => child.name === 'catjang-gnome-prototype').length === 1, 're-enable creates exactly one pet');
        Main.extensionManager.disableExtension(UUID);
        await Scripting.sleep(200);
        const report = JSON.stringify({timestampUtc: GLib.DateTime.new_now_utc().format_iso8601(), backend: `GNOME ${Config.PACKAGE_VERSION} headless Wayland`, observations,
            limitations: ['virtual input; physical pointer and actual desktop still need human observation', 'drag and frame animations are basic; full spring physics remains pending; Electron is exercised by the separate integration probe']}, null, 2);
        GLib.file_set_contents(`${output}/native-observations.json`, report);
        console.log(`[Catjang GNOME] native observations recorded: ${observations.length}`);
    } finally {
        witness.force_exit();
        await new Promise((resolve, reject) => witness.wait_async(null, (process, result) => {
            try {
                process.wait_finish(result);
                resolve();
            } catch (error) {
                reject(error);
            }
        }));
        // Client input-method cleanup must complete before Shell destroys its UI.
        await Scripting.sleep(300);
    }
}

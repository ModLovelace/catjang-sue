import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {launchApplication} from './application.js';

export const METRICS = {};
const observations = [];
const output = GLib.getenv('CATJANG_PROTOTYPE_OUTPUT');
let commandId = 0;
function assert(value, message) { if (!value) throw new Error(message); observations.push(message); }
export function read(file) {
    if (!GLib.file_test(file, GLib.FileTest.EXISTS)) return null;
    const [, bytes] = Gio.File.new_for_path(file).load_contents(null);
    return JSON.parse(new TextDecoder().decode(bytes));
}
export async function waitFor(predicate, message, {interval = 100, tries = 120} = {}) {
    for (let attempt = 0; attempt < tries; attempt++) {
        const value = predicate();
        if (value) return value;
        await Scripting.sleep(interval);
    }
    throw new Error(message);
}
export async function command(dir, action, settings) {
    const id = ++commandId;
    GLib.file_set_contents(`${dir}/command.json`, JSON.stringify({id, action, settings}));
    const reply = await waitFor(() => {
        const item = read(`${dir}/reply.json`);
        return item?.id === id ? item : null;
    }, `Application did not complete ${action}`, {interval: 20, tries: 600});
    if (!reply.ok) throw new Error(reply.error);
    return reply;
}
export function startDriver(dir, {agents=false,autoAgents=false}={}) {
    GLib.mkdir_with_parents(dir, 0o700);
    for (const file of ['ready.json', 'reply.json', 'command.json', 'driver-error.json']) {
        const stale = Gio.File.new_for_path(`${dir}/${file}`);
        if (stale.query_exists(null)) stale.delete(null);
    }
    const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.NONE});
    launcher.setenv('CATJANG_GNOME_INPUT_SOURCE', 'local', true);
    launcher.setenv('CATJANG_LINUX_BACKEND', 'gnome', true);
    launcher.setenv('CATJANG_ENABLE_AGENT_INTEGRATIONS', '0', true);
    if(agents)launcher.unsetenv('CATJANG_ENABLE_AGENT_INTEGRATIONS');
    if(autoAgents)launcher.setenv('CATJANG_GNOME_QA_AUTOCONNECT','1',true);
    if(agents){
        const home=`${GLib.getenv('XDG_RUNTIME_DIR')}/ide-home`;GLib.mkdir_with_parents(home,0o700);
        launcher.setenv('HOME',home,true);launcher.setenv('CATJANG_IDE_CONFIG_HOME',`${home}/.config`,true);
    }
    launcher.setenv('CATJANG_GNOME_DRIVER_DIR', dir, true);
    launcher.setenv('CATJANG_GNOME_QA_PROFILE', `${GLib.getenv('XDG_RUNTIME_DIR')}/catjang-qa-profile`, true);
    return launcher.spawnv([GLib.getenv('CATJANG_GNOME_ELECTRON'),
        `${GLib.getenv('CATJANG_GNOME_PROJECT')}/native/gnome/probes/electron-driver.js`, '--ozone-platform=wayland']);
}
export async function capture(name) {
    const monitor = Main.layoutManager.primaryMonitor;
    const stream = Gio.File.new_for_path(`${output}/${name}`).replace(null, false, Gio.FileCreateFlags.NONE, null);
    try { await new Shell.Screenshot().screenshot_area(monitor.x, monitor.y, monitor.width, monitor.height, stream); }
    finally { stream.close(null); }
}
export async function run() {
    // First D-Bus call applies the helper option parsed after its initial timer.
    await Scripting.waitTestWindows();
    let extensionsService = null;
    const pointer = Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    await Scripting.sleep(500);
    Main.overview.hide();
    await Scripting.sleep(500);
    const pet = Main.extensionManager.lookup('catjang-native@modlovelace.github.io')?.stateObj;
    assert(pet?._actor && !pet._actor.visible && !pet._owner, 'application extension is dormant before licensed Electron starts');
    // Reproduce slow GNOME startup on the private bus. The owner must connect
    // without a manual reconnect when its control object becomes available.
    const readyAt=GLib.get_monotonic_time()+2500000;
    pet._controlObject.unexport();
    GLib.timeout_add(GLib.PRIORITY_DEFAULT,2500,()=>{
        pet._controlObject.export(Gio.DBus.session,'/dev/catjang/GnomePet');return GLib.SOURCE_REMOVE;
    });
    const firstDir = `${output}/first`;
    let first = startDriver(firstDir);
    let second = null;
    try {
        const initial = await waitFor(() => read(`${firstDir}/ready.json`), 'Actual main.js failed to attach; inspect application logs');
        assert(GLib.get_monotonic_time()>=readyAt && initial.connected,'startup recovers automatically when GNOME registers its control object after Electron launches');
        assert(initial.connected && pet._owner && pet._actor.visible, 'real licensed main.js attaches through the Python helper');
        const changed = await command(firstDir, 'configure', {mascot: 'cat', name: 'Ubuntu integrado', nameVisible: true, size: 140});
        assert(changed.saved.petSize === 140 && changed.saved.catName === 'Ubuntu integrado' && pet._size === 140 && pet._nameLabel.text === 'Ubuntu integrado',
            'real preferences IPC updates native size/name and persists existing project settings');
        let rejected = false;
        await new Promise(resolve => Gio.DBus.session.call('org.gnome.Shell', '/dev/catjang/GnomePet', 'dev.catjang.GnomePet1', 'Detach',
            null, null, Gio.DBusCallFlags.NONE, 3000, null, (connection, result) => {
                try { connection.call_finish(result); } catch { rejected = true; }
                resolve();
            }));
        assert(rejected && pet._owner && pet._actor.visible, 'another bus connection cannot detach the application mascot');
        await command(firstDir, 'animate');
        assert(pet._frame.startsWith('jump'), 'preferences button drives a native animation through the real IPC and D-Bus chain');
        await Scripting.sleep(750);
        await command(firstDir, 'hide');
        assert(pet._actor.visible, 'closing preferences keeps the mascot and application active');
        const [x, y] = pet._actor.get_transformed_position();
        const pointX = x + 70;
        const pointY = y + 70;
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), pointX, pointY);
        await Scripting.sleep(100);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.PRESSED);
        await Scripting.sleep(100);
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), pointX - 120, pointY - 100);
        await Scripting.sleep(100);
        pointer.notify_button(GLib.get_monotonic_time(), Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(300);
        const dragged = await command(firstDir, 'query');
        const position = dragged.saved.petPosition;
        assert(position.x === pet._actor.x && position.y === pet._actor.y && position.x === x - 120,
            'native drag signal persists compositor coordinates in project settings');
        await capture('integrated-native-scene.png');
        await command(firstDir, 'quit');
        await waitFor(() => !pet._owner && !pet._actor.visible, 'Quit did not release the native mascot');
        assert(!pet._grab, 'application Quit releases the helper owner, visibility and capture');
        first = null;
        const secondDir = `${output}/restart`;
        second = startDriver(secondDir);
        const restored = await waitFor(() => read(`${secondDir}/ready.json`), 'Application did not restart');
        assert(restored.size === 140 && restored.name === 'Ubuntu integrado' && pet._actor.x === position.x && pet._actor.y === position.y,
            'restarting actual main.js restores native name, size and saved position');
        second.force_exit();
        second = null;
        await waitFor(() => !pet._owner && !pet._actor.visible, 'Crashed Electron left its native mascot active');
        assert(!pet._grab && pet._ownerWatch === 0, 'Electron crash closes the helper pipe and leaves no native owner or active capture');
        const standard = launchApplication();
        await waitFor(() => pet._owner && pet._actor.visible, 'Standard project entry point did not attach');
        assert(pet._size === 200 && pet._nameLabel.text === 'Catjang', 'standard Electron project entry point loads the native backend with normal package metadata');
        standard.send_signal(15);
        await waitFor(() => !pet._owner && !pet._actor.visible, 'Standard project did not release its owner');
        for (const [variable, label] of [['CATJANG_GNOME_PACKAGED', 'Linux packaged'],
            ['CATJANG_GNOME_APPIMAGE', 'AppImage extraction runtime'], ['CATJANG_GNOME_DEB_BINARY', 'Extracted deb'], ['CATJANG_GNOME_INSTALLER_BINARY', 'Manual installer laboratory']]) {
            const packagedBinary = GLib.getenv(variable);
            if (!packagedBinary) continue;
            if (variable === 'CATJANG_GNOME_INSTALLER_BINARY') {
                // No automatic service activation on this private bus. Start
                // GNOME's real, short-lived facade immediately before the CLI.
                extensionsService = Gio.Subprocess.new(['gjs','-m','/usr/share/gnome-shell/org.gnome.Shell.Extensions'],Gio.SubprocessFlags.NONE);
                await Scripting.sleep(250);
            }
            const packaged = launchApplication(packagedBinary, true);
            await waitFor(() => pet._owner && pet._actor.visible, 'Packaged application did not attach');
            assert(pet._size === 200, `${label} entry point loads its external GNOME bridge and preferences resources`);
            console.log(`[Catjang integration] ${label} attached`);
            // Extraction-mode AppImage has a wrapper PID. Signal the actual
            // owner's parent, not a stale window that has the same title.
            const [helperPid] = Gio.DBus.session.call_sync('org.freedesktop.DBus', '/org/freedesktop/DBus',
                'org.freedesktop.DBus', 'GetConnectionUnixProcessID', new GLib.Variant('(s)', [pet._owner]),
                new GLib.VariantType('(u)'), Gio.DBusCallFlags.NONE, 3000, null).deep_unpack();
            const [, statusBytes] = GLib.file_get_contents(`/proc/${helperPid}/status`);
            const parent = new TextDecoder().decode(statusBytes).match(/^PPid:\s+(\d+)$/m);
            const applicationPid = Number(parent?.[1]);
            if (!Number.isInteger(applicationPid) || applicationPid <= 1) throw new Error('Native owner has no valid application parent');
            const pid = await waitFor(() => {
                const window = global.get_window_actors().map(actor => actor.meta_window)
                    .find(item => item.get_title() === 'Catjang — Configuración' && item.get_pid() === applicationPid);
                const candidate = window?.get_pid();
                return Number.isInteger(candidate) && candidate > 1 ? candidate : null;
            }, 'No mapped isolated packaged application PID');
            assert(pid === applicationPid, `${label} preferences are mapped by the application controlling the native owner`);
            Gio.Subprocess.new(['kill', '-TERM', String(pid)], Gio.SubprocessFlags.NONE);

            await waitFor(() => !pet._owner && !pet._actor.visible, 'Packaged application did not release its owner');
        }
        GLib.file_set_contents(`${output}/application-observations.json`, JSON.stringify({timestampUtc: GLib.DateTime.new_now_utc().format_iso8601(),
            observations, limitations: ['isolated GNOME; installation and full application acceptance on the regular desktop remain pending',
                'Catjang only; owned-kernel/global keyboard checks and accordion physics are verified separately; other mascots are verified by the mascot probe; screen recording remains pending']}, null, 2));
        console.log(`[Catjang GNOME] real application integration observations: ${observations.length}`);
    } finally {
        extensionsService?.force_exit();
        first?.force_exit();
        second?.force_exit();
        await Scripting.sleep(500);
    }
}

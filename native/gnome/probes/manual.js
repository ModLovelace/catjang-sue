import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

export const METRICS = {};
export async function displayConfig(method, parameters = null) {
    return new Promise((resolve, reject) => {
        Gio.DBus.session.call('org.gnome.Mutter.DisplayConfig',
            '/org/gnome/Mutter/DisplayConfig', 'org.gnome.Mutter.DisplayConfig',
            method, parameters, null, Gio.DBusCallFlags.NONE, 5000, null,
            (connection, result) => {
                try {
                    resolve(connection.call_finish(result).deep_unpack());
                } catch (error) {
                    reject(error);
                }
            });
    });
}

export async function showPreviewMonitor() {
    // Test-tool needs a bootstrap monitor to start its automation. Devkit then
    // creates its own streamed monitor. Keep only the latter active so the pet
    // and witness appear in the actual preview rather than an invisible screen.
    for (let attempt = 0; attempt < 30; attempt++) {
        const [serial, monitors] = await displayConfig('GetCurrentState');
        const preview = monitors.find(monitor => monitor[0][2] === 'Virtual remote monitor');
        if (preview) {
            const mode = preview[1].find(candidate => candidate[6]['is-current']?.unpack()) ?? preview[1][0];
            const parameters = new GLib.Variant('(uua(iiduba(ssa{sv}))a{sv})',
                [serial, 1, [[0, 0, 1, 0, true, [[preview[0][0], mode[0], {}]]]], {}]);
            await displayConfig('ApplyMonitorsConfig', parameters);
            console.log(`[Catjang GNOME] preview is sole primary monitor: ${preview[0][0]}`);
            return;
        }
        await Scripting.sleep(200);
    }
    throw new Error('Devkit did not create its preview monitor');
}

export async function run() {
    // First D-Bus call applies the helper option parsed after its initial timer.
    await Scripting.waitTestWindows();
    const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.NONE});
    launcher.setenv('WAYLAND_DISPLAY', GLib.getenv('CATJANG_PROTOTYPE_PARENT_DISPLAY'), true);
    launcher.setenv('GDK_BACKEND', 'wayland', true);
    const viewer = launcher.spawnv([GLib.getenv('CATJANG_PROTOTYPE_VIEWER')]);
    const viewerFinished = new Promise((resolve, reject) => {
        viewer.wait_async(null, (process, result) => {
            try {
                process.wait_finish(result);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
    const witness = Gio.Subprocess.new(['python3', GLib.getenv('CATJANG_PROTOTYPE_WITNESS')], Gio.SubprocessFlags.NONE);
    try {
        await showPreviewMonitor();
        await Scripting.sleep(1500);
        Main.overview.hide();
        await Scripting.sleep(500);
        const monitor = Main.layoutManager.primaryMonitor;
        const pet = Main.extensionManager.lookup('catjang-prototype@modlovelace.github.io')?.stateObj?._actor;
        const witnessWindow = global.get_window_actors().map(actor => actor.meta_window)
            .find(window => window.get_title() === 'Catjang input witness');
        if (Main.layoutManager.monitors.length !== 1 || !pet?.visible ||
            witnessWindow?.get_monitor() !== Main.layoutManager.primaryIndex)
            throw new Error('Pet and witness must be on the sole preview monitor');
        const stream = Gio.File.new_for_path(`${GLib.getenv('CATJANG_PROTOTYPE_OUTPUT')}/native-manual-scene.png`)
            .replace(null, false, Gio.FileCreateFlags.NONE, null);
        try {
            await new Shell.Screenshot().screenshot_area(monitor.x, monitor.y, monitor.width, monitor.height, stream);
        } finally {
            stream.close(null);
        }
        console.log('[Catjang GNOME] manual desktop: drag the pet with the left button; click animates its paws, wheel animates scroll, typing in the entry animates typing; right click shows input regions. Close nested window or Ctrl+C to exit.');
        const duration = GLib.getenv('CATJANG_PROTOTYPE_DURATION_MS');
        if (duration) {
            const milliseconds = Number(duration);
            if (!Number.isInteger(milliseconds) || milliseconds < 1500 || milliseconds > 60000)
                throw new Error('CATJANG_PROTOTYPE_DURATION_MS must be 1500..60000');
            await Promise.race([Scripting.sleep(milliseconds), viewerFinished]);
        } else {
            // Keeps only the isolated compositor alive for physical observation.
            await viewerFinished;
        }
    } finally {
        witness.force_exit();
        viewer.force_exit();
        await viewerFinished;
        // Let the private remote-access session end before Shell destroys its UI.
        await Scripting.sleep(250);
    }
}

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {showPreviewMonitor} from './manual.js';

export const METRICS = {};
export function prepareDemoProfile() {
    // Only the test-tool's disposable XDG profile. Use the project's existing
    // public demo license through its normal validator; never touch real data.
    const profile = `${GLib.getenv('XDG_CONFIG_HOME')}/Catjang`;
    GLib.mkdir_with_parents(profile, 0o700);
    GLib.file_set_contents(`${profile}/license.json`, JSON.stringify({
        licenseKey: 'CATJANG-PROTO-DEMO-1234-5678-9ABC-DEF0', instanceId: 'gnome-local-demo',
        status: 'active', productName: 'Catjang',
    }));
    GLib.file_set_contents(`${profile}/settings.json`, JSON.stringify({mascot: 'cat', petSize: 200,
        catName: 'Catjang', catNamePromptShown: true, agentOnboardingShown: true,
        agentIntegrationsEnabled: false, stretchIntervalMin: 0}));
}
export function launchApplication(binary = GLib.getenv('CATJANG_GNOME_ELECTRON'), packaged = false) {
    prepareDemoProfile();
    const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.NONE});
    launcher.setenv('CATJANG_GNOME_INPUT_SOURCE', GLib.getenv('CATJANG_PROTOTYPE_OUTPUT').endsWith('/application') ? 'global' : 'local', true);
    launcher.setenv('CATJANG_LINUX_BACKEND', 'gnome', true);
    launcher.setenv('CATJANG_ENABLE_AGENT_INTEGRATIONS', '0', true);
    const arguments_ = packaged ? [binary, '--ozone-platform=wayland'] : [binary, GLib.getenv('CATJANG_GNOME_PROJECT'), '--ozone-platform=wayland'];
    return launcher.spawnv(arguments_);
}
export async function run() {
    // First D-Bus call applies the helper option parsed after its initial timer.
    await Scripting.waitTestWindows();
    const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.NONE});
    launcher.setenv('WAYLAND_DISPLAY', GLib.getenv('CATJANG_PROTOTYPE_PARENT_DISPLAY'), true);
    launcher.setenv('GDK_BACKEND', 'wayland', true);
    const viewer = launcher.spawnv([GLib.getenv('CATJANG_PROTOTYPE_VIEWER')]);
    let application = null;
    try {
        await showPreviewMonitor();
        Main.overview.hide();
        await Scripting.sleep(500);
        application = launchApplication();
        const pet = Main.extensionManager.lookup('catjang-native@modlovelace.github.io')?.stateObj;
        for (let attempt = 0; attempt < 120 && !pet?._owner; attempt++) await Scripting.sleep(100);
        if (!pet?._owner || !pet._actor.visible)
            throw new Error('The actual project entry point did not attach the native pet');
        const monitor = Main.layoutManager.primaryMonitor;
        const stream = Gio.File.new_for_path(`${GLib.getenv('CATJANG_PROTOTYPE_OUTPUT')}/native-application-scene.png`)
            .replace(null, false, Gio.FileCreateFlags.NONE, null);
        try { await new Shell.Screenshot().screenshot_area(monitor.x, monitor.y, monitor.width, monitor.height, stream); }
        finally { stream.close(null); }
        console.log('[Catjang GNOME] real project application ready in the isolated desktop');
        const wait = process => new Promise(resolve => process.wait_async(null, (child, result) => { child.wait_finish(result); resolve(); }));
        const duration = GLib.getenv('CATJANG_PROTOTYPE_DURATION_MS');
        const active = [wait(viewer), wait(application)];
        if (duration) {
            const milliseconds = Number(duration);
            if (!Number.isInteger(milliseconds) || milliseconds < 1500 || milliseconds > 60000)
                throw new Error('Invalid preview duration');
            active.push(Scripting.sleep(milliseconds));
        }
        await Promise.race(active);
    } finally {
        application?.send_signal(15);
        viewer.force_exit();
        await Scripting.sleep(500);
    }
}

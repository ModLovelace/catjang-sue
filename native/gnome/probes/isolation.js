import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

export const METRICS = {};
export async function run() {
    await Scripting.waitTestWindows();
    const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.NONE});
    launcher.setenv('CATJANG_ENABLE_AGENT_INTEGRATIONS', '0', true);
    const child = launcher.spawnv([GLib.getenv('CATJANG_GNOME_ELECTRON'),
        `${GLib.getenv('CATJANG_GNOME_PROJECT')}/scripts/test-platform-isolation.js`, '--ozone-platform=wayland']);
    try {
        await new Promise((resolve, reject) => child.wait_check_async(null, (process, result) => {
            try { process.wait_check_finish(result); resolve(); } catch (error) { reject(error); }
        }));
        GLib.file_set_contents(`${GLib.getenv('CATJANG_PROTOTYPE_OUTPUT')}/isolation.json`, JSON.stringify({
            timestampUtc: GLib.DateTime.new_now_utc().format_iso8601(), passed: true,
            simulatedPlatforms: ['win32', 'darwin', 'linux'],
            scope: 'Real shared Electron renderer with simulated platform branches: tracking, drag, capture, stretch CSS and non-Linux window sequences',
            limitations: ['Execution on Ubuntu; Windows/macOS native runtimes were not tested'],
        }, null, 2));
    } finally {
        if (!child.get_if_exited()) child.force_exit();
    }
}

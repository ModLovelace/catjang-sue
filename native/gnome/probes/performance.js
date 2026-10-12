import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {launchApplication} from './application.js';
import {waitFor} from './integration.js';

export const METRICS = {};
const output = GLib.getenv('CATJANG_PROTOTYPE_OUTPUT');
function text(file) {
    const [, bytes] = Gio.File.new_for_path(file).load_contents(null);
    return new TextDecoder().decode(bytes);
}
function stat(path) {
    const value = text(`${path}/stat`);
    const fields = value.slice(value.lastIndexOf(')') + 2).split(' ');
    const status = text(`${path}/status`);
    return {pid: Number(value.split(' ')[0]), parent: Number(fields[1]),
        ticks: Number(fields[11]) + Number(fields[12]), rssKiB: Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0)};
}
function descendants(parent) {
    const directory = Gio.File.new_for_path('/proc').enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
    const all = [];
    for (let file; (file = directory.next_file(null));) {
        if (!/^\d+$/.test(file.get_name())) continue;
        try { all.push(stat(`/proc/${file.get_name()}`)); } catch { /* A process may exit while being enumerated. */ }
    }
    directory.close(null);
    const ids = new Set([parent]);
    for (let changed = true; changed;) {
        changed = false;
        for (const item of all) if (ids.has(item.parent) && !ids.has(item.pid)) { ids.add(item.pid); changed = true; }
    }
    const owned = all.filter(item => ids.has(item.pid));
    return {ticks: owned.reduce((sum, item) => sum + item.ticks, 0), rssKiB: owned.reduce((sum, item) => sum + item.rssKiB, 0), processes: owned.length};
}
export async function run() {
    // First D-Bus call applies the helper option parsed after its initial timer.
    await Scripting.waitTestWindows();
    Main.overview.hide();
    await waitFor(() => Main.extensionManager.lookup('catjang-native@modlovelace.github.io')?.stateObj?._controlObject, 'Extension not ready');
    await Scripting.sleep(1800); // Settle overview/startup before mapping the client.
    const app = launchApplication();
    try {
        const pid = await waitFor(() => {
            const window = global.get_window_actors().map(actor => actor.meta_window).find(item => item.get_title() === 'Catjang — Configuración');
            return window?.get_pid() > 1 ? window.get_pid() : null;
        }, 'Application window did not map');
        await Scripting.sleep(3000);
        const start = {time: GLib.get_monotonic_time(), shell: stat('/proc/self'), application: descendants(pid)};
        await Scripting.sleep(15000);
        const end = {time: GLib.get_monotonic_time(), shell: stat('/proc/self'), application: descendants(pid)};
        const clock = Gio.Subprocess.new(['getconf', 'CLK_TCK'], Gio.SubprocessFlags.STDOUT_PIPE);
        const [, value] = clock.communicate_utf8(null, null);
        const ticksPerSecond = Number(value.trim());
        const seconds = (end.time - start.time) / 1000000;
        const metric = key => ({cpuPercentOfOneCore: Number(((end[key].ticks - start[key].ticks) / ticksPerSecond / seconds * 100).toFixed(2)),
            rssMiB: Number((end[key].rssKiB / 1024).toFixed(2)), rssChangeMiB: Number(((end[key].rssKiB - start[key].rssKiB) / 1024).toFixed(2))});
        const report = {timestampUtc: GLib.DateTime.new_now_utc().format_iso8601(), sampleSeconds: seconds,
            condition: 'Idle native pet with animation and real Electron preferences visible; isolated GNOME 50.1 Wayland 1280x720',
            shell: metric('shell'), applicationProcessTree: {...metric('application'), processes: end.application.processes},
            limitations: ['Short diagnostic sample, no pass/fail CPU threshold or memory-leak claim', 'Shell includes the compositor; process-tree RSS adds shared mappings and is not unique physical memory', 'No physical desktop load or user input during this isolated sample']};
        GLib.file_set_contents(`${output}/performance.json`, JSON.stringify(report, null, 2));
        console.log(`[Catjang performance] ${JSON.stringify(report)}`);
    } finally { app.send_signal(15); await Scripting.sleep(500); }
}

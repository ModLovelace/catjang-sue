import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
export const METRICS={};
export async function run(){
 await Scripting.waitTestWindows();Main.overview.hide();await Scripting.sleep(1500);
 const child=Gio.Subprocess.new([GLib.getenv('CATJANG_GNOME_ELECTRON'),`${GLib.getenv('CATJANG_GNOME_PROJECT')}/native/gnome/probes/electron-reference.js`,'--ozone-platform=wayland'],Gio.SubprocessFlags.NONE);
 try{await new Promise((resolve,reject)=>child.wait_check_async(null,(process,result)=>{try{process.wait_check_finish(result);resolve();}catch(error){reject(error);}}));}
 finally{if(!child.get_if_exited())child.force_exit();await Scripting.sleep(300);}
}

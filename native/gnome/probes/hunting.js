import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read,waitFor,command,startDriver,capture} from './integration.js';
export const METRICS={};
const output=GLib.getenv('CATJANG_PROTOTYPE_OUTPUT'),observations=[];
function assert(value,message){if(!value)throw new Error(message);observations.push(message);console.log(`[Catjang hunting] ${message}`);}
export async function run(){
 await Scripting.waitTestWindows();
 const pointer=Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
 await Scripting.sleep(1200);Main.overview.hide();await Scripting.sleep(350);
 const dir=`${output}/driver`,app=startDriver(dir);
 const move=async(x,y,delay=45)=>{pointer.notify_absolute_motion(GLib.get_monotonic_time(),x,y);await Scripting.sleep(delay);};
 try{
  await waitFor(()=>read(`${dir}/ready.json`),'Application did not attach');
  const pet=Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
  await command(dir,'configure',{mascot:'cat',name:'Cazando el cursor',nameVisible:true,size:200});await command(dir,'hide');
  async function orbit(direction=1){
   const x=pet._actor.x+pet._size*.4,y=pet._actor.y+pet._size*.45,radius=pet._size*.8;
   await move(x+radius,y,180);
   for(let index=1;index<=38;index++){const angle=direction*index*Math.PI/18;await move(x+radius*Math.cos(angle),y+radius*Math.sin(angle),35);if(pet._hunting)return;}
   throw new Error('A real circular pointer gesture failed to trigger hunting');
  }
  await move(30,250,200);
  for(let index=0;index<14;index++)await move(30+index*45,250,50);
  assert(!pet._hunting,'A smooth straight pass does not trigger hunting');
  await orbit();
  assert(pet._hunting&&!pet._purring&&!pet._grab,'Real clockwise circular movement triggers hunting without petting or pointer capture');
  await move(50,50,450);await capture('native-hunting-crouch.png');
  assert(pet._frame.startsWith('hunt-')&&!pet._frame.startsWith('hunt-return'),'Canonical idle hunting frames crouch and grow instead of reusing the stretch pose');
  const frame=pet._frame;await Scripting.sleep(100);
  assert(pet._frame!==frame,'The painted body and tail continue their original hunting wiggle');
  assert(pet._frames[pet._frame].looks?.[pet._look],'Hunting preserves cursor-following eyes');
  await waitFor(()=>pet._frame.startsWith('hunt-return-'),'Hunting did not enter its smooth return',{interval:20,tries:125});
  await capture('native-hunting-return.png');
  await waitFor(()=>!pet._hunting,'Hunting return did not finish');
  assert(!pet._grab&&pet._frame.startsWith('idle'),'The 1100ms hunt and 420ms return restore idle without capture');
  await orbit(-1);assert(Boolean(pet._hunting),'Counterclockwise movement triggers the same hunting gesture');
  await command(dir,'pose','typing');assert(!pet._hunting&&pet._frame.startsWith('press-'),'Typing replaces hunting with a coherent paw gesture');await Scripting.sleep(250);
  await orbit();
  await move(pet._actor.x+100,pet._actor.y+130,40);
  pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_PRIMARY,Clutter.ButtonState.PRESSED);await Scripting.sleep(50);
  await move(pet._actor.x+150,pet._actor.y+90,80);
  assert(!pet._hunting&&pet._physics&&pet._grab,'A real drag cancels hunting and starts the accordion');
  pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_PRIMARY,Clutter.ButtonState.RELEASED);
  await waitFor(()=>!pet._grab,'Release event did not free capture',{interval:20,tries:50});
  await waitFor(()=>!pet._physics,'Accordion did not restore after the actual release',{interval:20,tries:35});
  assert(!pet._physics&&!pet._grab,'Releasing a drag after hunting frees capture and restores the body');
  await orbit();await command(dir,'pose','stretch');
  assert(!pet._hunting&&pet._stretchActor,'Fullscreen stretch takes priority over hunting');await Scripting.sleep(3100);
  await orbit();Main.overview.show();await Scripting.sleep(300);
  assert(!pet._hunting&&!pet._actor.visible,'Overview clears the hunting gesture and detector');Main.overview.hide();await Scripting.sleep(350);
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Quit did not detach');
  assert(!pet._hunting&&!pet._grab,'Detachment clears hunting and all pointer capture');
  GLib.file_set_contents(`${output}/hunting-observations.json`,JSON.stringify({timestampUtc:GLib.DateTime.new_now_utc().format_iso8601(),observations,limitations:['Real Clutter virtual pointer on GNOME 50; physical review remains separate']},null,2));
 }finally{app.force_exit();await Scripting.sleep(300);}
}

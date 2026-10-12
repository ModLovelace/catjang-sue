import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read,waitFor,command,startDriver,capture} from './integration.js';
export const METRICS={};
const output=GLib.getenv('CATJANG_PROTOTYPE_OUTPUT');
const observations=[];
function assert(value,message){if(!value)throw new Error(message);observations.push(message);console.log(`[Catjang refined] ${message}`);}
async function snap(name){await capture(name);}
export async function run(){
 await Scripting.waitTestWindows();
 const pointer=Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
 await Scripting.sleep(1500);Main.overview.hide();await Scripting.sleep(500);
 const kernel=Gio.Subprocess.new(['python3',`${GLib.getenv('CATJANG_GNOME_PROJECT')}/native/gnome/probes/keyboard-kernel-check.py`],Gio.SubprocessFlags.NONE);
 await new Promise((resolve,reject)=>kernel.wait_check_async(null,(process,result)=>{try{process.wait_check_finish(result);resolve();}catch(error){reject(error);}}));
 const dir=`${output}/driver`;const app=startDriver(dir);
 try{
  await waitFor(()=>read(`${dir}/ready.json`),'Application failed to attach');
  const pet=Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
  await command(dir,'configure',{mascot:'cat',name:'Animación nativa',nameVisible:true,size:200});
  await command(dir,'hide');
  const startX=pet._actor.x+100,startY=pet._actor.y+100;
  pointer.notify_absolute_motion(GLib.get_monotonic_time(),startX,startY);await Scripting.sleep(60);
  pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_PRIMARY,Clutter.ButtonState.PRESSED);await Scripting.sleep(30);
  pointer.notify_absolute_motion(GLib.get_monotonic_time(),640,130);await Scripting.sleep(25);
  assert(pet._physics&&pet._dragLayer.visible&&!pet._visual.visible,'Native drag uses the canonical accordion layers');
  const initial=pet._physics.t;await snap('native-compressed.png');
  await Scripting.sleep(300);
  assert(pet._physics.t>initial&&pet._physics.t>.8,'Holding extends the body over the original 260ms curve');
  assert(pet._dragPieces.length===17,'Native head and sixteen body bands preserve the canonical silhouette');
  await snap('native-extended.png');
  const painted=GdkPixbuf.Pixbuf.new_from_file(`${output}/native-extended.png`);
  const bytes=painted.get_pixels(),channels=painted.get_n_channels();let widest=0;
  for(let y=Math.round(pet._actor.y+36);y<pet._actor.y+132;y++){
    let first=Infinity,last=-Infinity;
    for(let x=Math.round(pet._actor.x-60);x<pet._actor.x+260;x++){
      const pixel=y*painted.get_rowstride()+x*channels;
      if(bytes[pixel]<45&&bytes[pixel+1]<45&&bytes[pixel+2]<45){first=Math.min(first,x);last=Math.max(last,x);}
    }
    widest=Math.max(widest,last-first+1);
  }
  assert(widest>=75,'Compositor-painted head keeps canonical width instead of being squeezed by icon allocation');
  pointer.notify_absolute_motion(GLib.get_monotonic_time(),710,130);await Scripting.sleep(60);
  const right=pet._physics.angle;
  pointer.notify_absolute_motion(GLib.get_monotonic_time(),610,130);await Scripting.sleep(60);
  assert(pet._physics.angle!==right&&pet._physics.offsets().some(value=>Math.abs(value)>.05),'Real direction changes feed body inertia instead of an artificial periodic sway');
  await snap('native-body-sway.png');
  pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_PRIMARY,Clutter.ButtonState.RELEASED);await Scripting.sleep(60);
  assert(!pet._grab&&pet._releaseStarted&&pet._physics.releasing,'Release immediately frees the pointer and starts spring compression');
  await snap('native-spring-release.png');
  const released=GdkPixbuf.Pixbuf.new_from_file(`${output}/native-spring-release.png`);
  const releasePixels=released.get_pixels(),stride=released.get_rowstride(),n=released.get_n_channels();
  const center=Math.round(pet._actor.x+100);let hasBody=false,gap=0;
  for(let y=Math.round(pet._actor.y+136);y<pet._actor.y+250;y++){
    let body=false;
    for(let x=center-20;x<=center+20;x++){const i=y*stride+x*n;body ||= releasePixels[i]<45&&releasePixels[i+1]<45&&releasePixels[i+2]<45;}
    if(body){hasBody=true;gap=0;}else if(hasBody){gap++;if(gap>2)throw new Error('Accordion release separates the painted body into disconnected bands');}
  }
  assert(hasBody,'Spring compression keeps the painted body connected without horizontal gaps');
  await Scripting.sleep(450);
  assert(!pet._physics&&!pet._dragLayer.visible&&pet._visual.visible,'Spring release restores idle with no hanging layer or capture');
  await command(dir,'pose','typing');const first=pet._frame;
  await Scripting.sleep(60);assert(pet._frame===first,'One key holds one coherent paw pose instead of cycling both paws');
  await command(dir,'pose','typing');assert(pet._frame!==first&&pet._frame.startsWith('press-'),'The next key alternates the paw immediately');
  await Scripting.sleep(220);assert(!pet._frame.startsWith('press-'),'Paws return to idle 180ms after the last actual pulse');
  await command(dir,'typing-burst',{count:18,delay:85});const early=pet._heat;
  await command(dir,'typing-burst',{count:40,delay:45});
  assert(pet._heat>early&&pet._heat>.9&&pet._visualHeat.opacity>200,'Speed and accumulated typing increase continuous red intensity from the base color');
  await snap('native-typing-heat.png');
  const frame=pet._frames[pet._frame];const file=frame.heatMasks?.[pet._look]??frame.heatMasks?.['0,0'];
  const mask=GdkPixbuf.Pixbuf.new_from_file(`${pet.path}/assets/${file}`);
  const cold=GdkPixbuf.Pixbuf.new_from_file(`${pet.path}/assets/${frame.looks?.[pet._look]??frame.file}`);
  const original=cold.get_pixels(),hot=mask.get_pixels();let covered=0;
  for(let i=0;i<original.length;i+=4){if(hot[i+3]>0)covered++;if(original[i]>230&&original[i+1]>230&&original[i+2]>230&&original[i+3]>200&&hot[i+3]!==0)throw new Error('Heat mask tinted a white material');}
  assert(covered>300,'Continuous heat mask excludes white eyes, keyboard and SVG outline');
  await Scripting.sleep(3600);assert(pet._heat===0&&pet._visualHeat.opacity===0,'Stopping actual input cools back to the unchanged base material');
  await command(dir,'hide');await command(dir,'pose','stretch');
  await Scripting.sleep(1400);
  assert(pet._stretchActor.opacity>=120&&pet._stretchActor.opacity<=145,'Fullscreen stretch is approximately half transparent at its midpoint');
  await snap('native-stretch-midpoint.png');await Scripting.sleep(1700);
  assert(!pet._stretchActor&&pet._actor.visible,'Stretch ends without opacity or fullscreen actor leaking into idle');
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Quit did not detach');
  GLib.file_set_contents(`${output}/refined-observations.json`,JSON.stringify({timestampUtc:GLib.DateTime.new_now_utc().format_iso8601(),observations,
   limitations:['Global keyboard physical acceptance remains separate from the owned-kernel parser check','Virtual compositor input; compare snapshots with the original Electron reference']},null,2));
 }finally{app.force_exit();await Scripting.sleep(300);}
}

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read,waitFor,command,startDriver,capture} from './integration.js';
export const METRICS={};
const output=GLib.getenv('CATJANG_PROTOTYPE_OUTPUT'),observations=[];
function assert(value,message){if(!value)throw new Error(message);observations.push(message);console.log(`[Catjang mascots] ${message}`);}
export async function run(){
 await Scripting.waitTestWindows();
 const pointer=Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
 await Scripting.sleep(1000);Main.overview.hide();await Scripting.sleep(350);
 const dir=`${output}/driver`,app=startDriver(dir);
 try{
  await waitFor(()=>read(`${dir}/ready.json`),'Application did not attach');
  const pet=Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
  await command(dir,'ui',"if(document.getElementById('mascot').options.length!==6||[...document.getElementById('mascot').options].some(o=>o.disabled))throw new Error('Six choices unavailable');true");
  assert(Object.keys(pet._catalog).length===6,'Six native choices are enabled in the real configuration');
  await command(dir,'configure',{mascot:'cat',name:'Catjang',nameVisible:true,size:200});
  const silhouettes=new Set(), voices=new Set();
  for(const [id,info]of Object.entries(pet._catalog)){
   await command(dir,'ui',`document.getElementById('mascot').value='${id}';document.getElementById('mascot').dispatchEvent(new Event('change'));`);
   await waitFor(()=>pet._mascot===id,`${id} did not load`);await Scripting.sleep(200);
   const state=await command(dir,'query');assert(state.saved.mascot===id&&pet._nameLabel.text===info.defaultName,`${id}: selector persists identity and its own default name`);
   assert(Object.values(pet._frames).every(frame=>frame.source.startsWith(`svg/${id}/`)),`${id}: every pose uses this mascot's canonical assets`);
   silhouettes.add(JSON.stringify(pet._frames.idle.rects));
   voices.add(state.state.completionSound);
   const rects=pet._frames.idle.rects, leftEdge=Math.min(...rects.map(r=>r.x)),rightEdge=Math.max(...rects.map(r=>r.x+r.width));
   const [labelX,labelY]=pet._nameLabel.get_transformed_position();
   assert(Math.abs(labelX+pet._size/2-(pet._actor.x+(leftEdge+rightEdge)/2*pet._size/200))<1 && labelY>pet._actor.y+Math.max(...rects.map(r=>r.y+r.height))*pet._size/200,`${id}: the name is centered below the painted body`);
   const centerX=pet._actor.x+pet._size*info.petting.cx,centerY=pet._actor.y+pet._size*info.petting.cy;
   await command(dir,'hide');
   pointer.notify_absolute_motion(GLib.get_monotonic_time(),centerX-250,centerY);await Scripting.sleep(180);const left=pet._look;
   pointer.notify_absolute_motion(GLib.get_monotonic_time(),centerX+250,centerY);await Scripting.sleep(180);
   assert(pet._look!==left,`${id}: global eyes track both sides`);
   // Small deliberate strokes avoid the rapid-shake hunting trigger.
   for(let index=0;index<24;index++){
    pointer.notify_absolute_motion(GLib.get_monotonic_time(),centerX+(index%2?8:-8),centerY);await Scripting.sleep(90);
   }
   assert(pet._purring&&pet._frame.startsWith('purr'),`${id}: native head strokes reach its petting pose`);
   await command(dir,'ui',"if(purringAudio.src!==nativeSettings.purringSound||purringAudio.played.length===0)throw new Error('Wrong or silent shared audio');true");
   assert(true,`${id}: petting plays its original species audio`);
   await capture(`${id}-petting.png`);
   pointer.notify_absolute_motion(GLib.get_monotonic_time(),30,30);await Scripting.sleep(350);
   assert(!pet._purring,`${id}: leaving the head stops petting`);
   await command(dir,'pose','typing');const paw=pet._frame;await command(dir,'pose','typing');
   assert(pet._frame.startsWith('press-')&&pet._frame!==paw,`${id}: real key pulses alternate canonical paws`);
   await Scripting.sleep(230);
   await command(dir,'typing-burst',{count:32,delay:35});
   assert(pet._heat>.7&&pet._visualHeat.opacity>120,`${id}: accumulated actual key pulses redden its own base material`);
   await command(dir,'hide');await Scripting.sleep(3600);
   pointer.notify_absolute_motion(GLib.get_monotonic_time(),centerX,centerY);await Scripting.sleep(60);
   pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_PRIMARY,Clutter.ButtonState.PRESSED);await Scripting.sleep(50);
   pointer.notify_absolute_motion(GLib.get_monotonic_time(),centerX-80,centerY-60);await Scripting.sleep(90);
   assert(pet._grab&&pet._physics,`${id}: real drag captures beyond its silhouette`);
   if(info.dragStyle==='pendulum')assert(pet._visual.visible&&!pet._dragLayer.visible&&pet._frame.startsWith('drag'),`${id}: its own hanging pose uses the Electron pendulum`);
   else assert(pet._dragLayer.visible,`${id}: the validated cat accordion stays active`);
   await capture(`${id}-drag.png`);
   pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_PRIMARY,Clutter.ButtonState.RELEASED);
   await waitFor(()=>!pet._grab,`${id}: release was not delivered`,{interval:20,tries:50});
   await waitFor(()=>!pet._physics,`${id}: body did not restore after release`,{interval:20,tries:35});
   assert(!pet._grab&&!pet._physics&&pet._visual.get_rotation_angle(Clutter.RotateAxis.Z_AXIS)===0,`${id}: release restores its body and frees capture`);
   await command(dir,'pose','scroll');assert(pet._frame.startsWith('scroll'),`${id}: scroll loads its own paper pose`);await Scripting.sleep(900);
   await command(dir,'pose','jump');assert(pet._frame.startsWith('jump'),`${id}: jump loads its own canonical pose`);await Scripting.sleep(750);
   if(info.stretchSupported){
   await command(dir,'pose','stretch');await Scripting.sleep(1350);
   assert((await command(dir,'query')).state.connected&&pet._stretchActor&&!pet._stretchActor.reactive&&pet._stretchActor.opacity<150,`${id}: its fullscreen stretch is translucent and click-through`);
   await capture(`${id}-stretch.png`);await Scripting.sleep(1750);
   assert(!pet._stretchActor&&pet._actor.visible,`${id}: fullscreen stretch restores its own idle`);
   }else{
    await command(dir,'pose','stretch');
    assert(!pet._stretchActor&&pet._actor.visible,`${id}: the special stretch is excluded without breaking its eight canonical resources`);
    await command(dir,'ui',"if(!document.querySelector('[data-animation=stretch]').hidden||!document.getElementById('stretchIntervalMin').disabled)throw new Error('Stretch controls should be excluded');true");
   }
   await command(dir,'hide');
   for(const direction of [1,-1]){
    const cx=pet._actor.x+pet._size*info.petting.cx,cy=pet._actor.y+pet._size*info.petting.cy,r=pet._size*.8;
    pointer.notify_absolute_motion(GLib.get_monotonic_time(),cx+r,cy);await Scripting.sleep(180);
    for(let n=1;n<=40&&!pet._hunting;n++){
     const angle=direction*n*Math.PI/18;pointer.notify_absolute_motion(GLib.get_monotonic_time(),cx+r*Math.cos(angle),cy+r*Math.sin(angle));await Scripting.sleep(35);
    }
    assert(pet._hunting&&!pet._grab,`${id}: circular play responds in direction ${direction} without grabbing the pointer`);
    pointer.notify_absolute_motion(GLib.get_monotonic_time(),30,30);await Scripting.sleep(350);
    assert(pet._frame.startsWith('hunt-')&&pet._frames[pet._frame].source.startsWith(`svg/${id}/`),`${id}: play paints its own body and follows the eyes`);
    await capture(`${id}-play-${direction}.png`);
    await waitFor(()=>!pet._hunting,`${id}: play failed to return`);
   }
   pet._lastActivity=GLib.get_monotonic_time()-61000000;await Scripting.sleep(100);
   assert(pet._sleeping&&pet._frame==='blink',`${id}: inactivity closes the eyes for a nap`);
   await command(dir,'pose','typing');
   assert(!pet._sleeping&&pet._frame.startsWith('press'),`${id}: a key wakes the pet coherently`);

  }
  assert(voices.size===6,'All six mascots inherit a distinct natural voice from the shared audio catalog');
  assert(silhouettes.size===6,'All six native idle silhouettes are distinct');
  await command(dir,'ui',"document.getElementById('mascot').value='schnauzer';document.getElementById('mascot').dispatchEvent(new Event('change'));");await Scripting.sleep(200);
  await command(dir,'ui',"document.getElementById('name').value='Toto laboratorio';document.getElementById('settings').requestSubmit();");
  await command(dir,'ui',"document.getElementById('mascot').value='milo';document.getElementById('mascot').dispatchEvent(new Event('change'));");
  await command(dir,'ui',"document.getElementById('mascot').value='schnauzer';document.getElementById('mascot').dispatchEvent(new Event('change'));");
  assert(pet._nameLabel.text==='Toto laboratorio','Switching preserves each mascot custom name');
  await command(dir,'hide');
  pointer.notify_absolute_motion(GLib.get_monotonic_time(),pet._actor.x+100,pet._actor.y+70);await Scripting.sleep(50);
  pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_SECONDARY,Clutter.ButtonState.PRESSED);await Scripting.sleep(50);
  pointer.notify_button(GLib.get_monotonic_time(),Clutter.BUTTON_SECONDARY,Clutter.ButtonState.RELEASED);await Scripting.sleep(200);
  const item=pet._contextItems.get('mascot-peruperro');
  // Activate the actual menu item; real right click and modal cleanup were
  // exercised above and in the features probe.
  item.activate(null);await Scripting.sleep(400);
  assert(pet._mascot==='peruperro'&&!pet._menu.isOpen,'Native mascot menu switches to Chuño and releases its modal grab');
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Quit failed to detach');
  assert(!pet._grab&&!pet._physics,'All-mascot test ends with no owner or pointer capture');
  GLib.file_set_contents(`${output}/mascot-observations.json`,JSON.stringify({timestampUtc:GLib.DateTime.new_now_utc().format_iso8601(),observations,limitations:['GNOME 50 isolated compositor; physical acceptance of five newly ported families remains separate','Special full-screen stretching is intentionally limited to Catjang; dachshund remains a future mascot']},null,2));
 }finally{app.force_exit();await Scripting.sleep(300);}
}

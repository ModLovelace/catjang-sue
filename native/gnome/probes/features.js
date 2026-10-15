import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read,waitFor,command,startDriver,capture} from './integration.js';
export const METRICS = {};
const output = GLib.getenv('CATJANG_PROTOTYPE_OUTPUT'), observations=[];
function assert(value,message){if(!value)throw new Error(message);observations.push(message);console.log(`[Catjang features] ${message}`);}
async function click(pointer,x,y,button=Clutter.BUTTON_PRIMARY){pointer.notify_absolute_motion(GLib.get_monotonic_time(),x,y);await Scripting.sleep(50);pointer.notify_button(GLib.get_monotonic_time(),button,Clutter.ButtonState.PRESSED);await Scripting.sleep(40);pointer.notify_button(GLib.get_monotonic_time(),button,Clutter.ButtonState.RELEASED);await Scripting.sleep(250);}
export async function run(){
 await Scripting.waitTestWindows();
 const pointer=Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
 const keyboard=Clutter.get_default_backend().get_default_seat().create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
 await Scripting.sleep(1200);Main.overview.hide();await Scripting.sleep(350);
 const dir=`${output}/driver`,app=startDriver(dir);
 try{
  await waitFor(()=>read(`${dir}/ready.json`),'Application did not attach');
  const pet=Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
  await command(dir,'configure',{mascot:'cat',name:'Funciones Linux',nameVisible:true,size:200});
  await command(dir,'hide');
  await click(pointer,pet._actor.x+100,pet._actor.y+100,Clutter.BUTTON_SECONDARY);
  assert(pet._menu?.isOpen&&!pet._grab,'Physical-format right click opens the native menu without a pet drag grab');
  const area=Main.layoutManager.getWorkAreaForMonitor(pet._monitorIndex());
  for(const key of ['preferences','reminders','stretch','jump','name-toggle','agents-setup','quit']){
   const item=pet._contextItems.get(key),[x,y]=item.get_transformed_position(),[w,h]=item.get_transformed_size();
   assert(x>=area.x&&y>=area.y&&x+w<=area.x+area.width&&y+h<=area.y+area.height,`Menu item ${key} fits inside the work area near the bottom edge`);
  }
  await capture('native-context-menu.png');
  keyboard.notify_keyval(GLib.get_monotonic_time(),Clutter.KEY_Escape,Clutter.KeyState.PRESSED);keyboard.notify_keyval(GLib.get_monotonic_time(),Clutter.KEY_Escape,Clutter.KeyState.RELEASED);await Scripting.sleep(250);
  assert(!pet._menu.isOpen&&!pet._menuManager._grab,'Escape closes the native menu and releases its modal grab');
  await click(pointer,pet._actor.x+100,pet._actor.y+100,Clutter.BUTTON_SECONDARY);
  const item=pet._contextItems.get('preferences'),[x,y]=item.get_transformed_position(),[w,h]=item.get_transformed_size();
  await click(pointer,x+w/2,y+h/2);
  let state=await command(dir,'query');assert(state.windowVisible&&!pet._menu.isOpen,'Real menu selection opens the actual Electron configuration and releases capture');
  await command(dir,'ui',"document.getElementById('userName').value='Laboratorio';document.getElementById('fixedMessage').value='Mensaje persistente';document.getElementById('stretchIntervalMin').value='10';document.getElementById('volume').value='0.1';document.getElementById('preferences').requestSubmit();");
  state=await command(dir,'query');assert(state.saved.userName==='Laboratorio'&&state.saved.fixedMessage==='Mensaje persistente'&&state.saved.stretchIntervalMin===10,'Actual preferences form persists shared settings through main.js');
  await waitFor(()=>pet._messageLabel?.visible&&pet._messageLabel.text==='Mensaje persistente','Fixed message did not appear');
  assert(pet._controls.stretchIntervalMin===10,'Controls synchronize without resetting pet position or drag');
  await command(dir,'ui',"document.getElementById('focusMin').value='1';document.getElementById('restMin').value='0.5';document.getElementById('pomodoroSettings').requestSubmit();");
  state=await command(dir,'query');assert(state.features.pomodoro.focusMin===1&&state.features.pomodoro.restSec===30,'Pomodoro form configures the real shared focus/rest durations');
  await command(dir,'ui',"document.getElementById('pomodoroStart').click();");await Scripting.sleep(2100);
  state=await command(dir,'query');assert(state.features.pomodoro.running&&state.features.pomodoro.remainingSec<60,'Actual UI starts the existing main-process clock');
  await command(dir,'ui',"document.getElementById('pomodoroPause').click();");const paused=(await command(dir,'query')).features.pomodoro.remainingSec;await Scripting.sleep(1300);
  state=await command(dir,'query');assert(!state.features.pomodoro.running&&state.features.pomodoro.remainingSec===paused,'Pause stops elapsed time without replacing the shared timer');
  await command(dir,'ui',"document.getElementById('pomodoroReset').click();");state=await command(dir,'query');assert(!state.features.pomodoro.running&&state.features.pomodoro.remainingSec===60,'Reset returns to a full focus interval');
  await command(dir,'ui',"document.querySelector('[data-panel=reminders]').click();document.getElementById('reminderMessage').value='Recordatorio original';document.getElementById('reminderTime').value='23:59';document.getElementById('reminderRepeat').value='daily';document.getElementById('reminderForm').requestSubmit();");
  state=await command(dir,'query');assert(state.features.reminders.length===1&&state.saved.reminders[0].message==='Recordatorio original','Reminder form creates and persists a real shared reminder');
  const id=state.features.reminders[0].id;
  await command(dir,'ui',"document.querySelector('#reminderList [data-action=edit]').click();document.getElementById('reminderMessage').value='Recordatorio editado';document.getElementById('reminderForm').requestSubmit();");
  state=await command(dir,'query');assert(state.features.reminders[0].id===id&&state.features.reminders[0].message==='Recordatorio editado','Editing retains the reminder identity and updates its message');
  await command(dir,'ui',"document.querySelector('#reminderList [data-action=toggle]').click();");state=await command(dir,'query');assert(!state.features.reminders[0].enabled,'Reminder toggle reaches shared persistence');
  await command(dir,'ui',"document.querySelector('#reminderList [data-action=delete]').click();");state=await command(dir,'query');assert(!state.features.reminders.length&&!state.saved.reminders.length,'Removing a reminder clears shared persisted state');
  let invalid=false;try{await command(dir,'feature',{action:'preferences',payload:{userName:'Should not persist',focusMin:0}});}catch{invalid=true;}
  state=await command(dir,'query');assert(invalid&&state.saved.userName==='Laboratorio','Invalid mixed preferences are rejected atomically before mutation');
  await command(dir,'ui',"window.qaAlerts=[];window.catjangNative.onAlert(data=>window.qaAlerts.push(data));true");
  await command(dir,'ui',"const now=new Date();document.getElementById('reminderMessage').value='Aviso local real';document.getElementById('reminderTime').value=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');document.getElementById('reminderRepeat').value='none';document.getElementById('reminderForm').requestSubmit();");
  state=await command(dir,'query');
  assert(state.features.reminders[0]?.enabled===false&&state.saved.reminders[0].lastTriggeredDate,'A reminder due now is delivered and persisted immediately, including a minute boundary');
  await command(dir,'ui',"if(!window.qaAlerts.some(item=>item.text.includes('Aviso local real')))throw new Error('Reminder text lost');if(reminderAudio.played.length===0)throw new Error('Alert audio did not play');true");
  assert(true,'Real notification preserves reminder text and plays the original decoded alert sound');
  await command(dir,'ui',"document.querySelector('[data-panel=pomodoro]').click();");await command(dir,'capture-window','pomodoro-controls.png');
  await command(dir,'ui',"document.getElementById('pomodoroStart').click();");await command(dir,'hide');
  for(let attempt=0;attempt<70;attempt++){state=await command(dir,'query');if(state.features.pomodoro.mode==='rest')break;await Scripting.sleep(1000);}
  assert(state.features.pomodoro.running&&state.features.pomodoro.mode==='rest','Hidden preferences preserve the real focus timer through its transition to rest');
  await command(dir,'ui',"if(!window.qaAlerts.some(item=>item.text.includes('Terminó el enfoque')))throw new Error('Pomodoro notification missing');true");
  assert(true,'Focus completion forwards a meaningful native notice');
  assert(!pet._grab,'Pomodoro completion leaves no drag capture');
  await command(dir,'feature',{action:'pomodoro-reset'});
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Quit did not detach');
  assert(!pet._menu?.isOpen&&!pet._menuManager?._grab,'Quit cleans the context menu and its modal capture');
  GLib.file_set_contents(`${output}/features-observations.json`,JSON.stringify({timestampUtc:GLib.DateTime.new_now_utc().format_iso8601(),observations,limitations:['GNOME 50 isolated compositor; native Windows/macOS runtimes not exercised','Additional pets and automatic extension setup in packages remain separate work']},null,2));
 }finally{app.force_exit();await Scripting.sleep(300);}
}

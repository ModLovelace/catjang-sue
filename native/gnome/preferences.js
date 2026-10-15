"use strict";
const api = window.catjangNative;
const purringAudio = new Audio(); purringAudio.loop = true; purringAudio.volume = .28;
const completionAudio = new Audio(), reminderAudio = new Audio();
api.onPetting(active => {
  if (active) purringAudio.play().catch(failure);
  else { purringAudio.pause(); purringAudio.currentTime = 0; }
});
const field = id => document.getElementById(id);
let features, renderedReminders, nativeSettings;
function renderSettings(settings) {
  nativeSettings=settings;
  const upgrade=field('upgrade');
  upgrade.hidden=!settings.connected||settings.paritySupported;
  upgrade.textContent=`GNOME está usando la extensión v${settings.extensionVersion??'anterior'}. Puedes usar Catjang ahora. Para activar el juego de todas las mascotas, el nombre centrado y los avisos nuevos de tareas, guarda tu trabajo, cierra la sesión de Ubuntu y vuelve a entrar; después abre Catjang Laboratorio.`;
  const selector=field('mascot');
  if(selector.options.length!==Object.keys(settings.catalog).length){
    selector.replaceChildren();for(const [id,info]of Object.entries(settings.catalog)){
      const option=document.createElement('option');option.value=id;option.textContent=info.defaultName;
      option.disabled=id!=='cat'&&!settings.catalogSupported;selector.append(option);
    }
  }
  for(const option of selector.options)option.disabled=option.value!=='cat'&&!settings.catalogSupported;
  selector.value=settings.mascot;
  const canStretch=settings.catalog[settings.mascot].stretchSupported===true;
  document.querySelector('[data-animation=stretch]').hidden=!canStretch;
  field('stretchIntervalMin').disabled=!canStretch;
  field('name').value=settings.name;field('nameVisible').checked=settings.nameVisible;field('size').value=settings.size;
  purringAudio.pause();purringAudio.src=settings.purringSound;purringAudio.volume=settings.pettingVolume;
  completionAudio.src=settings.completionSound;reminderAudio.src=settings.reminderSound;
}
api.onSettings(renderSettings);
field('mascot').addEventListener('change',async()=>{
  const mascot=field('mascot').value;
  try{renderSettings(await api.set({mascot,name:nativeSettings.names[mascot]??nativeSettings.catalog[mascot].defaultName,nameVisible:field('nameVisible').checked,size:Number(field('size').value)}));}catch(error){failure(error);field('mascot').value=nativeSettings.mascot;}
});
function showStatus(data) { field('status').textContent = data.status; if(data.connected===false)field('upgrade').hidden=true; }
function failure(error) { showStatus({status: error.message}); }
function panel(name) {
  if (!['settings','pomodoro','reminders'].includes(name)) return;
  for (const id of ['settings','pomodoro','reminders']) field(`panel-${id}`).hidden = id !== name;
  for (const button of document.querySelectorAll('[data-panel]')) button.setAttribute('aria-pressed',String(button.dataset.panel === name));
}
async function load() {
  const settings = await api.get();
  renderSettings(settings);
  field('name').value = settings.name; field('nameVisible').checked = settings.nameVisible; field('size').value = settings.size;
  showStatus(settings); showKeyboard(settings.keyboard);
  features = await api.getFeatures();
  field('userName').value = features.userName; field('fixedMessage').value = features.fixedMessage;
  field('stretchIntervalMin').value = features.stretchIntervalMin; field('volume').value = features.taskCompleteSoundVolume;
  field('focusMin').value = features.pomodoro.focusMin; field('restMin').value = features.pomodoro.restSec / 60;
  field('agents').disabled = !features.agentsAvailable;
  field('agentsNote').textContent = features.agentsAvailable ? 'La conexión de agentes requiere tu consentimiento en su configuración.' : 'Los agentes están desactivados en este perfil de prueba.';
  renderFeatures(features);
}
function showKeyboard(state) {
  field('keyboard').textContent = state?.mode === 'global'
    ? 'Teclado del escritorio conectado. Cada pulsación mueve una pata; el ritmo acumula calor.'
    : 'Teclado local: responde en esta configuración. El lector del escritorio necesita acceso de lectura al teclado.';
}
function renderFeatures(state) {
  features = state;
  field('agentsNote').textContent=!state.agentsAvailable?'Los agentes están desactivados por la política de este proceso.':state.agentsEnabled?'Conexión con agentes habilitada. Los avisos muestran el IDE y su tarea.':'Conecta tus IDEs desde Configurar agentes de IA; requiere tu consentimiento.';
  const p = state.pomodoro, seconds = Math.max(0,p.remainingSec);
  field('pomodoroState').textContent = `${p.mode === 'focus' ? 'Enfoque' : 'Descanso'} · ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} · ${p.running ? 'En curso' : 'Pausado'}`;
  field('pomodoroStart').disabled = p.running; field('pomodoroPause').disabled = !p.running;
  const remindersKey=JSON.stringify(state.reminders);
  if(remindersKey===renderedReminders)return;
  renderedReminders=remindersKey;
  const list = field('reminderList'); list.replaceChildren();
  if (!state.reminders.length) { const item = document.createElement('li'); item.textContent = 'Todavía no hay recordatorios.'; list.append(item); }
  for (const reminder of state.reminders) {
    const item = document.createElement('li'); item.dataset.id = reminder.id;
    const title = document.createElement('span'); title.textContent = `${reminder.time} — ${reminder.message}`; item.append(title);
    const enabled = document.createElement('button'); enabled.textContent = reminder.enabled ? 'Desactivar' : 'Activar'; enabled.dataset.action = 'toggle';
    enabled.addEventListener('click',()=>act('reminder-enabled',{id:reminder.id,enabled:!reminder.enabled}).catch(()=>{}));
    const edit = document.createElement('button'); edit.textContent = 'Editar'; edit.dataset.action = 'edit'; edit.addEventListener('click',()=>editReminder(reminder));
    const remove = document.createElement('button'); remove.textContent = 'Eliminar'; remove.dataset.action = 'delete'; remove.addEventListener('click',()=>act('reminder-delete',reminder.id).catch(()=>{}));
    item.append(enabled,edit,remove); list.append(item);
  }
}
async function act(action,payload) {
  try { const state=await api.feature(action,payload); renderFeatures(state); return state; }
  catch(error) { failure(error); throw error; }
}
function editReminder(reminder) {
  field('reminderId').value=reminder?.id??''; field('reminderMessage').value=reminder?.message??'';
  field('reminderTime').value=reminder?.time??''; field('reminderRepeat').value=reminder?.repeat??'none';
  for(const input of field('reminderDays').querySelectorAll('input'))input.checked=reminder?.days.includes(Number(input.value))??false;
  field('reminderDays').hidden=field('reminderRepeat').value!=='custom'; panel('reminders');
}
api.onKeyboard(showKeyboard); api.onStatus(showStatus); api.onFeatures(renderFeatures); api.onPanel(panel);
api.onAlert(async data=>{
  showStatus({status:data.text});
  const audio=data.sound==='reminder'?reminderAudio:completionAudio;
  audio.volume=Math.max(0,Math.min(1,data.volume)); if(audio.volume===0)return;
  audio.currentTime=0; try {await audio.play();}catch(error){failure(error);}
});
for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>panel(button.dataset.panel));
field('settings').addEventListener('submit',async event=>{
  event.preventDefault();
  try {const updated=await api.set({mascot:field('mascot').value,name:field('name').value.trim(),nameVisible:field('nameVisible').checked,size:Number(field('size').value)});showStatus({status:updated.connected?'Ajustes guardados':updated.status});}catch(error){failure(error);}
});
field('preferences').addEventListener('submit',async event=>{
  event.preventDefault(); await act('preferences',{userName:field('userName').value.trim(),fixedMessage:field('fixedMessage').value.trim(),stretchIntervalMin:Number(field('stretchIntervalMin').value),taskCompleteSoundVolume:Number(field('volume').value)}).catch(()=>{});
});
field('pomodoroSettings').addEventListener('submit',async event=>{
  event.preventDefault();await act('preferences',{focusMin:Number(field('focusMin').value),restSec:Number(field('restMin').value)*60}).catch(()=>{});
});
for(const [id,action]of[['pomodoroStart','pomodoro-start'],['pomodoroPause','pomodoro-pause'],['pomodoroReset','pomodoro-reset'],['agents','agents-setup']])field(id).addEventListener('click',()=>act(action).catch(()=>{}));
field('reminderForm').addEventListener('submit',async event=>{
  event.preventDefault();const id=field('reminderId').value;
  const payload={message:field('reminderMessage').value,time:field('reminderTime').value,repeat:field('reminderRepeat').value,days:[...field('reminderDays').querySelectorAll('input:checked')].map(input=>Number(input.value))};
  if(id)payload.id=id;try{await act(id?'reminder-update':'reminder-add',payload);editReminder(null);}catch{}
});
field('reminderRepeat').addEventListener('change',()=>{field('reminderDays').hidden=field('reminderRepeat').value!=='custom';});
field('reminderNew').addEventListener('click',()=>editReminder(null));
field('reconnect').addEventListener('click',()=>api.reconnect().catch(failure)); field('quit').addEventListener('click',()=>api.quit());
for(const button of document.querySelectorAll('[data-animation]'))button.addEventListener('click',()=>api.animate(button.dataset.animation).catch(failure));
panel('settings'); load().catch(failure);

window.addEventListener('focus',()=>api.getFeatures().then(renderFeatures).catch(failure));

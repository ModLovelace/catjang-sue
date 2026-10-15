"use strict";
// One formatter for the GNOME speech bubble and its system notification.
function clean(value, limit=100) {
  return typeof value==='string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,limit) : '';
}
function formatAgentEvent(event={}, state=event.state) {
  const id=clean(event.agentId).toLowerCase();
  const known=id.includes('antigravity')?'Antigravity':id.includes('gemini')?'Gemini':
    id.includes('codex')?'Codex':id.includes('claude')?'Claude Code':id.includes('cursor')?'Cursor':id.includes('kiro')?'Kiro':null;
  const agent=known || clean(event.agentName,50) || 'Agente IA';
  const topic=clean(event.conversationName,60), task=clean(event.task,180), text=clean(event.text||event.message,240);
  const prefix=topic?`${agent} [${topic}]`:agent;
  if(state==='thinking'||state==='working')return `${prefix}: ${state==='thinking'?'Pensando':'Trabajando'}${task?` en «${task}»`:''}…`;
  if(state==='complete')return `${prefix}: ${task?`Terminó «${task}»`:text||'¡Tarea completada!'}`;
  if(state==='notification')return `${prefix}: ${text||task||'Necesita tu atención'}`;
  if(state==='error')return `${prefix}: ${text||task||'La tarea terminó con un error'}`;
  return '';
}
module.exports={formatAgentEvent};

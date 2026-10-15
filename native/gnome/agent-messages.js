"use strict";
// One formatter for the GNOME speech bubble and its system notification.
function clean(value, limit=100) {
  if(limit<=0)return '';
  const result=typeof value==='string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ').trim() : '';
  return result.length<=limit ? result : result.slice(0,limit-1).replace(/[\ud800-\udbff]$/,'')+'…';
}
function formatAgentEvent(event={}, state=event.state) {
  const id=clean(event.agentId).toLowerCase();
  const known=id.includes('antigravity')?'Antigravity':id.includes('gemini')?'Gemini':
    id.includes('codex')?'Codex':id.includes('claude')?'Claude Code':id.includes('cursor')?'Cursor':id.includes('kiro')?'Kiro':null;
  const agent=known || clean(event.agentName,50) || 'Agente IA';
  const topic=clean(event.conversationName,420), task=clean(event.task,180), text=clean(event.text||event.message,240);
  const prefix=topic?`${agent} [${topic}]`:agent;
  if(state==='thinking'||state==='working')return clean(`${prefix}: ${state==='thinking'?'Pensando':'Trabajando'}${task?` en «${task}»`:''}…`,512);
  if(state==='complete'){
    const session=clean(event.conversationId||event.sessionId,100).replace(/^codex:/,'');
    const id=['antigravity','codex','claude','claude-code','cursor','kiro','gemini','agent'].includes(session)?'':session.slice(-8);
    const title=topic || `Chat sin título${id?` · ${id}`:''}`;
    const message=`${agent} · «${title}» — tarea completada.`;
    const distinctTask=task && task!==topic ? task : '';
    const detailPrefix=distinctTask?'\nTarea: ':'\nDetalle: ';
    const detail=clean(distinctTask||text,Math.max(0,512-message.length-detailPrefix.length));
    return `${message}${detail?detailPrefix+detail:''}`;
  }
  if(state==='notification')return clean(`${prefix}: ${text||task||'Necesita tu atención'}`,512);
  if(state==='error')return clean(`${prefix}: ${text||task||'La tarea terminó con un error'}`,512);
  return '';
}
module.exports={formatAgentEvent};

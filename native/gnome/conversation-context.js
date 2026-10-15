"use strict";
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const LIMIT = 1024 * 1024;
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function family(id) {
  id = text(id).toLowerCase();
  return ['antigravity','codex','claude','cursor','kiro','gemini'].find(name => id.includes(name)) || id;
}
// Read bounded metadata windows. Do not load whole conversation transcripts.
function windows(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size, ranges = [[0, Math.min(size, LIMIT)]];
    if (size > LIMIT) ranges.push([Math.max(LIMIT, size-LIMIT), Math.min(LIMIT, size-LIMIT)]);
    return ranges.map(([offset, size]) => {
      const bytes = Buffer.alloc(size), count = fs.readSync(fd, bytes, 0, size, offset);
      const lines = bytes.toString('utf8',0,count).split('\n');
      if (offset) lines.shift(); // The first record may start before this window.
      return lines;
    }).flat();
  } catch { return []; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function records(file) {
  return windows(file).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}
function query(file, select) {
  let db;
  try {
    if (!fs.existsSync(file)) return null;
    db = new DatabaseSync(file, {readOnly:true, timeout:30});
    return select(db);
  } catch { return null; }
  finally { try { db?.close(); } catch {} }
}
function createConversationContext({home=os.homedir(), codexHome=path.join(home,'.codex'),
  claudeHome=path.join(home,'.claude'), now=Date.now}={}) {
  const contexts = new Map();
  function codexTitle(id) {
    let databases = [];
    try { databases = fs.readdirSync(codexHome).filter(name=>/^state_\d+\.sqlite$/.test(name))
      .sort((a,b)=>Number(b.match(/\d+/)[0])-Number(a.match(/\d+/)[0])); } catch {}
    let stored = '';
    for (const database of databases.slice(0,3)) {
      const row = query(path.join(codexHome,database), db => {
        const columns = db.prepare('PRAGMA table_info(threads)').all().map(c=>c.name);
        if (!columns.includes('id') || !columns.includes('title')) return null;
        return db.prepare(`SELECT title${columns.includes('name')?', name':''} FROM threads WHERE id = ?`).get(id);
      });
      // Desktop's visible/renamed chat name overrides its original first prompt.
      if (text(row?.name)) return {title:text(row.name), source:'codex-name'};
      stored ||= text(row?.title);
      if(row)break;
    }
    const index = records(path.join(codexHome,'session_index.jsonl')).reverse()
      .find(row=>row.id===id && text(row.thread_name));
    if (index) return {title:text(index.thread_name), source:'codex-index'};
    return stored ? {title:stored, source:'codex-title'} : null;
  }
  function antigravityTitle(id) {
    for (const directory of ['antigravity','antigravity-ide','antigravity-cli']) {
      const row = query(path.join(home,'.gemini',directory,'conversation_summaries.db'),
        db=>db.prepare('SELECT title FROM conversation_summaries WHERE conversation_id = ?').get(id));
      if (text(row?.title)) return {title:text(row.title),source:'antigravity-summary'};
    }
    return null;
  }
  function claudeTitle(id, suppliedPath) {
    const projects = path.join(claudeHome,'projects');
    let files = [];
    if (text(suppliedPath)) files.push(suppliedPath);
    else try { files = fs.readdirSync(projects,{withFileTypes:true}).filter(d=>d.isDirectory()).slice(0,512)
      .map(d=>path.join(projects,d.name,`${id}.jsonl`)); } catch {}
    for (const file of files) {
      try {
        const real = fs.realpathSync(file), root = fs.realpathSync(projects);
        if (!real.startsWith(root+path.sep) || path.basename(real)!==`${id}.jsonl`) continue;
        const record = records(real).reverse().find(row=>row.type==='custom-title' &&
          (!row.sessionId || row.sessionId===id) && text(row.customTitle));
        if (record) return {title:text(record.customTitle),source:'claude-custom-title'};
      } catch {}
    }
    return null;
  }
  function enrich(event) {
    const agent = family(event.agentId), session = text(event.sessionId).replace(/^codex:/,'');
    const usable = session && session!==agent && session!=='claude-code';
    const key = `${agent}:${session}`, timestamp=now();
    for (const [id,value] of contexts) if (timestamp-value.at>86400000) contexts.delete(id);
    const previous = usable ? contexts.get(key) || {} : {};
    const transcriptPath = text(event.transcriptPath) || previous.transcriptPath || '';
    let resolved = null;
    if (UUID.test(session) && (!previous.checkedAt || timestamp-previous.checkedAt>2000 || event.state==='complete')) {
      if (agent==='codex') resolved=codexTitle(session);
      if (agent==='antigravity') resolved=antigravityTitle(session);
      if (agent==='claude') resolved=claudeTitle(session,transcriptPath);
    }
    const explicit = text(event.conversationTitle) || text(event.conversation_title) ||
      text(event.chatTitle) || text(event.chat_title) || text(event.conversation_name) ||
      (!event.conversationNameIsFallback ? text(event.conversationName) : '') || text(event.conversation) || text(event.topic) || text(event.title);
    const title = resolved?.title || explicit || previous.title || '';
    const source = resolved?.source || (explicit ? 'event-title' : previous.source) || 'unavailable';
    const task = text(event.task) || (event.state==='thinking' && ['complete','idle','error'].includes(previous.state) ? '' : previous.task) || '';
    if (usable) {
      contexts.delete(key);
      contexts.set(key,{title,source,task,transcriptPath,state:event.state,at:timestamp,
        checkedAt:resolved || !previous.checkedAt || timestamp-previous.checkedAt>2000 ? timestamp : previous.checkedAt});
      while (contexts.size>256) contexts.delete(contexts.keys().next().value);
    }
    return {...event, conversationName:title, conversationTitleSource:source,
      conversationId:usable ? session : '', task};
  }
  return {enrich, clear(){contexts.clear();}};
}
module.exports={createConversationContext};

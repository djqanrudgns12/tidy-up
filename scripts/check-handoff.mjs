import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
const state=JSON.parse(fs.readFileSync(path.join(root,'docs/wiki/asset-state.json'),'utf8'));
for(const a of state.assets){
  if(!a.sourcePresent)continue;
  const full=path.resolve(root,a.source);
  if(!full.startsWith(root+path.sep)||!fs.existsSync(full)){errors.push(`Missing/nonportable original: ${a.id}`);continue;}
  const hash=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  if(hash!==a.sha256)errors.push(`Original changed; sync inventory: ${a.id}`);
}
const docs=['handoff.md','AGENTS.md',...fs.readdirSync(path.join(root,'docs/wiki')).filter(p=>p.endsWith('.md')).map(p=>`docs/wiki/${p}`)];
for(const p of docs){
 const text=fs.readFileSync(path.join(root,p),'utf8');
 for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  const target=m[1].split('#')[0];if(!target||/^(https?:|mailto:)/.test(target))continue;
  if(!fs.existsSync(path.resolve(root,path.dirname(p),target)))errors.push(`Broken link in ${p}: ${target}`);
 }
}
const graph=JSON.parse(fs.readFileSync(path.join(root,'docs/wiki/work-tree.json'),'utf8'));
const ids=new Set(graph.tasks.map(t=>t.id));
for(const t of graph.tasks)if(!fs.existsSync(path.join(root,t.guide)))errors.push(`Missing task guide: ${t.id}`);
const prompts=JSON.parse(fs.readFileSync(path.join(root,'docs/ASSET_PROMPTS.json'),'utf8'));
for(const pending of prompts.pending){
  if(state.assets.some(a=>a.id===pending.id && a.sourcePresent))errors.push(`Duplicate generation request: ${pending.id}`);
}
for(const t of graph.tasks)for(const id of t.dependsOn)if(!ids.has(id))errors.push(`Unknown dependency ${t.id} -> ${id}`);
const visiting=new Set(),visited=new Set();
function visit(id){if(visiting.has(id)){errors.push(`Dependency cycle: ${id}`);return;}if(visited.has(id))return;visiting.add(id);for(const d of graph.tasks.find(t=>t.id===id).dependsOn)visit(d);visiting.delete(id);visited.add(id);}
for(const t of graph.tasks)visit(t.id);
console.log(JSON.stringify({originalsChecked:state.summary.localOriginals,documentsChecked:docs.length,tasksChecked:ids.size,errors},null,2));
if(errors.length)process.exitCode=1;

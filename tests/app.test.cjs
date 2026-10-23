const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const rootDir=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(rootDir,name),'utf8');
function create(stored={},blocked=false,reduced=false){
 const nodes={},callbacks={};let frame;const clock={now:new Date(2026,9,23,9).getTime()};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]))}static now(){return clock.now}}
 const element=()=>({style:{},children:[],hidden:false,value:'08:00',textContent:'',innerHTML:'',className:'',attrs:{},dataset:{},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=[...items]},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}});
 const root=element();root.querySelector=s=>nodes[s]||(nodes[s]=element());root.isConnected=true;
 const document={getElementById:id=>{assert.equal(id,'morning-workout-animated');return root},createElement:element};
 const window={matchMedia:()=>({matches:reduced})};
 const context={document,window,Date:FakeDate,Math,Number,String,Array,JSON,Object,URL,navigator:{},location:{protocol:'file:'},requestAnimationFrame:f=>{frame=f},setInterval:f=>{const id=Object.keys(callbacks).length+1;callbacks[id]=f;return id},clearInterval:id=>{delete callbacks[id]},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return stored[k]||null},setItem:(k,v)=>{if(blocked)throw Error('blocked');stored[k]=v}}};
 vm.createContext(context);for(const name of ['exercises.js','poses.js','app.js'])vm.runInContext(read(name),context);
 const val=n=>nodes['[data-value="'+n+'"]'],act=n=>nodes['[data-action="'+n+'"]'];
 const choose=i=>{val('exercise-picker').value=String(i);val('exercise-picker').onchange()};
 return {val,act,choose,clock,stored,window,frame:time=>frame(time),tick:()=>Object.values(callbacks).forEach(f=>f())};
}
const t=create(),ex=t.window.WORKOUT_EXERCISES,poses=t.window.WORKOUT_POSES;
assert.equal(ex.length,15);const nhs=ex.filter(e=>e.group==='nhs');assert.equal(nhs.length,12);
assert.deepEqual(Array.from(nhs,e=>e.sourceNumber),Array.from({length:12},(_,i)=>i+1));
for(const e of nhs){assert.equal(e.defaultReps,null);assert(e.source.url.includes('#page='));}
for(const e of ex){
 assert(poses.names.includes(e.pose));const frames=[0,.5,1,1.7,2.8,4,5.8,7.2,9].map(s=>poses.frame(e.pose,s));
 for(const f of frames){assert(f.svg.includes('<path'));assert(!/NaN|undefined|Infinity/.test(f.svg));assert(f.phase);assert(f.detail);}
 assert(new Set(frames.map(f=>f.svg)).size>1,'movement missing: '+e.id);
 t.choose(ex.indexOf(e));assert.equal(t.val('exercise-name').textContent,e.name);assert.equal(t.val('exercises').children.length,1);
 assert.equal(t.val('exercises').children[0].children[0].textContent,e.name);
 if(e.group==='nhs')assert.equal(t.val('exercise-source').href,e.source.url);
}
for(const name of ['hipstretch','legstretch'])assert.equal(poses.frame(name,3).svg,poses.frame(name,6).svg,'stretch must hold, not bounce');
for(const blocked of [false,true])for(const reduced of [false,true]){
 const a=create({},blocked,reduced);a.choose(0);a.act('start').onclick();const initial=a.val('movement-art').innerHTML;
 for(let n=1;n<=20;n++)a.frame(n*100);
 assert.equal(a.val('movement-art').innerHTML===initial,reduced);
 a.act('pause').onclick();const frozen=a.val('movement-art').innerHTML;a.frame(9000);assert.equal(a.val('movement-art').innerHTML,frozen);
 a.act('reset').onclick();assert.equal(a.val('timer').textContent,'05:00');
 a.act('start').onclick();a.clock.now+=301000;a.tick();assert.equal(a.val('timer').textContent,'00:00');
 a.choose(0);const check=a.val('exercises').children[0].children[1].children[1].children[2].children[0];check.checked=true;check.onchange();assert.equal(a.val('progress').textContent,'Отмечено подходов за день: 1');
 if(!blocked){a.choose(6);const reload=create(a.stored);assert.equal(reload.val('exercise-name').textContent,ex[6].name);assert.equal(reload.val('progress').textContent,'Отмечено подходов за день: 1');}
}
const sets=()=>Array.from({length:3},()=>({reps:10,done:false}));const old=[sets(),sets(),sets(),sets()];old[3][0].done=true;
const legacy=create({'morning-workout-studio-v1':JSON.stringify({days:{'2026-10-23':old}})});legacy.choose(6);
const saved=JSON.parse(legacy.stored['morning-workout-studio-v1']);assert.equal(saved.days['2026-10-23']['abdominal-crunch'][0].done,true);assert.equal(saved.days['2026-10-23']['pelvic-tilt'][0].done,false);
create({'morning-workout-studio-v1':'{invalid'});
const ids=Array.from(read('index.html').matchAll(/data-(?:value|action)="([^"]+)"/g),m=>m[1]);
for(const match of read('app.js').matchAll(/(?:value|action)\('([^']+)'\)/g))assert(ids.includes(match[1]),'missing element '+match[1]);
assert(read('index.html').indexOf('poses.js')<read('index.html').indexOf('app.js'));
for(const name of ['style.css','exercises.js','poses.js','app.js']){assert(read('index.html').includes('./'+name+'?v=4'));assert(read('sw.js').includes('./'+name+'?v=4'));}assert(read('sw.js').includes("cache:'no-store'"));assert(read('sw.js').includes('workout-studio-v4'));
for(const icon of JSON.parse(read('manifest.webmanifest')).icons)assert(fs.existsSync(path.join(rootDir,icon.src)));
console.log('PASS: 15 distinct animations; all 12 NHS numbers/sources; static stretch holds; seconds fields; selector, timer, pause/reset, persistence, legacy migration, corrupt/blocked storage, reduced motion and offline asset list.');

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const rootDir=path.resolve(__dirname,'..');
const registry=fs.readFileSync(path.join(rootDir,'exercises.js'),'utf8'),app=fs.readFileSync(path.join(rootDir,'app.js'),'utf8');
function create(stored={},blocked=false,reduced=false,extend=false){
 const nodes={},callbacks={};let frame;const clock={now:new Date(2026,9,23,9,0).getTime()};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]))}static now(){return clock.now}}
 const element=()=>({style:{},children:[],hidden:false,value:'08:00',textContent:'',className:'',attrs:{},dataset:{},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=[...items]},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return k==='data-exercise'?this.dataset.exercise:this.attrs[k]}});
 const root=element();root.querySelector=s=>nodes[s]||(nodes[s]=element());root.isConnected=true;root.querySelectorAll=s=>{assert.equal(s,'[data-exercise]');return nodes['[data-value="exercise-picker"]']?.children||[]};
 const document={getElementById:id=>{assert.equal(id,'morning-workout-animated');return root},createElement:element};
 const window={matchMedia:()=>({matches:reduced})};
 const context={document,window,Date:FakeDate,Math,Number,String,Array,JSON,URL,navigator:{},location:{protocol:'file:'},requestAnimationFrame:f=>{frame=f},setInterval:f=>{const id=Object.keys(callbacks).length+1;callbacks[id]=f;return id},clearInterval:id=>{delete callbacks[id]},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return stored[k]||null},setItem:(k,v)=>{if(blocked)throw Error('blocked');stored[k]=v}}};
 vm.createContext(context);vm.runInContext(registry,context);
 if(extend)window.WORKOUT_EXERCISES=[...window.WORKOUT_EXERCISES,{id:'future',name:'Новое упражнение',position:'Сидя',pose:'ankles',defaultReps:null,description:'Тест'}];
 vm.runInContext(app,context);
 const val=n=>nodes['[data-value="'+n+'"]'],act=n=>nodes['[data-action="'+n+'"]'],part=n=>nodes['[data-part="'+n+'"]'];
 return {val,act,part,clock,stored,root,window,frame:time=>frame(time),tick:()=>Object.values(callbacks).forEach(f=>f())};
}
for(const blocked of [false,true])for(const reduced of [false,true]){
 const t=create({},blocked,reduced),choices=t.val('exercise-picker').children;
 assert.equal(choices.length,4);assert.equal(t.val('exercises').children.length,4);assert.equal(t.val('days').children.length,7);
 const pressInput=t.val('exercises').children[3].children[1].children[1].children[0].children[0];assert.equal(pressInput.value,'');
 for(let i=0;i<4;i++){
  choices[i].onclick();assert.equal(choices[i].attrs['aria-pressed'],'true');assert.equal(t.val('exercise-name').textContent,t.window.WORKOUT_EXERCISES[i].name);
  t.act('start').onclick();const initial=t.part(i===3?'head':'front-foot').attrs[i===3?'cy':'d'];
  let moved=false;for(let n=1;n<=60;n++){t.frame(n*100+i*10000);if(t.part(i===3?'head':'front-foot').attrs[i===3?'cy':'d']!==initial)moved=true;}
  if(!reduced)assert(moved,'animation '+i+' should move');
  for(const n of ['front-foot','front-leg','back-foot','arm','torso'])assert(!/NaN|undefined/.test(t.part(n).attrs.d));
  t.act('pause').onclick();const paused=t.part('head').attrs.cy;t.frame(100000+i);assert.equal(t.part('head').attrs.cy,paused);
  t.act('reset').onclick();assert.equal(t.val('timer').textContent,'05:00');
 }
 t.act('start').onclick();t.clock.now+=301000;t.tick();assert.equal(t.val('timer').textContent,'00:00');assert.equal(t.val('timer-status').textContent,'Пять минут завершены!');
 const checkbox=t.val('exercises').children[0].children[1].children[1].children[1].children[0];checkbox.checked=true;checkbox.onchange();assert.equal(t.val('progress').textContent,'Выполнено 1 из 12 подходов');
 if(!blocked){
  const reload=create(t.stored);assert.equal(reload.val('progress').textContent,'Выполнено 1 из 12 подходов');
  const extended=create(t.stored,false,false,true);assert.equal(extended.val('exercises').children.length,5);assert.equal(extended.val('progress').textContent,'Выполнено 1 из 15 подходов');
 }
}
create({'morning-workout-studio-v1':'{bad json'});
create({'morning-workout-studio-v1':JSON.stringify({days:{'2026-10-23':{balance:[{reps:-9}]}}})});
const manifest=JSON.parse(fs.readFileSync(path.join(rootDir,'manifest.webmanifest'),'utf8'));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
for(const icon of manifest.icons)assert(fs.existsSync(path.join(rootDir,icon.src)));
assert(!/https?:\/\//.test(fs.readFileSync(path.join(rootDir,'index.html'),'utf8')));
console.log('PASS: 4 animations, session timer, pause/reset, source selection, empty press reps, persistence, new exercise migration, blocked/corrupt storage, reduced motion and Pages-relative assets.');

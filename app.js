
(function(){
  const root=document.getElementById('morning-workout-animated');
  const value=name=>root.querySelector('[data-value="'+name+'"]');
  const action=name=>root.querySelector('[data-action="'+name+'"]');
  const screen=name=>root.querySelector('[data-screen="'+name+'"]');
  const exercises=window.WORKOUT_EXERCISES;
  const names=exercises.map(ex=>ex.name);
  let activeExercise=0,animationSeconds=0,lastFrame=0;
  const weekdays=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const storageKey='morning-workout-studio-v1';
  let data={days:{}},persist=true;
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&saved.days&&typeof saved.days==='object'&&!Array.isArray(saved.days))data={...data,...saved};localStorage.setItem(storageKey,JSON.stringify(data));}catch(e){persist=false;}
  let selected=new Date();selected.setHours(12,0,0,0);
  const dateKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function day(d){
    const key=dateKey(d);
    let stored=data.days[key];
    // Preserve exercise IDs when the library grows; migrate the initial array form.
    if(Array.isArray(stored)){
      const legacyIds=['heel-raise','balance','ankle-pumps','abdominal-crunch'];
      const migrated={};stored.forEach((sets,index)=>{if(legacyIds[index])migrated[legacyIds[index]]=sets;});stored=migrated;
    }
    if(!stored||typeof stored!=='object'||Array.isArray(stored))stored={};
    data.days[key]=stored;
    return exercises.map(exercise=>{
      const sets=stored[exercise.id];
      if(!Array.isArray(sets)||sets.length!==3||sets.some(s=>!s||!(s.reps===null||(Number.isFinite(s.reps)&&s.reps>=1&&s.reps<=999))||typeof s.done!=='boolean')){
        stored[exercise.id]=Array.from({length:3},()=>({reps:exercise.defaultReps,done:false}));
      }
      return stored[exercise.id];
    });
  }

  function save(){
    if(persist)try{localStorage.setItem(storageKey,JSON.stringify(data));}catch(e){persist=false;}
    value('save-status').textContent=persist?'Отметки сохранены в этом браузере.':'Отметки сохраняются только до закрытия этой зарядки.';
  }
  const count=d=>day(d).reduce((n,ex)=>n+ex.filter(s=>s.done).length,0);
  function progress(){value('progress').textContent='Отмечено подходов за день: '+count(selected);}
  function days(){
    value('days').replaceChildren();
    const monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
    weekdays.forEach((name,i)=>{
      const date=new Date(monday);date.setDate(date.getDate()+i);
      const button=document.createElement('button');button.type='button';button.className='btn';
      button.setAttribute('aria-pressed',String(dateKey(date)===dateKey(selected)));
      button.textContent=name+(count(date)>0?' ·':'');
      button.onclick=()=>{selected=date;render();};value('days').append(button);
    });
  }
  function render(){
    days();progress();value('date').textContent=selected.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
    value('exercises').replaceChildren();
    day(selected).forEach((exercise,i)=>{
      if(i!==activeExercise)return;
      const section=document.createElement('section');section.className='exercise-log';
      const heading=document.createElement('h3');heading.textContent=names[i];section.append(heading);
      exercise.forEach((set,j)=>{
        const row=document.createElement('div');row.className='viz-row set-row';
        const label=document.createElement('span');label.textContent=(exercises[i].unit==='seconds'?(exercises[i].group==='cardio'?'Интервал ':'Удержание '):'Подход ')+(j+1);
        const controls=document.createElement('div');controls.className='viz-row';
        const field=document.createElement('div');field.style.width='76px';
        const reps=document.createElement('input');reps.type='number';reps.inputMode='numeric';reps.className='form-control';reps.min='1';reps.max='999';reps.value=set.reps===null?'':set.reps;reps.placeholder='—';
        reps.setAttribute('aria-label',names[i]+(exercises[i].unit==='seconds'?', секунды, подход ':', повторения, подход ')+(j+1));
        reps.onchange=()=>{set.reps=reps.value.trim()===''?null:Math.min(999,Math.max(1,Math.round(Number(reps.value)||1)));reps.value=set.reps===null?'':set.reps;reps.placeholder='—';save();};field.append(reps);
        const checkLabel=document.createElement('label');checkLabel.className='form-check';
        const check=document.createElement('input');check.type='checkbox';check.className='form-check-input';check.checked=set.done;
        check.setAttribute('aria-label',names[i]+', подход '+(j+1)+' выполнен');
        check.onchange=()=>{set.done=check.checked;save();progress();days();};
        const text=document.createElement('span');text.className='form-check-label';text.textContent='Готово';
        checkLabel.append(check,text);const unit=document.createElement('span');unit.className='text-small';unit.textContent=exercises[i].unit==='seconds'?'сек.':'повт.';controls.append(field,unit,checkLabel);row.append(label,controls);section.append(row);
      });value('exercises').append(section);
    });save();
  }
  const validMinutes=n=>Number.isFinite(n)&&n>=1&&n<=180&&Number.isInteger(n);
  let minutes=validMinutes(data.durationMinutes)?data.durationMinutes:5;
  let left=minutes*60,deadline=0,timer=null,timerState='idle';
  value('duration').value=String(minutes);
  function showTime(){value('timer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');}
  function stop(){if(timer!==null)clearInterval(timer);timer=null;}
  function timerUI(state,message){
    timerState=state;value('timer-status').textContent=message;
    action('start').textContent=state==='running'?'Пауза':state==='paused'?'Продолжить':'Старт';
    value('duration').disabled=false;
    action('stop').disabled=state!=='running'&&state!=='paused';
  }
  function tick(){
    left=Math.max(0,Math.ceil((deadline-Date.now())/1000));showTime();
    if(!left){stop();timerUI('finished','Занятие завершено!');}
  }
  function resetTimer(){stop();left=minutes*60;animationSeconds=0;drawPose(0);showTime();timerUI('idle','Можно начинать');}
  function setMinutes(candidate){
    if(!validMinutes(candidate)){
      value('duration').value=String(minutes);
      value('timer-status').textContent='Введи целое число от 1 до 180 минут.';
      return false;
    }
    value('duration').value=String(candidate);
    if(candidate!==minutes){
      minutes=candidate;data.durationMinutes=minutes;save();resetTimer();
      value('timer-status').textContent='Установлено '+minutes+' мин · нажми «Старт»';
    }
    return true;
  }
  value('duration').onchange=()=>setMinutes(Number(value('duration').value));
  value('duration').onblur=value('duration').onchange;
  value('duration').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();value('duration').onchange();}};
  action('apply-minutes').onclick=()=>value('duration').onchange();
  action('minute-minus').onclick=()=>setMinutes(Math.max(1,minutes-1));
  action('minute-plus').onclick=()=>setMinutes(Math.min(180,minutes+1));
  for(const n of [1,5,10,15])action('minutes-'+n).onclick=()=>setMinutes(n);
  action('start').onclick=()=>{
    if(timerState==='running'){
      tick();stop();if(left)timerUI('paused','На паузе · время сохранено');return;
    }
    // Commit a newly typed duration even if Start is clicked before the field loses focus.
    if(timerState!=='paused'){
      if(!value('duration').onchange())return;
      left=minutes*60;animationSeconds=0;drawPose(0);
    }
    deadline=Date.now()+left*1000;lastFrame=0;
    timer=setInterval(tick,250);timerUI('running','Идёт отсчёт');tick();
  };
  action('stop').onclick=()=>{stop();left=0;showTime();timerUI('stopped','Занятие остановлено · «Старт» начнёт заново');};
  action('reset').onclick=resetTimer;
  timerUI('idle','Можно начинать');
  const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function drawPose(seconds){
    const exercise=exercises[activeExercise];
    const frame=window.WORKOUT_POSES.frame(exercise.pose,seconds);
    let rendered=false;
    if(window.WORKOUT_3D){try{value('three-stage').hidden=false;rendered=window.WORKOUT_3D.draw(exercise.pose,seconds);}catch(error){console.warn('3D draw failed',error);}}
    value('three-stage').hidden=!rendered;value('view-controls').hidden=!rendered;
    value('movement').style.display=rendered?'none':'block';
    if(!rendered)value('movement-art').innerHTML=frame.svg;
    value('movement-phase').textContent=rendered?window.WORKOUT_3D.phase:frame.phase;
    value('movement-detail').textContent=frame.detail;
  }
  function selectExercise(index){
    if(!Number.isInteger(index)||index<0||index>=exercises.length)return;
    activeExercise=index;animationSeconds=0;
    const exercise=exercises[index];
    data.lastExercise=exercise.id;
    value('exercise-picker').value=String(index);
    value('exercise-name').textContent=exercise.name;value('movement-title').textContent=exercise.name;
    value('exercise-description').textContent=exercise.description;
    const source=exercise.source;value('exercise-source').hidden=!source;
    value('exercise-origin').textContent=exercise.group==='nhs'?'NHS · '+exercise.sourceNumber+' из 12':exercise.group==='bed'?'В кровати · '+exercise.sourceNumber+' из 10':exercise.group==='cardio'?'Кардио сидя · '+exercise.sourceNumber+' из 10':exercise.group==='weight'?'Контроль веса · '+exercise.sourceNumber+' из 10':'Моя зарядка';
    for(const group of ['personal','nhs','weight','cardio','bed'])action('group-'+group).setAttribute('aria-pressed',String(exercise.group===group));
    value('bed-guidance').hidden=exercise.group!=='bed';
    value('cardio-guidance').hidden=exercise.group!=='cardio';
    value('weight-guidance').hidden=exercise.group!=='weight';
    if(source){value('exercise-source').textContent=source.label;value('exercise-source').href=source.url;}
    value('movement').setAttribute('aria-label',exercise.name+': '+exercise.description);
    const supine=['pelvic','bridge','crunch','rotation','sideleg'].includes(exercise.pose);
    value('movement').setAttribute('viewBox',supine?'20 90 320 155':'0 15 360 235');
    drawPose(exercise.pose==='balance'?2:0);render();
  }
  const groups={personal:document.createElement('optgroup'),nhs:document.createElement('optgroup'),weight:document.createElement('optgroup'),cardio:document.createElement('optgroup'),bed:document.createElement('optgroup')};
  groups.bed.label='В кровати · 10 упражнений';groups.cardio.label='Кардио сидя · 10 упражнений';groups.personal.label='Моя зарядка · 3 упражнения';groups.nhs.label='Памятка NHS · 12 упражнений';groups.weight.label='Контроль веса · 10 упражнений';
  for(const group of ['personal','nhs','weight','cardio','bed'])action('group-'+group).onclick=()=>selectExercise(exercises.findIndex(ex=>ex.group===group));
  exercises.forEach((exercise,index)=>{
    const option=document.createElement('option');option.value=String(index);
    option.textContent=(exercise.sourceNumber?exercise.sourceNumber+'. ':'')+exercise.name;
    groups[exercise.group].append(option);
  });
  value('exercise-picker').append(groups.personal,groups.nhs,groups.weight,groups.cardio,groups.bed);
  value('exercise-picker').onchange=()=>selectExercise(Number(value('exercise-picker').value));
  action('previous').onclick=()=>selectExercise((activeExercise+exercises.length-1)%exercises.length);
  action('next').onclick=()=>selectExercise((activeExercise+1)%exercises.length);
  function animate(now){
    if(timer!==null&&!screen('workout').hidden){
      if(lastFrame)animationSeconds+=Math.min(.1,(now-lastFrame)/1000);
      if(!reducedMotion)drawPose(animationSeconds);
    }
    lastFrame=now;
    if(root.isConnected!==false)requestAnimationFrame(animate);
  }
  if(window.addEventListener)window.addEventListener('workout-3d-ready',()=>drawPose(animationSeconds));
  const savedExercise=exercises.findIndex(ex=>ex.id===data.lastExercise);
  selectExercise(savedExercise>=0?savedExercise:exercises.findIndex(ex=>ex.id==='pelvic-tilt'));requestAnimationFrame(animate);
  showTime();render();
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController=Boolean(navigator.serviceWorker.controller);let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!reloading){reloading=true;location.reload();}});
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
}



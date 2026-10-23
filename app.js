
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
  let data={days:{},reminder:'08:00',enabled:false},persist=true;
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
        const label=document.createElement('span');label.textContent=(exercises[i].unit==='seconds'?'Удержание ':'Подход ')+(j+1);
        const controls=document.createElement('div');controls.className='viz-row';
        const field=document.createElement('div');field.style.width='76px';
        const reps=document.createElement('input');reps.type='number';reps.inputMode='numeric';reps.className='form-control';reps.min='1';reps.max='999';reps.value=set.reps===null?'':set.reps;reps.placeholder='—';
        reps.setAttribute('aria-label',names[i]+(exercises[i].unit==='seconds'?', секунды, удержание ':', повторения, подход ')+(j+1));
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
  let left=300,deadline=0,timer=null;
  function showTime(){value('timer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');}
  function stop(){if(timer!==null)clearInterval(timer);timer=null;}
  function tick(){left=Math.max(0,Math.ceil((deadline-Date.now())/1000));showTime();if(!left){stop();value('timer-status').textContent='Пять минут завершены!';action('start').textContent='Ещё раз';}}
  action('start').onclick=()=>{if(timer!==null)return;if(!left)left=300;deadline=Date.now()+left*1000;timer=setInterval(tick,250);tick();value('timer-status').textContent='Идёт общий таймер занятия';action('start').textContent='Старт';};
  action('pause').onclick=()=>{if(timer===null)return;tick();stop();if(left){value('timer-status').textContent='На паузе';action('start').textContent='Продолжить';}};
  action('reset').onclick=()=>{stop();left=300;animationSeconds=0;drawPose(0);showTime();value('timer-status').textContent='Можно начинать';action('start').textContent='Старт';};
  if(!/^\d{2}:\d{2}$/.test(data.reminder))data.reminder='08:00';
  value('reminder-time').value=data.reminder;
  function reminderLabel(){action('reminder').textContent=data.enabled?'Выключить':'Включить';value('reminder-status').textContent=data.enabled?'На '+data.reminder+' — пока зарядка открыта. При закрытом чате уведомлений нет.':'Выключено';}
  action('reminder').onclick=()=>{data.enabled=!data.enabled;save();reminderLabel();};
  value('reminder-time').onchange=()=>{data.reminder=value('reminder-time').value||'08:00';save();reminderLabel();};
  let lastReminder='';
  setInterval(()=>{if(!data.enabled||screen('workout').hidden)return;const now=new Date(),time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');if(time===data.reminder&&lastReminder!==dateKey(now)){lastReminder=dateKey(now);value('reminder-status').textContent='Пора сделать утреннюю зарядку!';}},1000);
  const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function drawPose(seconds){
    const exercise=exercises[activeExercise];
    const frame=window.WORKOUT_POSES.frame(exercise.pose,seconds);
    value('movement-art').innerHTML=frame.svg;
    value('movement-phase').textContent=frame.phase;
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
    value('exercise-origin').textContent=exercise.group==='nhs'?'NHS · '+exercise.sourceNumber+' из 12':'Моя зарядка';
    if(source){value('exercise-source').textContent=source.label;value('exercise-source').href=source.url;}
    value('movement').setAttribute('aria-label',exercise.name+': '+exercise.description);
    const supine=['pelvic','bridge','crunch','rotation','sideleg'].includes(exercise.pose);
    value('movement').setAttribute('viewBox',supine?'20 90 320 155':'0 15 360 235');
    drawPose(exercise.pose==='balance'?2:0);render();
  }
  const groups={personal:document.createElement('optgroup'),nhs:document.createElement('optgroup')};
  groups.personal.label='Моя зарядка · 3 упражнения';groups.nhs.label='Памятка NHS · 12 упражнений';
  exercises.forEach((exercise,index)=>{
    const option=document.createElement('option');option.value=String(index);
    option.textContent=(exercise.sourceNumber?exercise.sourceNumber+'. ':'')+exercise.name;
    groups[exercise.group].append(option);
  });
  value('exercise-picker').append(groups.personal,groups.nhs);
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
  const savedExercise=exercises.findIndex(ex=>ex.id===data.lastExercise);
  selectExercise(savedExercise>=0?savedExercise:exercises.findIndex(ex=>ex.id==='pelvic-tilt'));requestAnimationFrame(animate);
  action('calendar').onclick=async()=>{
    const when=new Date(),hm=(value('reminder-time').value||'08:00').split(':');when.setHours(Number(hm[0]),Number(hm[1]),0,0);
    if(when.getTime()<Date.now())when.setDate(when.getDate()+1);
    const pad=n=>String(n).padStart(2,'0'),stamp=when.getFullYear()+pad(when.getMonth()+1)+pad(when.getDate())+'T'+pad(when.getHours())+pad(when.getMinutes())+'00';
    const page=new URL('./',location.href).href;
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Workout Studio//RU','BEGIN:VEVENT','UID:workout-'+Date.now()+'@workout.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp,'DURATION:PT5M','RRULE:FREQ=DAILY','SUMMARY:Моя зарядка','URL:'+page,'BEGIN:VALARM','TRIGGER:PT0S','ACTION:DISPLAY','DESCRIPTION:Время зарядки','END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
    try{
      const file=new File([ics],'workout-reminder.ics',{type:'text/calendar'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Ежедневная зарядка'});}
      else{const link=document.createElement('a'),url=URL.createObjectURL(file);link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      value('reminder-status').textContent='Подтверди добавление события в календарь и проверь уведомление.';
    }catch(error){if(error.name!=='AbortError')value('reminder-status').textContent='Создай ежедневное напоминание «Моя зарядка» на '+value('reminder-time').value+' в приложении «Напоминания».';}
  };
  reminderLabel();showTime();render();
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController=Boolean(navigator.serviceWorker.controller);let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!reloading){reloading=true;location.reload();}});
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
}

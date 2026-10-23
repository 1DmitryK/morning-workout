
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
      const migrated={};stored.forEach((sets,index)=>{if(exercises[index])migrated[exercises[index].id]=sets;});stored=migrated;
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
  function progress(){const done=count(selected);value('progress').textContent=done===names.length*3?'Все подходы выполнены ✓':'Выполнено '+done+' из '+(names.length*3)+' подходов';}
  function days(){
    value('days').replaceChildren();
    const monday=new Date();monday.setHours(12,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
    weekdays.forEach((name,i)=>{
      const date=new Date(monday);date.setDate(date.getDate()+i);
      const button=document.createElement('button');button.type='button';button.className='btn';
      button.setAttribute('aria-pressed',String(dateKey(date)===dateKey(selected)));
      button.textContent=name+(count(date)===names.length*3?' ✓':'');
      button.onclick=()=>{selected=date;render();};value('days').append(button);
    });
  }
  function render(){
    days();progress();value('date').textContent=selected.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
    value('exercises').replaceChildren();
    day(selected).forEach((exercise,i)=>{
      const section=document.createElement('section');section.className='exercise-log';
      const heading=document.createElement('button');heading.type='button';heading.className='btn';heading.textContent=names[i];heading.onclick=()=>selectExercise(i);section.append(heading);
      exercise.forEach((set,j)=>{
        const row=document.createElement('div');row.className='viz-row set-row';
        const label=document.createElement('span');label.textContent='Подход '+(j+1);
        const controls=document.createElement('div');controls.className='viz-row';
        const field=document.createElement('div');field.style.width='76px';
        const reps=document.createElement('input');reps.type='number';reps.inputMode='numeric';reps.className='form-control';reps.min='1';reps.max='999';reps.value=set.reps===null?'':set.reps;reps.placeholder='—';
        reps.setAttribute('aria-label',names[i]+', повторения, подход '+(j+1));
        reps.onchange=()=>{set.reps=reps.value.trim()===''?null:Math.min(999,Math.max(1,Math.round(Number(reps.value)||1)));reps.value=set.reps===null?'':set.reps;reps.placeholder='—';save();};field.append(reps);
        const checkLabel=document.createElement('label');checkLabel.className='form-check';
        const check=document.createElement('input');check.type='checkbox';check.className='form-check-input';check.checked=set.done;
        check.setAttribute('aria-label',names[i]+', подход '+(j+1)+' выполнен');
        check.onchange=()=>{set.done=check.checked;save();progress();days();};
        const text=document.createElement('span');text.className='form-check-label';text.textContent='Готово';
        checkLabel.append(check,text);controls.append(field,checkLabel);row.append(label,controls);section.append(row);
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
  const part=name=>root.querySelector('[data-part="'+name+'"]');
  const reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function path(name,d){part(name).setAttribute('d',d);}
  function point(name,x,y){part(name).setAttribute('cx',x);part(name).setAttribute('cy',y);}
  function head(x,y){point('head',x,y);point('eye',x+9,y-2);path('neck','M'+x+','+(y+15)+'L'+x+','+(y+30));}
  function drawPose(seconds){
    const cycle=(seconds%5)/5;
    const rise=(1-Math.cos(cycle*Math.PI*2))/2;
    part('standing-support').style.display=activeExercise>=2?'none':'';
    part('sitting-support').style.display=activeExercise===2?'':'none';
    if(exercises[activeExercise].pose==='crunch'){
      drawCrunch(rise,cycle);return;
    }
    if(activeExercise===2){
      head(93,64);path('torso','M96 96L103 149');
      path('arm','M100 101L120 133L151 144');path('far-arm','M90 101L105 136L145 149');
      path('front-leg','M105 153L177 158L250 195');
      path('back-leg','M98 157L169 167L240 205');
      const angle=(-70+110*rise)*Math.PI/180;
      const toeX=250+39*Math.cos(angle),toeY=195+39*Math.sin(angle);
      const heelX=250-10*Math.cos(angle),heelY=195-10*Math.sin(angle);
      path('front-foot','M'+heelX+' '+heelY+'L'+toeX+' '+toeY);
      path('back-foot','M'+(heelX-10)+' '+(heelY+10)+'L'+(toeX-10)+' '+(toeY+10));point('ankle',250,195);
      value('movement-phase').textContent=rise<.2?'Стопы на себя':rise>.8?'Стопы от себя':cycle<.5?'Движение от себя':'Движение на себя';
      value('movement-detail').textContent='Сидя · движения в голеностопе';
    }else{
      let lift=20*rise,free=0;
      if(activeExercise===1){
        const hold=cycle<.2?(1-Math.cos(cycle/.2*Math.PI))/2:cycle<.8?1:(1+Math.cos((cycle-.8)/.2*Math.PI))/2;
        lift=18*hold;free=hold;
      }
      const x=146,y=lift;
      head(x,61-y);path('torso','M'+x+' '+(94-y)+'L'+x+' '+(148-y));
      path('front-leg','M148 '+(153-y)+'L147 '+(186-y)+'L147 '+(219-y));
      path('front-foot','M137 '+(232-y)+'L146 '+(225-y)+'L179 233');
      const kneeX=137+43*free,kneeY=185-y-20*free,ankleX=137+36*free,ankleY=219-y-31*free;
      path('back-leg','M138 '+(153-y)+'L'+kneeX+' '+kneeY+'L'+ankleX+' '+ankleY);
      path('back-foot','M'+(ankleX-8)+' '+(232-y-34*free)+'L'+(ankleX+28)+' '+(233-61*free));
      part('back-leg').setAttribute('opacity',activeExercise===1?'.8':'.35');
      part('back-foot').setAttribute('opacity',activeExercise===1?'.8':'.35');
      path('arm','M155 '+(96-y)+'L194 '+(119-y*.25)+'L239 112');
      path('far-arm','M137 '+(98-y)+'L126 '+(128-y)+'L132 '+(149-y));point('ankle',147,219-y);
      value('movement-phase').textContent=activeExercise===1?(free>.95?'Удержание на одной ноге':free<.05?'Исходное положение':cycle<.5?'Подъём ноги и пятки':'Возвращение в исходное положение'):(rise<.15?'Пятки опущены':rise>.85?'Пятки подняты':cycle<.5?'Подъём пяток':'Опускание пяток');
      value('movement-detail').textContent=activeExercise===1?'Одна нога согнута · вторая на носке · рука на опоре':'Обе пятки поднимаются · носки остаются на полу';
    }
  }
  function selectExercise(index){
    activeExercise=index;animationSeconds=0;
    root.querySelectorAll('[data-exercise]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.getAttribute('data-exercise'))===index)));
    value('exercise-name').textContent=names[index];value('movement-title').textContent=names[index];
    value('exercise-description').textContent=exercises[index].description;
    const source=exercises[index].source;value('exercise-source').hidden=!source;
    if(source){value('exercise-source').textContent=source.label;value('exercise-source').href=source.url;}

    value('movement').setAttribute('aria-label',names[index]+(index===3?': фигура лёжа делает небольшой подъём головы и плеч':index===2?': сидящая фигура двигает стопы на себя и от себя':': фигура держится рукой за опору'));
    drawPose(index===1?2:0);
  }
  exercises.forEach((exercise,index)=>{
    const button=document.createElement('button');button.type='button';button.className='btn';button.dataset.exercise=String(index);
    const name=document.createElement('span');name.textContent=exercise.name;
    const position=document.createElement('small');position.textContent=exercise.position;
    button.append(name,position);button.onclick=()=>selectExercise(index);value('exercise-picker').append(button);
  });
  function drawCrunch(rise,cycle){
    part('sitting-support').style.display='none';part('standing-support').style.display='none';
    // Rotate the upper trunk about the lower thorax, preserving a small curl.
    const pivot={x:165,y:209},angle=.38*rise;
    const rotate=(x,y)=>({x:pivot.x+(x-pivot.x)*Math.cos(angle)-(y-pivot.y)*Math.sin(angle),y:pivot.y+(x-pivot.x)*Math.sin(angle)+(y-pivot.y)*Math.cos(angle)});
    const shoulder=rotate(103,209),neck=rotate(83,207),skull=rotate(65,207),elbow=rotate(102,176),hand=rotate(60,190);
    point('head',skull.x,skull.y);point('eye',skull.x+3,skull.y-9);
    path('neck','M'+skull.x+' '+skull.y+'L'+neck.x+' '+neck.y);
    path('torso','M'+shoulder.x+' '+shoulder.y+'Q142 '+(207-9*rise)+' 182 214');
    path('front-leg','M182 214L230 150L273 224');path('back-leg','M188 217L239 155L282 226');
    path('front-foot','M269 226L298 226');path('back-foot','M281 230L309 230');
    path('arm','M'+shoulder.x+' '+shoulder.y+'L'+elbow.x+' '+elbow.y+'L'+hand.x+' '+hand.y);
    path('far-arm','M'+(shoulder.x+5)+' '+(shoulder.y+2)+'L'+(elbow.x+8)+' '+(elbow.y+5)+'L'+(hand.x+5)+' '+(hand.y+4));
    point('ankle',273,224);part('back-leg').setAttribute('opacity','.35');part('back-foot').setAttribute('opacity','.35');
    value('movement-phase').textContent=rise<.15?'Голова и плечи опущены':rise>.85?'Небольшой подъём головы и груди':cycle<.5?'Медленный подъём':'Медленное опускание';
    value('movement-detail').textContent='Колени согнуты · стопы на полу · без полного подъёма корпуса';
  }

  function animate(now){
    if(timer!==null&&!screen('workout').hidden){
      if(lastFrame)animationSeconds+=Math.min(.1,(now-lastFrame)/1000);
      if(!reducedMotion)drawPose(animationSeconds);
    }
    lastFrame=now;
    if(root.isConnected!==false)requestAnimationFrame(animate);
  }
  selectExercise(0);requestAnimationFrame(animate);
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
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

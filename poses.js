'use strict';
// Original schematic drawings. Coordinates describe motion, not prescribed range or tempo.
window.WORKOUT_POSES=(()=>{
 const ink='var(--foreground)',blue='var(--viz-series-1)',soft='var(--muted-foreground)',floor='var(--border)';
 const fmt=n=>Math.round(n*100)/100;
 const pt=p=>fmt(p[0])+' '+fmt(p[1]);
 const path=(d,c=ink,w=11,opacity=1)=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+opacity+'"/>';
 const line=(points,c=ink,w=11,o=1)=>path('M'+points.map(pt).join('L'),c,w,o);
 const circle=(p,r,c=ink,o=1)=>'<circle cx="'+fmt(p[0])+'" cy="'+fmt(p[1])+'" r="'+r+'" fill="'+c+'" opacity="'+o+'"/>';
 const head=(p,angle=0)=>circle(p,16)+circle([p[0]+9*Math.cos(angle),p[1]+9*Math.sin(angle)],2,'var(--background)');
 const body=(points)=>line(points,blue,24);
 const ground=()=>line([[28,235],[333,235]],floor,2);
 const chair=()=>path('M72 103V163H149M81 163V235M137 163V235',soft,4);
 const support=()=>path('M245 235V105H287V235M245 162H287',soft,4);
 const wall=(x=287)=>line([[x,30],[x,235]],soft,4);
 const foot=(ankle,toe,c=blue,o=1)=>line([[ankle[0]-7,ankle[1]+8],ankle,toe],c,9,o);
 const wave=(seconds,length=6)=>{const cycle=(seconds%length)/length;return{cycle,rise:(1-Math.cos(cycle*Math.PI*2))/2}};
 const held=(cycle)=>cycle<.25?(1-Math.cos(cycle/.25*Math.PI))/2:cycle<.65?1:(1+Math.cos((cycle-.65)/.35*Math.PI))/2;
 const phase=(rise,cycle)=>rise<.12?'Исходное положение':rise>.88?'Верхнее положение':cycle<.5?'Подъём':'Возвращение';
 function supine(rise,{bridge=false,pelvic=false,crunch=false}={}){
  const hip=[183,214-(bridge?65*rise:0)],shoulder=[104,211];
  const a=crunch?.38*rise:0,pivot=[164,210];
  const rotate=p=>[pivot[0]+(p[0]-pivot[0])*Math.cos(a)-(p[1]-pivot[1])*Math.sin(a),pivot[1]+(p[0]-pivot[0])*Math.sin(a)+(p[1]-pivot[1])*Math.cos(a)];
  const sh=rotate(shoulder),skull=rotate([64,208]);
  let svg=ground();
  svg+=line([[hip[0]+5,hip[1]+3],[239,156],[281,226]],ink,10,.35)+foot([281,226],[308,232],blue,.35);
  svg+=path('M'+pt(sh)+'Q'+pt([143,pelvic?197+16*rise:(sh[1]+hip[1])/2-3])+' '+pt(hip),blue,24);
  svg+=line([hip,[231,151],[274,226]])+foot([274,226],[301,232]);
  svg+=line([sh,rotate([84,208])],ink,10)+head(skull,-Math.PI/2);
  if(crunch){svg+=line([sh,rotate([101,175]),rotate([60,191])],ink,9);}
  else{svg+=line([sh,[131,224],[169,226]],ink,9);}
  if(pelvic){svg+=path('M133 217Q151 '+(203+12*rise)+' 169 217',soft,2);svg+=circle([179,hip[1]-2],5,blue);}
  return svg;
 }
 function standing(rise,balance,cycle){
  const f=balance?held(cycle):0,lift=(balance?18*f:20*rise),headP=[146,61-lift];
  const sh=[146,94-lift],hip=[146,149-lift],ankle=[147,219-lift];
  let svg=ground()+support();
  svg+=line([[138,153-lift],[137+43*f,185-lift-20*f],[137+36*f,219-lift-31*f]],ink,10,balance?.75:.35);
  svg+=line([[129+36*f,232-lift-34*f],[165+36*f,233-61*f]],blue,9,balance?.75:.35);
  svg+=body([sh,hip])+line([hip,[147,186-lift],ankle]);
  svg+=line([[137,232-lift],[146,225-lift],[179,233]],blue,10);
  svg+=line([sh,[194,119-lift*.25],[245,112]],ink,9)+line([sh,[127,128-lift],[132,150-lift]],ink,8,.3);
  svg+=line([[146,77-lift],sh],ink,9)+head(headP);
  return svg;
 }
 function seated(rise,kind){
  const hip=[103,153],lean=kind==='hipstretch'?20*rise:0,sh=[96+lean,96+8*rise*(kind==='hipstretch')];
  let svg=ground()+chair()+body([sh,hip])+line([sh,[93+lean,81+8*rise*(kind==='hipstretch')]],ink,9)+head([93+lean,64+8*rise*(kind==='hipstretch')]);
  if(kind==='hipstretch'){
   svg+=line([hip,[151,164],[151,225]])+foot([151,225],[178,232]);
   // Perspective front/side view: ankle rests over opposite thigh, raised knee opens sideways.
   svg+=line([[106,153],[189,144],[144,154]],blue,11)+line([[141,154],[129,158]],blue,9);
   svg+=line([sh,[129+lean*.4,124+lean*.3],[153,151]],ink,9);
   svg+=line([sh,[112+lean*.4,129+lean*.3],[135,151]],ink,8,.35);
  }else{
   const angle=kind==='legstretch'?-Math.PI/2*rise:(-70+110*rise)*Math.PI/180;
   const ankle=kind==='legstretch'?[144+106*rise,226-31*rise]:[250,195],toe=[ankle[0]+37*Math.cos(angle),ankle[1]+37*Math.sin(angle)];
   if(kind==='legstretch'){
    svg+=line([hip,[139,164],[144,226]],ink,10,.35)+foot([144,226],[170,232],blue,.35);
   }else svg+=line([[98,157],[169,168],[240,205]],ink,10,.35)+line([[240-9*Math.cos(angle),205-9*Math.sin(angle)],[240+37*Math.cos(angle),205+37*Math.sin(angle)]],blue,9,.35);
   const knee=kind==='legstretch'?[139+38*rise,164-6*rise]:[177,158];
   svg+=line([hip,knee,ankle])+line([[ankle[0]-9*Math.cos(angle),ankle[1]-9*Math.sin(angle)],toe],blue,10);
   svg+=line([sh,[120,133],[151,145]],ink,9);
  }
  return svg;
 }
 function sideleg(rise){
  const h=[65,181],shoulder=[103,196],hip=[183,197],ankle=[305,207-85*rise];
  let svg=ground()+head(h,-Math.PI/2)+line([[82,185],shoulder],ink,9)+body([shoulder,hip]);
  svg+=line([hip,[225,221],[273,228]],ink,10,.4)+foot([273,223],[292,233],blue,.4);
  svg+=line([hip,[244,202-42*rise],ankle],ink,11)+line([ankle,[322,209-85*rise]],blue,10);
  svg+=line([shoulder,[101,165],[69,166]],ink,9)+line([[109,190],[128,215],[153,224]],ink,9);
  return svg;
 }
 function rotation(cycle){
  const twist=Math.sin(cycle*Math.PI*2),shift=19*twist;
  let svg=ground();
  // Oblique overhead view: pelvis and feet stay fixed while raised chest turns.
  svg+=line([[168,174],[205,120],[258,213]],ink,10,.4)+line([[184,190],[234,142],[277,229]],ink,11);
  svg+=line([[255,214],[279,215]],blue,9,.45)+line([[274,230],[301,231]],blue,9);
  svg+=path('M'+pt([99+shift*.35,173-6*Math.abs(twist)])+'Q'+pt([135+shift*.15,159])+' 176 187',blue,25);
  svg+=line([[100+shift*.35,173],[84+shift*.5,157]],ink,9)+head([70+shift*.6,144],-Math.PI/2);
  svg+=line([[100+shift*.35,173],[112+shift,131],[74+shift*.6,132]],ink,9);
  svg+=line([[105+shift*.35,180],[67+shift,181],[60+shift*.6,151]],ink,8,.6);
  return svg;
 }
 function squat(rise){
  const hip=[278,147+39*rise],sh=[278,94+39*rise],knee=[264-44*rise,189+5*rise];
  let svg=ground()+wall(295);
  svg+=line([[hip[0]+5,hip[1]+2],[knee[0]+8,knee[1]+3],[237,222]],ink,10,.35)+foot([237,222],[209,232],blue,.35);
  svg+=body([sh,hip])+line([hip,knee,[229,221]])+foot([229,221],[201,232]);
  svg+=line([sh,[278,78+39*rise]],ink,9)+head([278,62+39*rise],Math.PI);
  svg+=line([sh,[235,116+39*rise],[217,135+39*rise]],ink,9);
  return svg;
 }
 function wallpush(rise){
  const ankle=[133,222],hip=[149+25*rise,152],sh=[164+48*rise,90],skull=[170+53*rise,59];
  let svg=ground()+wall(283);
  svg+=line([[hip[0]-7,154],[131+10*rise,188],[124,222]],ink,10,.35)+foot([124,222],[146,232],blue,.35);
  svg+=body([sh,hip])+line([hip,[(hip[0]+ankle[0])/2,188],ankle])+foot(ankle,[157,232]);
  svg+=line([sh,skull],ink,9)+head(skull);
  // Hands remain on the wall; elbows bend as the torso approaches it.
  svg+=line([sh,[222+7*rise,99+40*rise],[281,97]],ink,10);
  return svg;
 }
 function quadruped(kind,rise,cycle,seconds){
  let sh=[119,133],hip=[220,137],knee=[220,221],headP=[91,139],svg=ground();
  const h=kind==='hover'?5*held(cycle):0;
  if(kind==='hover'){sh=[119,133-h];hip=[220,137-h];knee=[220,221-h];headP=[91,139-h];}
  if(kind==='cat'){
   const arch=(rise-.5)*50;
   svg+=path('M119 133Q170 '+(132-arch)+' 220 137',blue,24);
   headP=[92,137+22*rise];
  }else svg+=body([sh,hip]);
  svg+=line([sh,[120,181],[121,225]],ink,10)+line([[115,228],[93,228]],blue,9);
  svg+=line([hip,knee,[274,228]],ink,11)+line([[274,228],[278,214]],blue,9);
  if(kind==='birddog'){
   const side=Math.floor(seconds/6)%2,extension=held(cycle);
   const armEnd=[116-77*extension,225-104*extension],legEnd=[274+51*extension,228-91*extension];
   svg+=line([[sh[0]+5,sh[1]+2],[119-37*extension,181-52*extension],armEnd],blue,10,side?.45:1);
   svg+=line([[hip[0]+5,hip[1]+2],[220+53*extension,221-84*extension],legEnd],ink,11,side?1:.45);
   svg+=line([legEnd,[legEnd[0]+15,legEnd[1]+2]],blue,9,side?1:.45);
  }else{
   svg+=line([[125,136-h],[135,181],[136,225]],ink,9,.35);
   svg+=line([[227,139-h],[230,221-h],[284,228]],ink,9,.35);
  }
  svg+=line([sh,[108,133-h]],ink,10)+head(headP,2.8);
  return svg;
 }
 const all={
  heels:s=>{const w=wave(s);return{svg:standing(w.rise,false,w.cycle),phase:phase(w.rise,w.cycle),detail:'Две стопы · рука на опоре'}},
  balance:s=>{const w=wave(s);return{svg:standing(w.rise,true,w.cycle),phase:held(w.cycle)>.97?'Удержание':phase(held(w.cycle),w.cycle),detail:'Одна нога · рука на опоре'}},
  ankles:s=>{const w=wave(s);return{svg:seated(w.rise,'ankles'),phase:w.rise<.2?'На себя':w.rise>.8?'От себя':w.cycle<.5?'От себя':'На себя',detail:'Движение стоп'}},
  pelvic:s=>{const w=wave(s);return{svg:supine(w.rise,{pelvic:true}),phase:w.rise>.7?'Поясница ближе к поверхности':w.rise<.3?'Небольшой прогиб':'Наклон таза',detail:'Небольшое движение таза'}},
  bridge:s=>{const w=wave(s);return{svg:supine(w.rise,{bridge:true}),phase:phase(w.rise,w.cycle),detail:'Стопы и плечи на поверхности'}},
  sideleg:s=>{const w=wave(s,8),r=held(w.cycle);return{svg:sideleg(r),phase:r>.97?'Удержание':phase(r,w.cycle),detail:'Прямая верхняя нога · согнутая нижняя'}},
  crunch:s=>{const w=wave(s);return{svg:supine(w.rise,{crunch:true}),phase:phase(w.rise,w.cycle),detail:'Небольшой подъём головы и груди'}},
  rotation:s=>{const w=wave(s,8),t=Math.sin(w.cycle*Math.PI*2);return{svg:rotation(w.cycle),phase:Math.abs(t)<.2?'Центр':t>0?'В одну сторону':'В другую сторону',detail:'Голова и грудь приподняты · таз неподвижен'}},
  squat:s=>{const w=wave(s),r=held(w.cycle);return{svg:squat(r),phase:r>.97?'Удержание':r<.05?'Исходное положение':w.cycle<.5?'Вниз вдоль стены':'Возвращение вверх',detail:'Спина у стены'}},
  wallpush:s=>{const w=wave(s);return{svg:wallpush(w.rise),phase:w.rise>.8?'Руки согнуты':w.rise<.2?'Руки выпрямлены':w.cycle<.5?'К стене':'От стены',detail:'Ладони остаются на стене'}},
  cat:s=>{const w=wave(s,8);return{svg:quadruped('cat',w.rise,w.cycle,s),phase:w.rise>.7?'Округление':w.rise<.3?'Прогиб':'Плавное движение',detail:'Ладони под плечами · колени под тазом'}},
  birddog:s=>{const w=wave(s);return{svg:quadruped('birddog',w.rise,w.cycle,s),phase:held(w.cycle)>.97?'Удержание':phase(held(w.cycle),w.cycle),detail:Math.floor(s/6)%2?'Другая пара руки и ноги':'Противоположные рука и нога'}},
  hover:s=>{const w=wave(s),r=held(w.cycle);return{svg:quadruped('hover',r,w.cycle,s),phase:r>.97?'Колени чуть над полом':r<.05?'Колени на полу':'Небольшой подъём',detail:'Опора на ладони и носки · это не обычная планка'}},
  hipstretch:s=>{const w=wave(s,8),r=s<2?Math.min(1,s/2):1;return{svg:seated(r,'hipstretch'),phase:s<2?'Небольшой наклон':'Удержание растяжки',detail:'Стопа на противоположном бедре'}},
  legstretch:s=>({svg:seated(Math.min(1,s/2),'legstretch'),phase:s<2?'Выпрямление ноги':'Удержание растяжки',detail:'Одна нога прямая · носок на себя'})
 };
 return Object.freeze({names:Object.freeze(Object.keys(all)),frame:(pose,seconds)=>{if(!all[pose])throw new Error('Unknown pose: '+pose);return all[pose](Math.max(0,seconds));}});
})();

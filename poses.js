'use strict';
// Original articulated human illustrations with clothing and skin. Coordinates describe motion, not prescribed range or tempo.
window.WORKOUT_POSES=(()=>{
 const ink='var(--foreground)',blue='var(--viz-series-1)',soft='var(--muted-foreground)',floor='var(--border)';
 const fmt=n=>Math.round(n*100)/100;
 const pt=p=>fmt(p[0])+' '+fmt(p[1]);
 const path=(d,c=ink,w=11,opacity=1)=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+opacity+'"/>';
 const circle=(p,r,c=ink,o=1)=>'<circle cx="'+fmt(p[0])+'" cy="'+fmt(p[1])+'" r="'+r+'" fill="'+c+'" opacity="'+o+'"/>';
 const skin='#e7b695',skinShadow='#c88e70',shirt='#4c70d8',trousers='#293d62',shoes='#eef2fa';
 const solid=(d,c,o=1)=>'<path d="'+d+'" fill="'+c+'" opacity="'+o+'"/>';
 function tapered(a,b,wa,wb,c){
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,n=[-dy/len,dx/len];
  return solid('M'+pt([a[0]+n[0]*wa,a[1]+n[1]*wa])+'L'+pt([b[0]+n[0]*wb,b[1]+n[1]*wb])+'Q'+pt([b[0]+dx/len*wb,b[1]+dy/len*wb])+' '+pt([b[0]-n[0]*wb,b[1]-n[1]*wb])+'L'+pt([a[0]-n[0]*wa,a[1]-n[1]*wa])+'Q'+pt([a[0]-dx/len*wa,a[1]-dy/len*wa])+' '+pt([a[0]+n[0]*wa,a[1]+n[1]*wa])+'Z',c);
 }
 function line(points,c=ink,w=11,o=1){
  // Keep furniture, thin outlines and magnified finger diagrams as paths.
  if((c===ink||c===blue)&&w>=8&&w<=11){
   let art='';
   if(c===blue&&points.length===3&&Math.hypot(points[2][0]-points[0][0],points[2][1]-points[0][1])<70){
    art=path('M'+points.map(pt).join('L'),trousers,w+3)+path('M'+points.map(pt).join('L'),shoes,w-1);
   }else if(points.length===2){
    if(c===blue){
     const [a,b]=points;
     art=path('M'+pt(a)+'L'+pt(b),trousers,w+3)+path('M'+pt(a)+'L'+pt(b),shoes,w-1)+path('M'+pt([a[0],a[1]+4])+'L'+pt([b[0],b[1]+4]),'#b8c7de',2);
    }else art=tapered(points[0],points[1],w*.56,w*.5,skin);
   }else{
    const arm=w<=9||(c===blue&&w===10),colour=arm?skin:trousers;
    for(let i=0;i<points.length-1;i++)art+=tapered(points[i],points[i+1],arm?(i?5.5:7):(i?8:10),arm?(i?4:5.5):(i?5.5:8),colour);
    if(arm){
     const a=points[0],b=points[1],sleeve=[a[0]+(b[0]-a[0])*.42,a[1]+(b[1]-a[1])*.42];
     art+=tapered(a,sleeve,8,7,shirt)+circle(points[points.length-1],5,skin);
    }else art+=circle(points[1],7,trousers);
   }
   return '<g class="human-limb" data-joints="'+points.map(pt).join(';')+'" opacity="'+o+'">'+art+'</g>';
  }
  return path('M'+points.map(pt).join('L'),c,w,o);
 }
 const head=(p,angle=0,faceLeft=false)=>{
  // Tilt and facing are independent: mirror the face without turning the skull upside down.
  const a=angle*180/Math.PI;
  return '<g class="human-head" transform="translate('+pt(p)+') rotate('+fmt(a)+') scale('+(faceLeft?-1:1)+' 1)">'+
   '<path d="M-8 -9Q-15 -3 -11 8Q-6 17 4 13L9 8L14 5L10 1Q11 -9 2 -13Z" fill="'+skin+'"/>'+
   '<path d="M-11 3Q-18 -7 -7 -15Q4 -21 11 -10L8 -5Q3 -7 0 -6L-5 2Z" fill="#3d302c"/>'+
   '<ellipse cx="-5" cy="3" rx="3" ry="4" fill="'+skinShadow+'"/>'+
   '<circle cx="7" cy="-2" r="1.3" fill="#3c3736"/>'+
   '<path d="M7 8L10 7" fill="none" stroke="#a86654" stroke-width="1.3" stroke-linecap="round"/></g>';
 };
 function body(points){
  const a=points[0],b=points[points.length-1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,n=[-dy/len,dx/len];
  const off=(p,k)=>[p[0]+n[0]*k,p[1]+n[1]*k];
  const middle=[a[0]+dx*.55,a[1]+dy*.55];
  return '<g class="human-torso">'+solid('M'+pt(off(a,17))+'Q'+pt(off(middle,17))+' '+pt(off(b,12))+'L'+pt(off(b,-12))+'Q'+pt(off(middle,-17))+' '+pt(off(a,-17))+'Q'+pt([a[0]-dx/len*7,a[1]-dy/len*7])+' '+pt(off(a,17))+'Z',shirt)+
   path('M'+pt(off(a,-11))+'Q'+pt(off(middle,-13))+' '+pt(off(b,-8)),'#7390e6',3,.8)+
   tapered([b[0]-dx/len*4,b[1]-dy/len*4],b,12,12,trousers)+'</g>';
 }
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
  svg+=line([sh,rotate([84,208])],ink,10)+head(skull,-Math.PI/2+a);
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
  svg+=line([sh,[278,78+39*rise]],ink,9)+head([278,62+39*rise],0,true);
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
  let sh=[119,133],hip=[220,137],knee=[220,229],headP=[91,139],svg=ground();
  const h=kind==='hover'?5*held(cycle):0;
  if(kind==='hover'){sh=[119,133-h];hip=[220,137-h];knee=[220,229-h];headP=[91,139-h];}
  if(kind==='cat'){
   const arch=(rise-.5)*50;
   svg+=path('M119 133Q170 '+(132-arch)+' 220 137',shirt,30);
   headP=[92,137+22*rise];
  }else svg+=body([sh,hip]);
  svg+=line([sh,[120,181],[121,225]],ink,10)+line([[115,228],[93,228]],blue,9);
  const supportAnkle=kind==='hover'?[271,212]:[274,228];
  svg+=line([hip,knee,supportAnkle],ink,11);
  svg+=kind==='hover'?line([[271,212],[280,227],[282,234]],blue,9):line([[274,228],[295,230]],blue,9);
  if(kind==='birddog'){
   const side=Math.floor(seconds/6)%2,extension=held(cycle);
   const armEnd=[116-77*extension,225-104*extension],legEnd=[274+51*extension,228-91*extension];
   svg+=line([[sh[0]+5,sh[1]+2],[119-37*extension,181-52*extension],armEnd],blue,10,side?.45:1);
   svg+=line([[hip[0]+5,hip[1]+2],[220+53*extension,229-92*extension],legEnd],ink,11,side?1:.45);
   svg+=line([legEnd,[legEnd[0]+15,legEnd[1]+2]],blue,9,side?1:.45);
  }else{
   svg+=line([[125,136-h],[135,181],[136,225]],ink,9,.35);
   svg+=line([[227,139-h],[230,229-h],[284,228]],ink,9,.35);
  }
  svg+=line([sh,[108,133-h]],ink,10)+head(headP,-Math.PI/2,true);
  return svg;
 }
 // Gentle block: original front/side views with continuous, alternating movement.
 function easyFrame(kind,seconds){
  const w=wave(seconds,4),r=w.rise;
  const alternating=Math.sin(seconds*Math.PI/2),l=Math.max(0,alternating),q=Math.max(0,-alternating);
  let svg=ground(),message='Плавное движение',detail='Комфортная амплитуда · без прыжков';
  if(kind==='sitstand'){
   const sh=[96+77*r,96-3*r],hip=[103+72*r,153-8*r];
   svg+=chair()+line([hip,[151+14*r,164+21*r],[175,225]],ink,11)+foot([175,225],[199,232]);
   svg+=line([[hip[0]-5,hip[1]+3],[144+13*r,168+21*r],[165,225]],ink,10,.35)+foot([165,225],[188,232],blue,.35);
   svg+=body([sh,hip])+line([sh,[sh[0],sh[1]-15]],ink,9)+head([sh[0],sh[1]-32]);
   svg+=line([sh,[sh[0]+20,sh[1]+28],[sh[0]+45,sh[1]+30]],ink,9);
   message=r<.1?'Сидя':r>.9?'Стоя':w.cycle<.5?'Встать со стула':'Плавно сесть';detail='Устойчивый стул · стопы на полу';
  }else if(kind==='seatmarch'||kind==='curls'){
   const sh=[102,96],hip=[108,153];
   svg+=chair()+body([sh,hip])+line([sh,[100,81]],ink,9)+head([100,64]);
   for(const [i,lift,opacity] of [[0,kind==='seatmarch'?l:0,.4],[1,kind==='seatmarch'?q:0,1]]){
    const x=i*12,knee=[157+x,164-28*lift],ankle=[157+x,225-32*lift];
    svg+=line([hip,knee,ankle],ink,10,opacity)+foot(ankle,[181+x,232-32*lift],blue,opacity);
   }
   if(kind==='curls'){
    for(const [x,o] of [[-9,.35],[5,1]]){
     const elbow=[108+x,131],hand=[117+x+27*Math.sin(Math.PI*r),163-65*r];
     svg+=line([[sh[0]+x,sh[1]],elbow,hand],ink,9,o)+circle(hand,5,blue,o);
    }
    message=r<.15?'Руки опущены':r>.85?'Руки согнуты':w.cycle<.5?'Согнуть руки':'Плавно опустить';detail='Локти у корпуса · сидя, без веса или с лёгким весом';
   }else{
    svg+=line([sh,[117,127],[126,156]],ink,9);
    message=alternating>.15?'Поднять одну ногу':alternating<-.15?'Поднять другую ногу':'Стопы на полу';detail='Держись за края стула · спина прямая';
   }
  }else if(kind==='standback'||kind==='minisquat'){
   const squat=kind==='minisquat'?r:0,sh=[156-9*squat,94+24*squat],hip=[153-23*squat,150+24*squat];
   svg+=support()+body([sh,hip])+line([sh,[sh[0],sh[1]-15]],ink,9)+head([sh[0],sh[1]-32]);
   svg+=line([sh,[197,122],[245,112]],ink,9);
   for(const [lift,o] of [[kind==='standback'?l:0,.4],[kind==='standback'?q:0,1]]){
    const ankle=[155-65*lift,224-26*lift],knee=[154+14*squat-33*lift,188+7*squat-13*lift];
    svg+=line([hip,knee,ankle],ink,11,o)+foot(ankle,[ankle[0]+25,ankle[1]+8],blue,o);
   }
   message=kind==='minisquat'?(r>.85?'Небольшое приседание':r<.15?'Стоя':w.cycle<.5?'Немного согнуть колени':'Выпрямиться'):(alternating>.15?'Одна нога назад':alternating<-.15?'Другая нога назад':'Обе стопы на полу');
   detail='Руки на устойчивой опоре · спина прямая';
  }else{
   let shift=0,leftX=156,rightX=202,leftY=224,rightY=224;
   const side=kind==='sidesteps';
   if(side){
    // Travel right, bring trailing foot in, then travel back. No crossed legs.
    const c=(seconds%8)/8;
    const smooth=x=>(1-Math.cos(Math.PI*x))/2;
    if(c<.25){rightX+=55*smooth(c*4);}else if(c<.5){rightX+=55;leftX+=55*smooth((c-.25)*4);}else if(c<.75){rightX+=55;leftX+=55*(1-smooth((c-.5)*4));}else rightX+=55*(1-smooth((c-.75)*4));
    shift=(leftX+rightX)/2-179;message=c<.5?'Шаг и приставить вправо':'Шаг и приставить влево';detail='Шаги небольшие · ноги не скрещиваются';
   }
   const sh=[179+shift,94],hip=[179+shift,151];
   svg+=body([sh,hip])+line([sh,[179+shift,79]],ink,9)+head([179+shift,61]);
   if(kind==='standside'){svg+=support();rightX+=58*q;leftX-=58*l;leftY-=13*l;rightY-=13*q;}
   const height=kind==='kneelifts'?46:kind==='march'?20:0;
   if(height){leftY-=height*l;rightY-=height*q;}
   for(const [i,x,y,lift] of [[0,leftX,leftY,l],[1,rightX,rightY,q]]){
    let knee=[x,188-height*.9*lift],ankle=[x,y];
    if(kind==='heeldigs'){knee=[x+(i?14:-14)*lift,189];ankle=[x+(i?31:-31)*lift,226-3*lift];}
    if(kind==='standside')knee=[(hip[0]+x)/2,188-6*lift];
    svg+=line([hip,knee,ankle],ink,11,i?1:.65);
    const toe=kind==='heeldigs'?[ankle[0]+(i?18:-18),ankle[1]+7-24*lift]:[ankle[0]+(i?18:-18),ankle[1]+8];
    svg+=line([ankle,toe],blue,10,i?1:.65);
   }
   if(kind==='standside')svg+=line([sh,[216,122],[245,112]],ink,9)+line([sh,[144,125],[141,150]],ink,9);
   else if(kind==='kneelifts')svg+=line([sh,[138,123],[197-40*l,162-37*l]],ink,9)+line([sh,[220,123],[161+40*q,162-37*q]],ink,9);
   else svg+=line([sh,[137,124],[133+15*q,154-25*q]],ink,9)+line([sh,[221,124],[225-15*l,154-25*l]],ink,9);
   if(!side)message=kind==='heeldigs'?(alternating>.15?'Одна пятка впереди':alternating<-.15?'Другая пятка впереди':'Стопы рядом'):alternating>.15?'Одна нога':alternating<-.15?'Другая нога':'Обе стопы на полу';
   if(kind==='standside')detail='Рука на опоре · корпус не наклоняется';
   if(kind==='heeldigs')detail='Пятка впереди · носок вверх';
  }
  return{svg,phase:message,detail};
 }
 // Seated cardio: a fixed pelvis and visible chair throughout every movement.
 function cardioFrame(kind,seconds){
  const a=Math.sin(seconds*Math.PI/2),l=Math.max(0,a),r=Math.max(0,-a),u=(1-Math.cos(seconds*Math.PI/2))/2;
  const sh=[180,94],hip=[180,153];
  let svg=ground()+path('M139 107V169H221V107M147 169V233M213 169V233',soft,4);
  svg+=body([sh,hip])+line([sh,[180,78]],ink,9)+head([180,60]);
  let knees=[[155,177],[205,177]],feet=[[155,225],[205,225]],hands=[[134,153],[226,153]],elbows=[[139,122],[221,122]];
  if(['march','tap','speedmarch'].includes(kind)){
   knees[0][1]-=22*l;feet[0][1]-=25*l;knees[1][1]-=22*r;feet[1][1]-=25*r;
   if(kind==='march')hands=[[134+14*r,153-32*r],[226-14*l,153-32*l]];
   if(kind==='tap')hands=[[134+71*r,153+2*r],[226-71*l,153+2*l]];
  }
  if(['side','sidearms','star'].includes(kind)){
   const L=kind==='star'?u:l,R=kind==='star'?u:r;
   feet[0][0]-=36*L;feet[1][0]+=36*R;knees[0][0]-=16*L;knees[1][0]+=16*R;
   if(kind==='star'){feet[0][1]-=12*u;feet[1][1]-=12*u;}
   if(kind!=='side'){const h=kind==='star'?u:Math.abs(a);hands=[[134-36*h,153-56*h],[226+36*h,153-56*h]];elbows=[[139-8*h,122-20*h],[221+8*h,122-20*h]];}
  }
  if(kind==='vstep'){
   const c=(seconds%8)/2,blend=t=>(1-Math.cos(Math.PI*t))/2;
   const L=c<1?blend(c):c<2?1:c<3?1-blend(c-2):0;
   const R=c<1?0:c<2?blend(c-1):c<3?1:1-blend(c-3);
   feet=[[155-30*L,225-10*L],[205+30*R,225-10*R]];
  }
  if(kind==='kick'){feet=[[155-22*l,225-48*l],[205+22*r,225-48*r]];knees[0][1]-=8*l;knees[1][1]-=8*r;}
  if(kind==='reach'){hands=[[134+11*u,153-115*u],[226-11*u,153-115*u]];elbows=[[139,122-49*u],[221,122-49*u]];}
  if(kind==='speed'||kind==='speedmarch'){
   const c=seconds*Math.PI;hands=[[180+13*Math.cos(c),112+12*Math.sin(c)],[180-13*Math.cos(c),112-12*Math.sin(c)]];elbows=[[137,112],[223,112]];
  }
  for(let i=0;i<2;i++){svg+=line([hip,knees[i],feet[i]],ink,10,i?1:.65)+line([feet[i],[feet[i][0]+(i?16:-16),feet[i][1]+7]],blue,9,i?1:.65);}
  for(let i=0;i<2;i++)svg+=line([sh,elbows[i],hands[i]],ink,9,i?1:.65);
  const phase=kind==='reach'?(u>.7?'Руки вверх':u<.2?'Руки вниз':'Плавный подъём или опускание'):kind==='star'?(u>.5?'Раскрыться':'Вернуться'):kind==='speed'||kind==='speedmarch'?'Круговые движения предплечий':kind==='vstep'?'По одной стопе: наружу, наружу, обратно, обратно':a>.15?'Движение одной стороны':a<-.15?'Движение другой стороны':'Исходное положение';
  return {svg,phase,detail:'Сидя · таз на стуле · комфортный темп без задержки дыхания'};
 }

 // Original bed illustrations: fixed mattress/pillow; shading indicates muscle tension.
 function bedFrame(kind,seconds){
  const w=wave(seconds,6),r=w.rise,side=Math.floor(seconds/6)%2;
  const mattress=()=>path('M27 212H335V225H27ZM36 225V243M326 225V243',soft,3)+path('M39 195Q59 186 80 195V207H39Z',floor,3);
  let svg=mattress(),phase=w.cycle<.5?'Плавное движение':'Возвращение',detail='Лёжа на спине · удобная амплитуда · без рывков';
  if(kind==='abduction'){
   svg=path('M28 42H333V223H28ZM39 105H80V158H39Z',soft,3);
   const hip=[177,133],sh=[100,133];
   svg+=head([61,133],-Math.PI/2)+line([[78,133],sh],ink,9)+body([sh,hip]);
   svg+=line([sh,[121,102],[164,102]],ink,8,.65)+line([sh,[121,164],[164,164]],ink,8);
   for(let i=0;i<2;i++){const sign=i?1:-1,m=i===side?r:0;svg+=line([hip,[235,133+sign*(15+21*m)],[296-8*m,133+sign*(20+46*m)]],ink,10,i?1:.65)+line([[296-8*m,133+sign*(20+46*m)],[311-8*m,133+sign*(20+46*m)]],blue,9);}
   detail='Вид сверху · пятка скользит по матрасу · небольшой размах';
  }else{
   const sh=[100,187],hip=[180,194];
   svg+=head([62,177],-Math.PI/2)+line([[79,183],sh],ink,9)+body([sh,hip]);
   for(let i=0;i<2;i++){
    const o=i?1:.45,y=i?0:-5,m=i===side?r:0;
    let knee=[239,195+y],ankle=[299,197+y],toe=[304,178+y];
    if(kind==='heelslide'){ankle=[299-62*m,197+y];knee=[239-24*m,195-48*m+y];toe=[ankle[0]+5,178+y];}
    if(kind==='shortarc'&&i===side){knee=[239,174+y];ankle=[295,199-25*r+y];toe=[301,180-25*r+y];}
    if(kind==='pumps')toe=[299+25*r,175+18*r+y];
    if(kind==='quads')knee[1]-=3*(1-m);
    svg+=line([hip,knee,ankle],ink,10,o)+line([ankle,toe],blue,9,o);
   }
   if(kind==='shortarc')svg+=circle([239,196],15,soft,.35);
   if(kind==='quads')svg+=line([[191,190],[226,191]],blue,17,.15+.65*r);
   if(kind==='glutes')svg+=circle([178,192],18,blue,.1+.6*r);
   for(let i=0;i<2;i++){
    const m=i===side?r:0,o=i?1:.45;
    let elbow=[130,201-i*3],hand=[164,201-i*3];
    if(kind==='elbows')hand=[130+34*Math.cos(m*2.3),201-34*Math.sin(m*2.3)];
    if(kind==='arms'){const angle=m*Math.PI/2;elbow=[100+32*Math.cos(angle),187-32*Math.sin(angle)];hand=[100+66*Math.cos(angle),187-66*Math.sin(angle)];}
    svg+=line([sh,elbow,hand],ink,8,o);
   }
   if(kind==='hands'||kind==='wrists'){
    svg+=path('M218 37H332V135H218Z',floor,2)+line([[238,122],[265,99]],soft,8);
    const angle=kind==='wrists'?(r-.5)*1.2:0;
    const rotate=p=>[265+(p[0]-265)*Math.cos(angle)-(p[1]-99)*Math.sin(angle),99+(p[0]-265)*Math.sin(angle)+(p[1]-99)*Math.cos(angle)];
    svg+=line([rotate([265,99]),rotate([278,84])],ink,13);
    for(let i=0;i<4;i++){const spread=kind==='hands'?1-r:1;svg+=line([rotate([274+i*3,86+i*2]),rotate([277+i*6,82+i*2-23*spread])],ink,4);}
    svg+=line([rotate([269,90]),rotate([257-8*(1-r),78])],ink,4);
    detail='Лёжа · кисть показана крупно во вставке';
   }
  }
  if(kind==='quads'||kind==='glutes')phase=r>.7?'Мягкое напряжение':r<.2?'Расслабление':'Напряжение и расслабление';
  if(kind==='hands')phase=r>.7?'Пальцы согнуты':r<.2?'Ладонь раскрыта':'Мягкое движение пальцев';
  if(kind==='pumps')phase=r>.7?'Стопы от себя':r<.2?'Стопы на себя':'Движение стоп';
  return {svg,phase,detail};
 }
 function personalFrame(kind,s){
  const w=wave(s),r=w.rise,sh=[96,96],hip=[103,153];
  let svg=ground()+chair()+body([sh,hip])+line([sh,[93,81]],ink,9)+head([93,64]);
  svg+=line([hip,[139,164],[144,226]],ink,10,.4)+foot([144,226],[169,232],blue,.4);
  let detail,caption;
  if(kind==='wrist'){
   svg+=path('M145 140H220M156 141V235M211 141V235',soft,4);
   svg+=line([sh,[142,130],[211,130]],ink,9);
   const hand=[211+28*Math.cos(.55*r),130-28*Math.sin(.55*r)];
   svg+=line([[211,130],hand],skin,10)+line([hip,[174,165],[184,226]])+foot([184,226],[210,232]);
   svg+=path('M224 36H335V109H224Z',floor,2)+path('M230 87H287V106',soft,3);
   svg+=line([[237,78],[285,78]],skin,13);
   svg+='<g transform="translate(285 78) rotate('+fmt(-32*r)+')">'+line([[0,0],[31,0]],skin,13)+line([[29,0],[41,0]],skin,5)+'</g>';
   detail='Предплечье на столе · двигается только кисть';caption=r>.85?'Кисть поднята':r<.15?'Кисть опущена':w.cycle<.5?'Разгибание кисти':'Возвращение кисти';
  }else if(kind==='circles'){
   const direction=Math.floor(s/6)%2?-1:1,theta=direction*w.cycle*Math.PI*2;
   svg+=line([hip,[173,157],[246,183]])+path('M229 197H273M235 197V235M267 197V235',soft,4);
   svg+='<g transform="translate(246 183) rotate('+fmt(17*Math.sin(theta))+')">'+line([[0,0],[34,9+6*Math.cos(theta)]],blue,10)+'</g>';
   svg+=line([sh,[120,132],[151,145]],ink,9);
   svg+=path('M225 32H337V124H225Z',floor,2)+path('M253 78A26 22 0 1 1 307 78A26 22 0 1 1 253 78',soft,1.5,.45);
   svg+=circle([280,78],4,soft)+line([[280,78],[280+29*Math.cos(theta),78+23*Math.sin(theta)]],skin,13);
   detail='Голеностоп и колено неподвижны · стопа движется по кругу';caption=direction>0?'Круг в одну сторону':'Круг в другую сторону';
  }else{
   svg+=line([hip,[174,164],[184,220]])+line([sh,[120,132],[151,145]],ink,9);
   svg+=solid('M174 234L'+fmt(223-10*r)+' 234L'+fmt(244-20*r)+' 230L307 230L307 237H174Z','#93c6cc');
   svg+=line([[178,225],[202,225]],skin,12);
   svg+=path('M224 36H337V121H224Z',floor,2)+solid('M231 111H330V117H231Z','#93c6cc');
   svg+=line([[237,94],[284,97]],skin,18);
   for(let i=0;i<4;i++){
    const x=283+i*5,y=91+i*4;
    svg+=path('M'+x+' '+y+'q'+fmt(16-7*r)+' '+fmt(-3+9*r)+' '+fmt(20-13*r)+' '+fmt(1+12*r),skin,4);
   }
   svg+=path('M287 113Q'+fmt(300-10*r)+' '+fmt(112-9*r)+' '+fmt(315-16*r)+' 113',soft,2);
   detail='Босая стопа · пятка неподвижна · без груза';caption=r>.8?'Пальцы собирают полотенце':r<.2?'Пальцы расслаблены':'Плавное сгибание пальцев';
  }
  return {svg,phase:caption,detail};
 }
 const all={
  'seated-wrist-extension':s=>personalFrame('wrist',s),
  'seated-ankle-circles':s=>personalFrame('circles',s),
  'towel-toe-curls':s=>personalFrame('toes',s),
  'bed-pumps':s=>bedFrame('pumps',s),
  'bed-hands':s=>bedFrame('hands',s),
  'bed-wrists':s=>bedFrame('wrists',s),
  'bed-elbows':s=>bedFrame('elbows',s),
  'bed-arms':s=>bedFrame('arms',s),
  'bed-heelslide':s=>bedFrame('heelslide',s),
  'bed-quads':s=>bedFrame('quads',s),
  'bed-glutes':s=>bedFrame('glutes',s),
  'bed-abduction':s=>bedFrame('abduction',s),
  'bed-shortarc':s=>bedFrame('shortarc',s),
  'cardio-march':s=>cardioFrame('march',s),
  'cardio-side':s=>cardioFrame('side',s),
  'cardio-sidearms':s=>cardioFrame('sidearms',s),
  'cardio-tap':s=>cardioFrame('tap',s),
  'cardio-vstep':s=>cardioFrame('vstep',s),
  'cardio-kick':s=>cardioFrame('kick',s),
  'cardio-reach':s=>cardioFrame('reach',s),
  'cardio-speed':s=>cardioFrame('speed',s),
  'cardio-speedmarch':s=>cardioFrame('speedmarch',s),
  'cardio-star':s=>cardioFrame('star',s),

  march:s=>easyFrame('march',s),
  heeldigs:s=>easyFrame('heeldigs',s),
  kneelifts:s=>easyFrame('kneelifts',s),
  sidesteps:s=>easyFrame('sidesteps',s),
  sitstand:s=>easyFrame('sitstand',s),
  minisquat:s=>easyFrame('minisquat',s),
  standside:s=>easyFrame('standside',s),
  standback:s=>easyFrame('standback',s),
  curls:s=>easyFrame('curls',s),
  seatmarch:s=>easyFrame('seatmarch',s),
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



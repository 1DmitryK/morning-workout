// Anatomical coordinates: +X left/right, +Y head, +Z forward. Metres.
// This is an illustrative rig, not a prescription of range or cadence.
const pi=Math.PI, mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)};
const cycle=(t,d=6)=>(t%d)/d;
const pulse=(t,d=6)=>{const c=cycle(t,d);return c<.3?ease(c/.3):c<.58?1:1-ease((c-.58)/.42)};
const alternate=(t,d=3)=>{const lift=x=>{const c=cycle(x,d*2);return c<.5?(1-Math.cos(c*4*pi))/2:0};return [lift(t),lift(t+d)]};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const v=(x,y,z)=>[x,y,z];
export const supported=['march','heeldigs','kneelifts','sidesteps','sitstand','minisquat','standside','standback','curls','seatmarch','heels','balance','ankles','pelvic','bridge','sideleg','crunch','rotation','squat','wallpush','cat','birddog','hover','hipstretch','legstretch',...['march','side','sidearms','tap','vstep','kick','reach','speed','speedmarch','star'].map(x=>'cardio-'+x),...['pumps','hands','wrists','elbows','arms','heelslide','quads','glutes','abduction','shortarc'].map(x=>'bed-'+x)];
export function sample(pose,t){
 if(!supported.includes(pose))throw Error('Unknown 3D motion '+pose);
 const r=pulse(t),a=alternate(t,3),s=Math.sin(t*pi/3),p={hip:v(0,.96,0),chest:v(0,1.43,0),feet:[v(-.13,.09,0),v(.13,.09,0)],hands:[v(-.27,.93,.05),v(.27,.93,.05)],kneePole:[v(-.13,.6,1),v(.13,.6,1)],elbowPole:[v(-1,1,.2),v(1,1,.2)],footPitch:[0,0],finger:0,wrist:0,prop:'none',mode:'standing',turn:0,headTilt:0,highlight:0};
 const seated=()=>{p.mode='seated';p.prop='chair';p.hip=v(0,.59,0);p.chest=v(0,1.07,0);p.feet=[v(-.14,.09,.44),v(.14,.09,.44)];p.hands=[v(-.28,.70,.25),v(.28,.70,.25)];p.kneePole=[v(-.15,.6,1),v(.15,.6,1)];};
 const support=()=>{p.prop='rail';p.hands=[v(-.30,1.1,.42),v(.30,1.1,.42)];};
 if(pose.startsWith('cardio-')||['seatmarch','curls','ankles','hipstretch','legstretch','sitstand'].includes(pose))seated();
 if(pose.startsWith('cardio-')){
  const kind=pose.slice(7); const u=(1-Math.cos(t*pi/3))/2;
  for(let i=0;i<2;i++){
   const sign=i?1:-1,l=a[i];
   if(['march','tap','speedmarch'].includes(kind)){p.feet[i][1]+=.16*l;p.feet[i][2]-=.04*l;}
   if(kind==='march')p.hands[i]=v(sign*.28, .70+.22*a[1-i],.25+.08*a[1-i]);
   if(kind==='tap')p.hands[i]=v(mix(sign*.28,-sign*.14,a[1-i]),.7+.11*a[1-i],.25+.08*a[1-i]);
   if(['side','sidearms','star'].includes(kind)){const q=kind==='star'?u:l;p.feet[i][0]+=sign*.25*q;if(kind!=='side'){p.hands[i]=v(sign*(.28+.40*q),.70+.45*q,.16);}}
   if(kind==='vstep'){const c=cycle(t,8)*4;const q=i?(c<1?0:c<2?ease(c-1):c<3?1:1-ease(c-3)):(c<1?ease(c):c<2?1:c<3?1-ease(c-2):0);p.feet[i][0]+=sign*.23*q;p.feet[i][2]+=.12*q;}
   if(kind==='kick')p.feet[i]=v(sign*.15,.09+.29*l,.44+.25*l);
   if(kind==='reach')p.hands[i]=v(sign*(.28-.08*u),.70+.89*u,.15);
   if(['speed','speedmarch'].includes(kind))p.hands[i]=v(sign*.12,.91+.07*Math.sin(t*2+pi*i),.39+.07*Math.cos(t*2+pi*i));
  }
 }else if(['march','kneelifts','heeldigs','sidesteps','standside','standback','minisquat','heels','balance'].includes(pose)){
  if(['standside','standback','minisquat','heels','balance'].includes(pose))support();
  if(pose==='heels'){p.hip[1]+=.07*r;p.chest[1]+=.07*r;p.chest[2]+=.05*r;p.feet.forEach((f,i)=>{f[1]+=.07*r;f[2]-=.03*r;p.footPitch[i]=-.42*r;});}
  else if(pose==='balance'){p.feet[0]=v(-.17,.09+.18*r,-.06*r);p.hip[0]=.05*r;p.chest[0]=.05*r;}
  else if(pose==='minisquat'){p.hip[1]-=.15*r;p.hip[2]-=.09*r;p.chest[1]-=.15*r;p.chest[2]+=.03*r;}
  else for(let i=0;i<2;i++){
   const sign=i?1:-1,l=a[i];
   if(['march','kneelifts'].includes(pose)){p.feet[i][1]+=(pose==='march'?.12:.27)*l;p.feet[i][2]+=.12*l;p.hands[i]=v(sign*.27,.93+.12*a[1-i],.05+.22*a[1-i]-.08*l);}
   if(pose==='heeldigs'){p.feet[i][2]+=.27*l;p.feet[i][1]+=.025*l;p.hip[1]-=.03*l;p.chest[1]-=.03*l;p.footPitch[i]=.35*l;}
   if(pose==='standside'){p.feet[i][0]+=sign*.35*l;p.feet[i][1]+=.11*l;p.hip[0]-=sign*.035*l;p.chest[0]-=sign*.035*l;}
   if(pose==='standback'){p.feet[i][2]-=.28*l;p.feet[i][1]+=.055*l;}
  }
  if(pose==='sidesteps'){
   const c=cycle(t,8)*4;let L=0,R=0;if(c<1)R=.35*ease(c);else if(c<2){R=.35;L=.35*ease(c-1);}else if(c<3){R=.35;L=.35*(1-ease(c-2));}else R=.35*(1-ease(c-3));
   p.feet[0][0]+=L;p.feet[1][0]+=R;p.hip[0]=(L+R)/2;p.chest[0]=p.hip[0];p.hip[1]-=.02*Math.abs(L-R)/.35;p.chest[1]-=.02*Math.abs(L-R)/.35;p.hands=p.hands.map(h=>add(h,[p.hip[0],0,0]));
  }
 }else if(pose==='seatmarch'){p.feet.forEach((f,i)=>f[1]+=.17*a[i]);p.hands=[v(-.28,.60,0),v(.28,.60,0)];}
 else if(pose==='curls'){p.hands=p.hands.map((h,i)=>v(i?.26:-.26,.79-.27*Math.cos(pi*r),.27*Math.sin(pi*r)));p.elbowPole=[v(-.26,.78,-.2),v(.26,.78,-.2)];}
 else if(pose==='ankles'||pose==='legstretch'){const q=pose==='ankles'?1:ease(t/2);p.feet[1]=v(.14,.09+.40*q,.44+.28*q);p.footPitch[1]=pose==='ankles'?.5*Math.sin(t*pi/3):.35;p.hands=[v(-.27,.65,.1),v(.27,.65,.1)];}
 else if(pose==='hipstretch'){const q=ease(t/2);p.feet[1]=v(-.14,.66,.34);p.kneePole[1]=v(1,.65,.25);p.chest[2]=.12*q;p.chest[1]-=.025*q;p.hands=[v(-.13,.70,.36),v(.20,.72,.37)];}
 else if(pose==='sitstand'){p.hip=v(0,mix(.59,.96,r),mix(0,.30,r));p.chest=v(0,mix(1.07,1.43,r),.30+.14*Math.sin(pi*r));p.hands=[v(-.25,mix(.75,1.05,r),.55),v(.25,mix(.75,1.05,r),.55)];}
 else if(pose==='squat'){p.prop='wall';p.hip=v(0,.88-.23*r,0);p.chest=v(0,1.35-.23*r,0);p.feet=[v(-.15,.09,.38),v(.15,.09,.38)];p.hands=[v(-.27,1.0-.22*r,.28),v(.27,1.0-.22*r,.28)];}
 else if(pose==='wallpush'){p.prop='frontwall';p.hip[2]=.10*r;p.chest[2]=.16+.23*r;p.chest[1]-=.035*r;p.hands=[v(-.22,1.35,.68),v(.22,1.35,.68)];p.elbowPole=[v(-.6,1.12,.45),v(.6,1.12,.45)];}
 else if(['cat','birddog','hover'].includes(pose)){
  p.mode='prone';p.prop='mat';const h=pose==='hover'?.045*r:0;
  p.hip=v(0,.52+h,.34);p.chest=v(0,.53+h,-.14);p.hands=[v(-.21,.025,-.16),v(.21,.025,-.16)];p.feet=[v(-.14,.08,.78),v(.14,.08,.78)];p.knees=[v(-.14,.08+h,.34),v(.14,.08+h,.34)];p.headTilt=pose==='cat'?.24*Math.sin(t*pi/4):0;p.arch=pose==='cat'?.06*Math.sin(t*pi/4):0;
  if(pose==='birddog'){const side=Math.floor(t/6)%2;p.hands[side]=v(side?.21:-.21,mix(.025,.59,r),mix(-.16,-.69,r));p.feet[1-side]=v(side?-.14:.14,mix(.09,.56,r),mix(.78,1.17,r));p.knees[1-side]=null;}
 }else{
  p.mode='supine';p.prop=pose.startsWith('bed-')?'bed':'mat';p.hip=v(0,0,0);p.chest=v(0,.47,0);p.hands=[v(-.28,.05,.02),v(.28,.05,.02)];p.feet=[v(-.14,-.85,0),v(.14,-.85,0)];p.kneePole=[v(-.14,-.4,1),v(.14,-.4,1)];
  if(['bridge','pelvic','crunch','rotation'].includes(pose)){
   p.feet=[v(-.15,-.49,0),v(.15,-.49,0)];
   if(pose==='bridge'){p.hip[2]=.20*r;p.chest[2]=.015*r;}
   if(pose==='pelvic'){p.hip[2]=.013*r;p.highlight=r;}
   if(pose==='crunch'||pose==='rotation'){const q=pose==='crunch'?r:.65;p.chest[2]=.12*q;p.chest[1]-=.025*q;p.headTilt=-.12*q;p.hands=[v(-.20,.55,.15),v(.20,.55,.15)];if(pose==='rotation')p.twist=.18*s;}
  }else if(pose==='sideleg'){
   p.mode='side';p.feet[0]=v(-.14,-.60,.40);p.feet[1]=v(.14+.34*r,-.85+.08*r,0);p.hands=[v(-.26,.60,.12),v(.24,.16,.22)];
  }else{
   const kind=pose.slice(4),side=Math.floor(t/6)%2;
   if(kind==='pumps')p.footPitch=[.30*Math.sin(t*pi/3),.30*Math.sin(t*pi/3)];
   if(kind==='hands')p.finger=r;
   if(kind==='wrists')p.wrist=.45*Math.sin(t*pi/3);
   if(['hands','wrists'].includes(kind))p.hands=[v(-.27,.30,.36),v(.27,.30,.36)];
   if(kind==='elbows')p.hands[side]=v(side?.27:-.27,.05+.41*r,.02+.24*Math.sin(pi*r));
   if(kind==='arms'){const theta=r*pi/2;p.hands[side]=v(side?.23:-.23,.47-.54*Math.cos(theta),.54*Math.sin(theta));}
   if(kind==='heelslide')p.feet[side][1]+=.35*r;
   if(kind==='quads'||kind==='glutes')p.highlight=r;
   if(kind==='abduction'){p.feet[side][0]+=(side?1:-1)*.30*r;p.feet[side][1]+=.06*r;}
   if(kind==='shortarc'){p.roll=true;p.feet[side]=v(side?.14:-.14,-.79,.02+.17*r);p.knees=[null,null];p.knees[side]=v(side?.14:-.14,-.42,.17);}
  }
 }
 p.phase=['hipstretch','legstretch'].includes(pose)&&t>=2?'Удержание растяжки':pose==='bed-quads'||pose==='bed-glutes'?(r>.7?'Мягкое напряжение':'Расслабление'):['squat','balance','bridge','birddog','hover'].includes(pose)&&r>.98?'Удержание':'Плавное движение';
 return p;
}

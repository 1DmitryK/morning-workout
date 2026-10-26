import * as T from './vendor/three.module.js';
import {muscleInfo} from './muscles.js?v=13';
import {sample,supported} from './motion3d.js?v=13';
const V=a=>new T.Vector3(...a),up=new T.Vector3(0,1,0);
// Analytic two-bone IK: retain segment length and keep knees/elbows on their intended side.
export function joint(a,b,pole,l1,l2){
 const d=b.clone().sub(a),raw=d.length(),len=Math.min(l1+l2-.0001,Math.max(Math.abs(l1-l2)+.0001,raw));d.normalize();
 const along=(l1*l1-l2*l2+len*len)/(2*len),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const n=pole.clone().sub(a);n.addScaledVector(d,-n.dot(d));if(n.lengthSq()<1e-8)n.set(1,0,0);n.normalize();
 return {middle:a.clone().addScaledVector(d,along).addScaledVector(n,height),end:a.clone().addScaledVector(d,len),error:Math.max(0,raw-l1-l2)};
}
class Trainer{
 constructor(host){
  this.host=host;this.pose='march';this.time=0;this.view='three';this.yaw=.55;this.elevation=.18;this.dead=false;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.renderer.domElement.setAttribute('aria-label','Объёмная модель показывает упражнение. Ракурс можно изменить кнопками.');this.renderer.domElement.setAttribute('role','img');host.append(this.renderer.domElement);
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(32,1,.1,30);
  this.scene.add(new T.HemisphereLight(0xe7eeff,0xb6a8a3,2.2));
  const key=new T.DirectionalLight(0xfff3df,3.1);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-2,near:.1,far:12});key.shadow.bias=-.0003;key.shadow.normalBias=.012;key.shadow.radius=3;this.scene.add(key);
  const fill=new T.DirectionalLight(0xc9dcff,1.5);fill.position.set(3,3,-3);this.scene.add(fill);
  this.mat={};for(const [k,c] of Object.entries({skin:0xd9a386,shirt:0x496bd4,pants:0x263955,hair:0x392d2a,white:0xf1f2ef,sole:0xb6c4d5,eye:0x293344,lip:0x995e52,prop:0x9daec3,wood:0xd9c8b9,bed:0xdbe5f2,mat:0xb8c9d9,highlight:0x6cbcb0}))this.mat[k]=new T.MeshStandardMaterial({color:c,roughness:.78});
  this.sphere=new T.SphereGeometry(1,24,16);this.cylinder=new T.CylinderGeometry(1,1,1,20);this.cone=new T.LatheGeometry([[0,-.5],[.78,-.5],[.95,-.45],[1,-.30],[.98,.28],[.85,.45],[.65,.5],[0,.5]].map(([x,y])=>new T.Vector2(x,y)),24);
  this.body=new T.Group();this.scene.add(this.body);this.props=new T.Group();this.scene.add(this.props);
  this.parts={};this.parts.hip=this.ellipsoid(this.body,[.18,.13,.12],'pants');this.parts.torso=this.ellipsoid(this.body,[.225,.29,.125],'shirt');this.parts.torso.geometry=new T.LatheGeometry([[0,-.52],[.65,-.52],[.84,-.43],[.82,-.15],[1,.30],[.96,.43],[.68,.50],[.28,.54],[0,.54]].map(([x,y])=>new T.Vector2(x,y)),32);this.parts.neck=this.ellipsoid(this.body,[.065,.09,.065],'skin');
  this.head=new T.Group();this.body.add(this.head);this.ellipsoid(this.head,[.105,.14,.105],'skin',[0,0,0]);
  const hair=new T.Mesh(new T.SphereGeometry(1,24,16,0,Math.PI*2,0,1.49),this.mat.hair);hair.scale.set(.108,.145,.109);hair.position.y=.012;this.head.add(hair);
  this.ellipsoid(this.head,[.033,.018,.049],'hair',[-.045,.095,.086]);
  this.ellipsoid(this.head,[.023,.037,.033],'skin',[0,-.012,.102]);
  for(const sign of [-1,1]){this.ellipsoid(this.head,[.021,.032,.018],'skin',[sign*.103,-.014,0]);this.ellipsoid(this.head,[.023,.014,.009],'white',[sign*.039,.018,.095]);this.ellipsoid(this.head,[.009,.01,.006],'eye',[sign*.039,.018,.104]);this.ellipsoid(this.head,[.025,.006,.008],'hair',[sign*.039,.043,.094]);}
  this.ellipsoid(this.head,[.026,.006,.006],'lip',[0,-.065,.087]);
  this.limbs=[];for(let i=0;i<4;i++){
   const arm=i<2,colour=arm?'skin':'pants',w=arm?.052:.08;
   const group={upper:this.segmentMesh(colour),lower:this.segmentMesh(colour),joint:this.ellipsoid(this.body,[w,w,w],colour),start:this.ellipsoid(this.body,[w*1.2,w*1.2,w*1.2],arm?'shirt':colour),end:new T.Group(),arm,w};this.body.add(group.end);
   if(arm){group.sleeve=this.segmentMesh('shirt');this.ellipsoid(group.end,[.038,.062,.023],'skin',[0,-.015,0]);group.fingers=[];for(let f=0;f<4;f++)group.fingers.push(this.ellipsoid(group.end,[.007,.033,.008],'skin',[(f-1.5)*.016,-.073,0]));this.ellipsoid(group.end,[.012,.035,.012],'skin',[.036,-.023,.004]);}
   else{this.ellipsoid(group.end,[.075,.049,.145],'white',[0,-.025,.06]);this.ellipsoid(group.end,[.076,.018,.148],'sole',[0,-.064,.06]);for(let l=0;l<3;l++)this.ellipsoid(group.end,[.047,.005,.006],'sole',[0,.015,.055+l*.023]);}
   group.surface=this.makeSurface(colour);group.upper.visible=false;group.lower.visible=false;group.joint.visible=false;group.start.scale.multiplyScalar(arm?.88:1.06);group.grip=arm?this.makeGrip():null;if(group.grip)this.body.add(group.grip);this.limbs.push(group);
  }
  this.musclePatches=[];this.createMusclePatches();
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
  this.resize=new ResizeObserver(()=>this.draw(this.pose,this.time));this.resize.observe(host);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.dead=true;host.hidden=true;document.querySelector('[data-value="movement"]').style.display='block';document.querySelector('[data-value="view-controls"]').hidden=true;document.querySelector('[data-value="muscle-panel"]').hidden=true;});
 }
 makeSurface(colour){
  const rows=28,cols=20,g=new T.BufferGeometry(),positions=new Float32Array((rows+1)*(cols+1)*3),indices=[];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1);}
  g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));g.setAttribute('color',new T.BufferAttribute(new Float32Array(positions.length),3).setUsage(T.DynamicDrawUsage));g.setIndex(indices);
  const material=this.mat[colour].clone();material.color.setHex(0xffffff);material.vertexColors=true;const mesh=new T.Mesh(g,material);mesh.userData.baseColour=colour;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData={rows,cols,baseColour:colour};this.body.add(mesh);return mesh;
 }
 updateSurface(mesh,a,b,c,arm,front,side){
  const curve=new T.CatmullRomCurve3([a,a.clone().lerp(b,.52),b,b.clone().lerp(c,.48),c],false,'centripetal');
  const {rows,cols}=mesh.userData,pos=mesh.geometry.attributes.position,col=mesh.geometry.attributes.color,base=this.mat[mesh.userData.baseColour].color,active=new T.Color(this.muscleState.stretch?0x55b9d3:0xf18b59),state=this.muscleState;
  const radii=arm?[.060,.066,.039,.049,.025]:[.094,.103,.062,.077,.040];
  let lastN=null;
  for(let y=0;y<=rows;y++){
   const t=y/rows,centre=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   let n=lastN?lastN.clone():new T.Vector3(1,0,0);n.addScaledVector(tangent,-n.dot(tangent));if(n.lengthSq()<.01)n=new T.Vector3(0,0,1).cross(tangent);n.normalize();lastN=n;
   const binormal=new T.Vector3().crossVectors(tangent,n).normalize(),k=Math.min(3,Math.floor(t*4)),u=t*4-k,blend=u*u*(3-2*u),radius=T.MathUtils.lerp(radii[k],radii[k+1],blend);
   for(let x=0;x<=cols;x++){
    const angle=x/cols*Math.PI*2,normal=n.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal,Math.sin(angle)),p=centre.clone().addScaledVector(n,Math.cos(angle)*radius).addScaledVector(binormal,Math.sin(angle)*radius*.93),index=y*(cols+1)+x;
    pos.setXYZ(index,p.x,p.y,p.z);
    const facing=front.clone().addScaledVector(tangent,-front.dot(tangent)).normalize().dot(normal),upper=Math.pow(Math.sin(Math.PI*Math.min(1,t*2)),2),lower=Math.pow(Math.sin(Math.PI*Math.max(0,(t-.5)*2)),2);
    let weight=0;const on=key=>state.selected.includes(key);
    if(arm){if(on('biceps'))weight=Math.max(weight,upper*Math.max(0,facing));if(on('triceps'))weight=Math.max(weight,upper*Math.max(0,-facing));if(on('forearms'))weight=Math.max(weight,lower);}
    else{if(on('quads'))weight=Math.max(weight,upper*Math.max(0,facing));if(on('hamstrings'))weight=Math.max(weight,upper*Math.max(0,-facing));if(on('calves'))weight=Math.max(weight,lower*Math.max(0,-facing));if(on('shins'))weight=Math.max(weight,lower*Math.max(0,facing));}
    const colour=base.clone().lerp(active,this.showMuscles===false?0:weight*state.side[side]*(.65+.3*state.visibility));col.setXYZ(index,colour.r,colour.g,colour.b);
   }
  }
  pos.needsUpdate=true;col.needsUpdate=true;mesh.geometry.computeVertexNormals();
 }
 makeGrip(){
  const g=new T.Group();this.ellipsoid(g,[.043,.016,.046],'skin',[0,.055,-.025]);
  for(let i=0;i<4;i++){
   const points=[];for(let j=0;j<=16;j++){const angle=Math.PI/2-j/16*2.5;points.push(new T.Vector3((i-1.5)*.018,.047*Math.sin(angle),.047*Math.cos(angle)));}
   const finger=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.008,10,false),this.mat.skin);finger.castShadow=true;g.add(finger);
  }
  const points=[];for(let j=0;j<=14;j++){const a=Math.PI/2+j/14*1.9;points.push(new T.Vector3(.045,.050*Math.sin(a),.050*Math.cos(a)));}
  g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),18,.010,10,false),this.mat.skin));return g;
 }
 createMusclePatches(){
  const add=(key,side,anchor,scale,position)=>{const mesh=this.ellipsoid(this.body,scale,'highlight');mesh.material=new T.MeshStandardMaterial({color:0xf18b59,emissive:0xb94621,emissiveIntensity:.18,roughness:.7,transparent:true,opacity:0});mesh.castShadow=false;mesh.visible=false;this.musclePatches.push({key,side,anchor,scale,position,mesh});};
  for(let i=0;i<2;i++){
   const s=i?1:-1;
   for(const [key,segment,front,scale] of [['quads','upper',1,[.057,.15,.032]],['hamstrings','upper',-1,[.05,.14,.026]],['calves','lower',-1,[.049,.12,.03]],['shins','lower',1,[.026,.13,.016]]])add(key,i,{limb:i+2,segment,front},scale,null);
   for(const [key,segment,front,scale] of [['biceps','upper',1,[.037,.085,.023]],['triceps','upper',-1,[.035,.09,.022]],['forearms','lower',1,[.027,.085,.019]]])add(key,i,{limb:i,segment,front},scale,null);
   add('glutes',i,'hip',[.088,.092,.036],[s*.083,-.025,-.105]);
   add('abductors',i,'hip',[.040,.082,.077],[s*.157,.055,-.015]);
   add('hipflexors',i,'hip',[.043,.085,.022],[s*.09,.02,.117]);
   add('shoulders',i,'chest',[.056,.071,.065],[s*.198,-.015,.012]);
   add('chest',i,'chest',[.081,.065,.024],[s*.090,-.10,.112]);
   add('core',i,'chest',[.047,.103,.023],[s*.050,-.30,.107]);
   add('obliques',i,'chest',[.035,.125,.034],[s*.149,-.27,.060]);
   add('back',i,'chest',[.038,.18,.023],[s*.056,-.23,-.116]);
  }
 }
 updateMuscles(orient,hip,chest){
  const state=this.muscleState;
  for(const patch of this.musclePatches){
   const {mesh,key,side,anchor}=patch;mesh.visible=typeof anchor==='string'&&this.showMuscles!==false&&state.selected.includes(key)&&state.side[side]>0;
   if(!mesh.visible)continue;
   mesh.material.color.setHex(state.stretch?0x55b9d3:0xf18b59);mesh.material.emissive.setHex(state.stretch?0x17677d:0xb94621);mesh.material.opacity=.50+.35*state.visibility;
   if(typeof anchor==='string'){mesh.position.copy(anchor==='hip'?hip:chest).add(V(patch.position).applyQuaternion(orient));mesh.quaternion.copy(orient);}
   else{
    const j=this.limbs[anchor.limb].joints,a=anchor.segment==='upper'?j.start:j.middle,b=anchor.segment==='upper'?j.middle:j.end,axis=b.clone().sub(a).normalize();
    const normal=j.front.clone().multiplyScalar(anchor.front);normal.addScaledVector(axis,-normal.dot(axis));if(normal.lengthSq()<.01)normal.copy(j.side);normal.normalize();
    const width=new T.Vector3().crossVectors(axis,normal).normalize();mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(width,axis,normal));
    const radius=anchor.limb<2?(anchor.segment==='upper'?.049:.037):(anchor.segment==='upper'?.080:.057);
    mesh.position.copy(a).lerp(b,.48).addScaledVector(normal,radius);
   }
  }
 }

 ellipsoid(parent,scale,material,pos=[0,0,0]){const m=new T.Mesh(this.sphere,this.mat[material]);m.scale.set(...scale);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 segmentMesh(material){const m=new T.Mesh(this.cone,this.mat[material]);m.castShadow=true;m.receiveShadow=true;this.body.add(m);return m;}
 segment(m,a,b,w){m.position.copy(a).add(b).multiplyScalar(.5);const delta=b.clone().sub(a);m.scale.set(w,delta.length(),w*.92);m.quaternion.setFromUnitVectors(up,delta.normalize());}
 box(size,pos,material){const m=new T.Mesh(new T.BoxGeometry(...size),this.mat[material]);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;this.props.add(m);return m;}
 rod(a,b,r=.025){const m=new T.Mesh(this.cylinder,this.mat.prop);const va=V(a),vb=V(b),delta=vb.clone().sub(va);m.position.copy(va).add(vb).multiplyScalar(.5);m.scale.set(r,delta.length(),r);m.quaternion.setFromUnitVectors(up,delta.normalize());m.castShadow=true;this.props.add(m);}
 setProps(p){
  const key=p.prop+Boolean(p.roll);if(key===this.propKey)return;this.propKey=key;
  this.props.children.forEach(m=>{if(m.geometry!==this.cylinder&&m.geometry!==this.sphere)m.geometry.dispose();});this.props.clear();
  if(p.prop==='chair'){this.box([.58,.07,.52],[0,.49,.02],'wood');this.box([.58,.42,.06],[0,.85,-.25],'wood');for(const x of [-.23,.23])for(const z of [-.2,.23])this.rod([x,0,z],[x,.49,z]);}
  if(p.prop==='rail'){this.rod([-.65,1.1,.42],[.65,1.1,.42],.035);for(const x of [-.6,.6]){this.rod([x,0,.42],[x,1.1,.42]);this.rod([x,0,.22],[x,0,.62],.035);}}
  if(p.prop==='wall'||p.prop==='frontwall'){const z=p.prop==='wall'?-.19:.78;const wall=this.box([1.1,1.95,.055],[0,.975,z],'bed');wall.material=this.mat.bed.clone();wall.material.transparent=true;wall.material.opacity=.25;wall.material.depthWrite=false;}
  if(p.prop==='mat')this.box([1.15,.02,2.45],[0,.015,.2],'mat');
  if(p.prop==='bed'){this.box([1.25,.16,2.4],[0,.37,.05],'bed');this.box([1.27,.08,2.42],[0,.25,.05],'wood');this.ellipsoid(this.props,[.40,.07,.23],'white',[0,.49,-.73]);for(const x of [-.5,.5])for(const z of [-.9,1])this.box([.06,.23,.06],[x,.115,z],'wood');}
  if(p.roll){const m=new T.Mesh(this.cylinder,this.mat.mat);m.rotation.z=Math.PI/2;m.scale.set(.12,.55,.12);m.position.set(0,.57,.55);this.props.add(m);}
 }
 draw(pose,time){
  if(this.dead||!supported.includes(pose))return false;
  this.pose=pose;this.time=time;const p=sample(pose,time);this.phase=p.phase;this.muscleState=muscleInfo(pose,time,p);this.setProps(p);
  const lying=['supine','side'].includes(p.mode),prone=p.mode==='prone';
  const rootQ=new T.Quaternion();if(lying){rootQ.setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);if(p.mode==='side')rootQ.multiply(new T.Quaternion().setFromAxisAngle(up,-Math.PI/2));}
  const offset=lying?new T.Vector3(0,p.prop==='bed'?.60:p.mode==='side'?.24:.16,.15):new T.Vector3();
  const world=a=>V(a).applyQuaternion(rootQ).add(offset);
  const hip=world(p.hip),chest=world(p.chest),axis=chest.clone().sub(hip).normalize();
  const orient=new T.Quaternion().setFromUnitVectors(up,axis);
  // In prone poses +Z points down towards the floor; in supine it points upwards.
  if(lying)orient.copy(rootQ).multiply(new T.Quaternion().setFromUnitVectors(up,V(p.chest).sub(V(p.hip)).normalize()));
  if(prone)orient.setFromEuler(new T.Euler(-Math.PI/2,0,0)).multiply(new T.Quaternion().setFromAxisAngle(up,Math.PI));
  const side=prone?new T.Vector3(1,0,0):new T.Vector3(1,0,0).applyQuaternion(orient),front=new T.Vector3(0,0,1).applyQuaternion(orient);
  this.parts.hip.position.copy(hip);this.parts.hip.quaternion.copy(orient);
  this.parts.torso.position.copy(hip).lerp(chest,.52);this.parts.torso.position.addScaledVector(front,p.arch||0);this.parts.torso.scale.set(.205*(1+.006*Math.sin(time*Math.PI/3)),hip.distanceTo(chest),.125*(1+.008*Math.sin(time*Math.PI/3)));this.parts.torso.quaternion.copy(orient);
  this.parts.torso.material=this.mat.shirt;this.parts.hip.material=this.mat.pants;
  const neck=chest.clone().addScaledVector(axis,.065),head=chest.clone().addScaledVector(axis,.23);
  this.parts.neck.position.copy(neck);this.parts.neck.quaternion.copy(orient);this.head.position.copy(head);this.head.quaternion.copy(orient).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),p.headTilt||0));
  if(p.twist)this.parts.torso.quaternion.multiply(new T.Quaternion().setFromAxisAngle(up,p.twist));
  this.diagnostics=[];
  for(let i=0;i<4;i++){
   const arm=i<2,idx=i%2,sign=idx?1:-1,m=this.limbs[i];
   const start=(arm?chest:hip).clone().addScaledVector(side,sign*(arm?.195:.115));
   const target=world((arm?p.hands:p.feet)[idx]);
   let pole=world((arm?p.elbowPole:p.kneePole)[idx]);
   if(lying&&arm)pole=start.clone().addScaledVector(side,sign*.4).addScaledVector(front,.1).addScaledVector(axis,-.25);
   if(prone){pole=arm?start.clone().addScaledVector(side,sign*.4).add(new T.Vector3(0,-.2,0)):start.clone().add(new T.Vector3(0,-1,0));}
   const result=joint(start,target,pole,arm?.29:.44,arm?.27:.44);
   let middle=result.middle,end=result.end;
   if(!arm&&p.knees&&p.knees[idx]){middle=world(p.knees[idx]);end=target;}
   this.diagnostics.push({arm,error:result.error,upper:start.distanceTo(middle),lower:middle.distanceTo(end)});m.joints={start:start.clone(),middle:middle.clone(),end:end.clone(),front:front.clone(),side:side.clone()};
   this.updateSurface(m.surface,start,middle,end,m.arm,front,idx);this.segment(m.upper,start,middle,m.w*1.13);this.segment(m.lower,middle,end,m.w*.86);m.start.position.copy(start);m.joint.position.copy(middle);m.end.position.copy(end);
   m.upper.material=arm?this.mat.skin:this.mat.pants;
   if(arm){m.end.visible=p.prop!=='rail';m.grip.visible=p.prop==='rail';if(m.grip.visible)m.grip.position.set(sign*.30,1.1,.42);this.segment(m.sleeve,start,start.clone().lerp(middle,.46),.074);m.end.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),end.clone().sub(middle).normalize());if(prone&&target.y<.03)m.end.quaternion.setFromEuler(new T.Euler(Math.PI/2,0,0));m.end.rotateX(p.wrist||0);m.fingers.forEach(f=>{f.rotation.x=-(p.finger||0)*1.3;f.position.z=(p.finger||0)*.02;});}
   else{m.end.quaternion.copy(lying?rootQ:new T.Quaternion());m.end.rotateX(-(p.footPitch[idx]||0));}
  }
  this.updateMuscles(orient,hip,chest);
  this.body.updateMatrixWorld(true);
  const w=this.host.clientWidth||600,h=this.host.clientHeight||430;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;
  const target=new T.Vector3(0,lying?(p.prop==='bed'?.61:.23):prone?.45:.90,lying?.12:prone?.2:.08);
  const yaw=this.view==='front'?0:this.view==='side'?Math.PI/2:this.view==='back'?Math.PI:(prone?2.25:this.yaw);
  const elevation=lying?.72:prone?.36:this.elevation,dist=Math.max(lying||prone?3.8:3.9,(lying||prone?2.5:1.55)/(2*Math.tan(16*Math.PI/180)*this.camera.aspect));
  this.camera.position.set(target.x+Math.sin(yaw)*dist,target.y+dist*elevation,target.z+Math.cos(yaw)*dist);this.camera.lookAt(target);this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);return true;
 }
}
const host=document.querySelector('[data-value="three-stage"]');
if(host){
 try{
  const trainer=new Trainer(host);window.WORKOUT_3D=trainer;
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{trainer.view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));trainer.draw(trainer.pose,trainer.time);}));
  window.dispatchEvent(new Event('workout-3d-ready'));
 }catch(error){console.warn('3D unavailable; keeping the illustrated demonstration.',error);host.hidden=true;}
}


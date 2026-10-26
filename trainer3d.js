import * as T from './vendor/three.module.js';
import {sample,supported} from './motion3d.js?v=12';
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
  const key=new T.DirectionalLight(0xfff3df,3.1);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-2,near:.1,far:12});key.shadow.bias=-.0003;key.shadow.normalBias=.02;this.scene.add(key);
  const fill=new T.DirectionalLight(0xc9dcff,1.5);fill.position.set(3,3,-3);this.scene.add(fill);
  this.mat={};for(const [k,c] of Object.entries({skin:0xd9a386,shirt:0x496bd4,pants:0x263955,hair:0x392d2a,white:0xf1f2ef,sole:0xb6c4d5,eye:0x293344,lip:0x995e52,prop:0x9daec3,wood:0xd9c8b9,bed:0xdbe5f2,mat:0xb8c9d9,highlight:0x6cbcb0}))this.mat[k]=new T.MeshStandardMaterial({color:c,roughness:.78});
  this.sphere=new T.SphereGeometry(1,24,16);this.cylinder=new T.CylinderGeometry(1,1,1,20);this.cone=new T.CylinderGeometry(.78,1,1,20);
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
   this.limbs.push(group);
  }
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
  this.resize=new ResizeObserver(()=>this.draw(this.pose,this.time));this.resize.observe(host);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.dead=true;host.hidden=true;document.querySelector('[data-value="movement"]').style.display='block';document.querySelector('[data-value="view-controls"]').hidden=true;});
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
  this.pose=pose;this.time=time;const p=sample(pose,time);this.phase=p.phase;this.setProps(p);
  const lying=['supine','side'].includes(p.mode),prone=p.mode==='prone';
  const rootQ=new T.Quaternion();if(lying)rootQ.setFromEuler(new T.Euler(-Math.PI/2,0,p.mode==='side'?Math.PI/2:0));
  const offset=lying?new T.Vector3(0,p.prop==='bed'?.60:.16,.15):new T.Vector3();
  const world=a=>V(a).applyQuaternion(rootQ).add(offset);
  const hip=world(p.hip),chest=world(p.chest),axis=chest.clone().sub(hip).normalize();
  const orient=new T.Quaternion().setFromUnitVectors(up,axis);
  // In prone poses +Z points down towards the floor; in supine it points upwards.
  if(lying)orient.copy(rootQ).multiply(new T.Quaternion().setFromUnitVectors(up,V(p.chest).sub(V(p.hip)).normalize()));
  if(prone)orient.setFromEuler(new T.Euler(-Math.PI/2,0,0)).multiply(new T.Quaternion().setFromAxisAngle(up,Math.PI));
  const side=prone?new T.Vector3(1,0,0):new T.Vector3(1,0,0).applyQuaternion(orient),front=new T.Vector3(0,0,1).applyQuaternion(orient);
  this.parts.hip.position.copy(hip);this.parts.hip.quaternion.copy(orient);
  this.parts.torso.position.copy(hip).lerp(chest,.52);this.parts.torso.position.addScaledVector(front,p.arch||0);this.parts.torso.scale.set(.205,hip.distanceTo(chest),.125);this.parts.torso.quaternion.copy(orient);
  this.parts.torso.material=this.mat.shirt;this.parts.hip.material=p.highlight>.6&&pose==='bed-glutes'?this.mat.highlight:this.mat.pants;
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
   this.diagnostics.push({arm,error:result.error,upper:start.distanceTo(middle),lower:middle.distanceTo(end)});
   this.segment(m.upper,start,middle,m.w*1.13);this.segment(m.lower,middle,end,m.w*.86);m.start.position.copy(start);m.joint.position.copy(middle);m.end.position.copy(end);
   m.upper.material=!arm&&p.highlight>.6&&pose==='bed-quads'?this.mat.highlight:(arm?this.mat.skin:this.mat.pants);
   if(arm){this.segment(m.sleeve,start,start.clone().lerp(middle,.46),.074);m.end.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),end.clone().sub(middle).normalize());if(prone&&target.y<.03)m.end.quaternion.setFromEuler(new T.Euler(Math.PI/2,0,0));m.end.rotateX(p.wrist||0);m.fingers.forEach(f=>{f.rotation.x=-(p.finger||0)*1.3;f.position.z=(p.finger||0)*.02;});}
   else{m.end.quaternion.copy(lying?rootQ:new T.Quaternion());m.end.rotateX(-(p.footPitch[idx]||0));}
  }
  const w=this.host.clientWidth||600,h=this.host.clientHeight||430;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;
  const target=new T.Vector3(0,lying?(p.prop==='bed'?.61:.23):prone?.45:.85,lying?.12:prone?.2:.08);
  const yaw=this.view==='front'?0:this.view==='side'?Math.PI/2:(prone?2.25:this.yaw);
  const elevation=lying?.72:prone?.36:this.elevation,dist=Math.max(lying||prone?3.8:3.6,(lying||prone?2.5:1.55)/(2*Math.tan(16*Math.PI/180)*this.camera.aspect));
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

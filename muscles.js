// Schematic main muscle groups, not measured activation or a ranking of force.
// References and limitations are recorded in ANIMATION.md.
const groups={
 'seated-wrist-extension':['forearms'],'seated-ankle-circles':['calves','shins'],'towel-toe-curls':['feet'],
 heels:['calves'],balance:['calves','abductors','core'],march:['hipflexors','quads'],kneelifts:['hipflexors','core'],heeldigs:['shins','quads'],sidesteps:['abductors'],standside:['abductors'],standback:['glutes','hamstrings'],minisquat:['quads','glutes'],sitstand:['quads','glutes'],seatmarch:['hipflexors'],curls:['biceps'],ankles:['calves','shins'],pelvic:['core'],bridge:['glutes','hamstrings','back'],sideleg:['abductors'],crunch:['core'],rotation:['obliques'],squat:['quads','glutes'],wallpush:['chest','triceps','shoulders'],cat:['core','back'],birddog:['back','glutes','core','shoulders'],hover:['core','shoulders','quads'],hipstretch:['glutes'],legstretch:['hamstrings','calves'],
 'bed-pumps':['calves','shins'],'bed-hands':['forearms'],'bed-wrists':['forearms'],'bed-elbows':['biceps'],'bed-arms':['shoulders'],'bed-heelslide':['hipflexors','hamstrings'],'bed-quads':['quads'],'bed-glutes':['glutes'],'bed-abduction':['abductors'],'bed-shortarc':['quads'],
 'cardio-march':['hipflexors','shoulders'],'cardio-side':['abductors'],'cardio-sidearms':['abductors','shoulders'],'cardio-tap':['hipflexors','shoulders'],'cardio-vstep':['hipflexors','abductors'],'cardio-kick':['quads'],'cardio-reach':['shoulders','triceps'],'cardio-speed':['shoulders','forearms'],'cardio-speedmarch':['shoulders','forearms','hipflexors'],'cardio-star':['abductors','shoulders']
};
export const labels={feet:'Мышцы стопы и сгибатели пальцев',calves:'Икры',shins:'Передняя поверхность голени',quads:'Передняя поверхность бедра',hamstrings:'Задняя поверхность бедра',glutes:'Ягодичные',abductors:'Боковые ягодичные',core:'Мышцы живота',obliques:'Косые мышцы живота',back:'Разгибатели спины',chest:'Грудные',shoulders:'Дельтовидные',biceps:'Бицепсы',triceps:'Трицепсы',forearms:'Мышцы предплечья',hipflexors:'Сгибатели бедра'};
export function muscleInfo(pose,time,p){
 const selected=groups[pose]||[],stretch=['hipstretch','legstretch'].includes(pose),c=(time%6)/6;
 // Smooth visibility follows the demonstration, not an estimate of muscle force.
 const phase=.5-.5*Math.cos(c*Math.PI*2),visibility=.35+.65*phase;
 const side=pose==='seated-ankle-circles'?[0,1]:pose==='sideleg'?[0,1]:pose==='bed-glutes'||pose==='bed-quads'?[1,1]:pose.startsWith('bed-')&&['bed-heelslide','bed-elbows','bed-arms','bed-shortarc','bed-abduction'].includes(pose)?(Math.floor(time/6)%2?[0,1]:[1,0]):[1,1];
 return {selected,stretch,visibility,side,text:(stretch?'Растяжка: ':pose==='cat'?'Движение и стабилизация: ':'Основные мышцы: ')+selected.map(k=>labels[k]).join(' · ')};
}

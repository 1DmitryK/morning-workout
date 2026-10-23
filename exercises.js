'use strict';
// Stable IDs keep diary entries intact as the exercise library grows.
const NHS_CORE_PDF='https://www.royalberkshire.nhs.uk/media/qfljlxzd/physio-core-exercise-programme-matplusgynae.pdf';
const nhs=(number,page,id,name,position,pose,description,unit='reps')=>({id,name,position,pose,description,unit,defaultReps:null,group:'nhs',sourceNumber:number,source:{label:'Royal Berkshire NHS · № '+number+' · стр. '+page,url:NHS_CORE_PDF+'#page='+page}});
window.WORKOUT_EXERCISES=Object.freeze([
 {id:'heel-raise',name:'Подъём на носки',position:'Стоя с опорой',pose:'heels',defaultReps:10,unit:'reps',group:'personal',description:'Подъём и опускание пяток. Носки остаются на полу.',source:null},
 {id:'balance',name:'Равновесие',position:'Стоя с опорой',pose:'balance',defaultReps:10,unit:'reps',group:'personal',description:'Одна нога согнута, другая стоит на носке. Рука на опоре.',source:null},
 {id:'ankle-pumps',name:'Работа пальчиками',position:'Сидя',pose:'ankles',defaultReps:10,unit:'reps',group:'personal',description:'Движения стоп на себя и от себя, по твоему описанию.',source:null},
 nhs(1,1,'pelvic-tilt','Наклоны таза','Лёжа на спине','pelvic','Мягко меняйте прогиб поясницы, затем прижимайте её к поверхности.'),
 nhs(2,1,'bridge','Ягодичный мостик','Лёжа на спине','bridge','Согните колени; плавно поднимайте и опускайте таз.'),
 nhs(3,2,'side-leg-raise','Подъём ноги на боку','Лёжа на боку','sideleg','Нижняя нога согнута; поднимайте прямую верхнюю ногу, сохраняя таз неподвижным.'),
 nhs(4,2,'abdominal-crunch','Пресс · небольшое скручивание','Лёжа на спине','crunch','Колени согнуты; приподнимайте голову и грудь, затем опускайте.'),
 nhs(5,2,'abdominal-rotation','Пресс · повороты корпуса','Лёжа на спине','rotation','Приподняв голову и грудь, поворачивайте грудную клетку поочерёдно в стороны.'),
 nhs(6,3,'wall-squat','Приседание у стены','Спиной к стене','squat','Скользите спиной вниз по стене; затем возвращайтесь вверх.','seconds'),
 nhs(7,3,'wall-pushup','Отжимания от стены','Лицом к стене','wallpush','Сгибайте руки, приближая грудь к стене; затем выпрямляйте.'),
 nhs(8,3,'cat-camel','Кошка · прогиб и округление','На четвереньках','cat','Плавно чередуйте прогиб и округление спины.'),
 nhs(9,3,'bird-dog','Противоположные рука и нога','На четвереньках','birddog','Выпрямляйте противоположные руку и ногу; возвращайтесь и меняйте сторону.'),
 nhs(10,4,'kneeling-hover','Подъём коленей над полом','На четвереньках','hover','Опираясь на ладони и носки, слегка оторвите колени от пола.','seconds'),
 nhs(11,4,'hip-stretch','Растяжка ягодичной области','Сидя на стуле','hipstretch','Положите стопу на другую ногу и наклонитесь вперёд.','seconds'),
 nhs(12,4,'hamstring-stretch','Растяжка задней поверхности ноги','Сидя на стуле','legstretch','Выпрямите ногу и потяните носок на себя.','seconds')
]);

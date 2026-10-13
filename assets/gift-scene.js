import * as THREE from 'three';
import { GLTFLoader } from './loaders/GLTFLoader.js';

// The same WebGL renderer travels from the gift chapter into the portal.
const $ = id => document.getElementById(id);
const section=$('gift'), final=$('final'), viewport=$('giftViewport'), host=$('giftCanvasHost');
const loading=$('giftLoading'), fallback=$('giftFallback'), rotateButton=$('giftRotate'), openButton=$('giftOpen'), prompt=$('giftPrompt');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const home=new THREE.Vector3(4.5,3.45,6.7), homeTarget=new THREE.Vector3(0,1.42,0);
const stops=[
  [0,[4.5,3.45,6.7],[0,1.42,0]],
  [1400,[3.65,3.55,5.25],[0,1.65,0]],
  [2350,[1.65,4.65,2.35],[0,1.65,0]],
  [3250,[0,3.45,.38],[0,1.32,0]],
  [4100,[0,1.24,.08],[0,.48,0]],
  [5000,[0,.65,0],[0,-.6,0]]
];
let renderer,scene,camera,presentation,model,mixer,action,innerLight,glow,particles;
let portal,portalHost,veil,visible=false,ready=false,opening=false,opened=false,ending=false,rotateMode=false,dragging=false;
let raf=0,openAt=0,lastFrameAt=0,yaw=-.12,pitch=0,startPoint=null,visits=0,oldBodyOverflow='',oldHtmlOverflow='';
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();

function resize(){
  if(!renderer)return;
  const box=opening&&portalHost?portalHost:host;
  camera.aspect=Math.max(1,box.clientWidth)/Math.max(1,box.clientHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(Math.max(1,box.clientWidth),Math.max(1,box.clientHeight),false);
  if(model)renderer.render(scene,camera);
}
function requestFrame(){if(!raf&&(visible||opening)&&ready)raf=requestAnimationFrame(frame)}
function flight(ms){
  let i=0;while(i<stops.length-2&&ms>stops[i+1][0])i++;
  const a=stops[i],b=stops[i+1],f=smooth((ms-a[0])/(b[0]-a[0]));
  camera.position.set(...a[1]).lerp(new THREE.Vector3(...b[1]),f);
  camera.lookAt(new THREE.Vector3(...a[2]).lerp(new THREE.Vector3(...b[2]),f));
}
function frame(now){
  raf=0;if(!ready||(!visible&&!opening))return;
  if(opening){
    const ms=Math.min(5990,now-openAt);
    mixer.update(Math.max(0,(now-lastFrameAt)/1000));
    lastFrameAt=now;
    flight(ms);
    const light=smooth((ms-400)/1050);
    innerLight.intensity=light*mix(16,1.5,smooth((ms-2850)/1250));
    glow.visible=light>0;glow.material.opacity=light*.38*(1-smooth((ms-2850)/1050));
    glow.scale.setScalar(mix(2.8,4.4,smooth((ms-2300)/1300)));
    particles.visible=ms>2750;
    particles.material.opacity=.72*smooth((ms-2750)/950);
    particles.position.copy(camera.position);
    particles.quaternion.copy(camera.quaternion);
    particles.rotation.z+=.0015;
    if(veil)veil.style.opacity=String(smooth((ms-2950)/1650));
    if(ms>4450&&!ending){
      ending=true;
      document.dispatchEvent(new Event('ozoda-gift-opened'));
      final.scrollIntoView({behavior:'instant',block:'start'});
    }
    if(ms>4950&&portal)portal.classList.add('gift-portal-dissolve');
    if(ms>=5900)finish();
  }else if(!dragging&&!reduced)yaw+=Math.sin(now*.0007)*.00034;
  presentation.rotation.set(pitch,yaw,0);
  renderer.render(scene,camera);
  requestFrame();
}
function lockScroll(){
  oldBodyOverflow=document.body.style.overflow;
  oldHtmlOverflow=document.documentElement.style.overflow;
  document.body.style.overflow='hidden';
  document.documentElement.style.overflow='hidden';
}
function unlockScroll(){
  document.body.style.overflow=oldBodyOverflow;
  document.documentElement.style.overflow=oldHtmlOverflow;
}
function makePortal(){
  const rect=viewport.getBoundingClientRect();
  portal=document.createElement('div');portal.className='gift-portal';
  portal.style.setProperty('--portal-x',rect.left+'px');
  portal.style.setProperty('--portal-y',rect.top+'px');
  portal.style.setProperty('--portal-w',rect.width+'px');
  portal.style.setProperty('--portal-h',rect.height+'px');
  portal.setAttribute('role','dialog');
  portal.setAttribute('aria-label','Кинематографичное открытие подарка');
  portalHost=document.createElement('div');portalHost.className='gift-portal-canvas';
  veil=document.createElement('div');veil.className='gift-portal-veil';
  const skip=document.createElement('button');
  skip.type='button';skip.className='gift-portal-skip';skip.textContent='Пропустить анимацию ↗';
  skip.addEventListener('click',finish);
  portal.append(portalHost,veil,skip);document.body.appendChild(portal);
  portalHost.appendChild(renderer.domElement);
  requestAnimationFrame(()=>{if(portal){portal.classList.add('gift-portal-full');resize()}});
}
function finish(){
  if(!opening)return;
  opening=false;opened=true;ending=false;visits++;
  if(mixer){action.reset().play();mixer.setTime(5.98)}
  if(particles)particles.visible=false;
  if(glow){glow.visible=true;glow.material.opacity=.32;glow.scale.setScalar(2.8)}
  if(innerLight)innerLight.intensity=14;
  camera.position.copy(home);camera.lookAt(homeTarget);
  if(portal){portal.remove();portal=null;portalHost=null;veil=null}
  if(renderer)host.appendChild(renderer.domElement);
  final.scrollIntoView({behavior:'instant',block:'start'});
  unlockScroll();
  openButton.disabled=false;rotateButton.disabled=!ready;
  openButton.textContent='Посмотреть ещё раз ↗';
  prompt.textContent='Подарок открыт. Можно вернуться и повторить полёт.';
  if(visits===1)document.dispatchEvent(new Event('ozoda-gift-opened'));
  resize();requestFrame();
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opening)finish()});
function start(){
  if(opening)return;
  document.dispatchEvent(new Event('ozoda-gift-start'));
  if(!ready||reduced){
    opened=true;document.dispatchEvent(new Event('ozoda-gift-opened'));
    openButton.textContent='Посмотреть ещё раз ↗';
    final.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  rotateMode=false;dragging=false;viewport.classList.remove('rotating');
  rotateButton.setAttribute('aria-pressed','false');
  rotateButton.textContent='Повернуть коробку ↻';
  rotateButton.disabled=true;openButton.disabled=true;
  action.reset().play();mixer.setTime(0);
  opening=true;ending=false;lockScroll();makePortal();
  openAt=performance.now();lastFrameAt=openAt;requestFrame();
}
function sprite(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,3,64,64,64);
  g.addColorStop(0,'rgba(255,244,216,.95)');
  g.addColorStop(.25,'rgba(255,153,195,.58)');
  g.addColorStop(1,'rgba(255,110,175,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  s.position.set(0,1.92,0);s.scale.set(2.8,2.8,1);s.visible=false;return s;
}
function makeParticles(){
  const count=innerWidth<600?85:170,values=new Float32Array(count*3);
  for(let i=0;i<count;i++){values[i*3]=(Math.random()-.5)*4.8;values[i*3+1]=(Math.random()-.5)*3.8;values[i*3+2]=-1.5-Math.random()*6}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(values,3));
  const p=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xff8fd0,size:innerWidth<600?.055:.042,transparent:true,opacity:0,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending}));
  p.visible=false;return p;
}
function buildScene(){
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<600?1.25:1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.6;
  host.appendChild(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(36,1,.06,100);
  camera.position.copy(home);camera.lookAt(homeTarget);
  scene.add(new THREE.HemisphereLight(0xffe5ef,0x45152d,2.1));
  const key=new THREE.DirectionalLight(0xfff1e7,3.2);key.position.set(-3.5,6,5);scene.add(key);
  const fill=new THREE.PointLight(0xc6b5ff,27,9,2);fill.position.set(4,3.8,-2.5);scene.add(fill);
  const rim=new THREE.PointLight(0xff4fa7,22,8,2);rim.position.set(-2,4,-3.5);scene.add(rim);
  innerLight=new THREE.PointLight(0xffd2c3,0,4,2);innerLight.position.set(0,1.92,0);scene.add(innerLight);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,5,64,64,62);
  g.addColorStop(0,'rgba(17,3,18,.54)');g.addColorStop(1,'rgba(17,3,18,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4.3,4.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.055;scene.add(shadow);
  presentation=new THREE.Group();scene.add(presentation);
  particles=makeParticles();scene.add(particles);
  new ResizeObserver(resize).observe(host);
  window.addEventListener('resize',resize,{passive:true});
}
function fallbackMode(message){
  loading.classList.add('done');fallback.hidden=false;fallback.textContent=message;
  openButton.disabled=false;rotateButton.disabled=true;
  prompt.textContent='Нажми «Открыть подарок», чтобы увидеть подсказку и финал.';
}
function pick(x,y){
  if(!ready||rotateMode||opening)return false;
  const r=renderer.domElement.getBoundingClientRect();
  pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  return raycaster.intersectObject(model,true).length>0;
}
viewport.addEventListener('pointerdown',e=>{
  if(!ready||opening)return;
  startPoint={x:e.clientX,y:e.clientY};
  if(rotateMode){dragging=true;viewport.setPointerCapture(e.pointerId);e.preventDefault()}
});
viewport.addEventListener('pointermove',e=>{
  if(!dragging||!startPoint)return;
  yaw+=(e.clientX-startPoint.x)*.009;
  pitch=Math.max(-.24,Math.min(.25,pitch+(e.clientY-startPoint.y)*.003));
  startPoint={x:e.clientX,y:e.clientY};requestFrame();
});
viewport.addEventListener('pointerup',e=>{
  if(dragging){dragging=false;startPoint=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);return}
  if(startPoint&&Math.hypot(e.clientX-startPoint.x,e.clientY-startPoint.y)<8&&pick(e.clientX,e.clientY))start();
  startPoint=null;
});
viewport.addEventListener('pointercancel',e=>{dragging=false;startPoint=null;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId)});
rotateButton.addEventListener('click',()=>{
  if(!ready||opening)return;
  rotateMode=!rotateMode;viewport.classList.toggle('rotating',rotateMode);
  rotateButton.setAttribute('aria-pressed',String(rotateMode));
  rotateButton.textContent=rotateMode?'Готово ✓':'Повернуть коробку ↻';
  prompt.textContent=rotateMode?'Вращай коробку пальцем или мышкой. «Готово» вернёт прокрутку.':'Нажми на коробку или кнопку «Открыть подарок».';
  requestFrame();
});
openButton.addEventListener('click',start);
new IntersectionObserver(entries=>{
  visible=entries[0].isIntersecting;
  if(visible){section.classList.add('visible');requestFrame()}
  else if(!opening&&raf){cancelAnimationFrame(raf);raf=0}
},{threshold:.04}).observe(section);
try{
  if(!document.createElement('canvas').getContext('webgl2')&&!document.createElement('canvas').getContext('webgl'))throw Error('WebGL unavailable');
  buildScene();
  new GLTFLoader().load(new URL('./gift.glb',import.meta.url).href,gltf=>{
    model=gltf.scene;
    model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.material.side=THREE.DoubleSide}});
    presentation.add(model);
    mixer=new THREE.AnimationMixer(model);
    const clip=gltf.animations.find(c=>c.name==='Gift_Open')||gltf.animations[0];
    action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
    glow=sprite();scene.add(glow);
    ready=true;loading.classList.add('done');openButton.disabled=false;rotateButton.disabled=false;
    resize();requestFrame();
    window.ozodaGiftDebug={
      get clips(){return gltf.animations.map(c=>({name:c.name,duration:c.duration}))},
      get opening(){return opening},get opened(){return opened},get visible(){return visible},
      get rendering(){return Boolean(raf)},get yaw(){return yaw},get camera(){return camera.position.toArray()},
      get lid(){return model.getObjectByName('Gift_Lid_Hinge')?.position.y},
      get lidPosition(){return model.getObjectByName('Gift_Lid_Hinge')?.position.toArray()},
      get action(){return {running:action.isRunning(),time:action.time,enabled:action.enabled,paused:action.paused,mixerTime:mixer.time}},
      get scrollLocked(){return document.documentElement.style.overflow==='hidden'},
      get portal(){return Boolean(portal)},get visits(){return visits},
      get ribbons(){return ['Gift_Ribbon_Back','Gift_Ribbon_Front','Gift_Ribbon_Left','Gift_Ribbon_Right'].map(n=>model.getObjectByName(n)?.position.toArray())}
    };
  },undefined,()=>fallbackMode('Не удалось загрузить 3D-модель. Подарок и финал всё равно доступны.'));
}catch(error){fallbackMode('На этом устройстве WebGL недоступен. Подарок и финал всё равно доступны.')}

/* DELYART — animations (voir motion.css). Aucune bibliothèque, ~150 lignes.
   Chaque effet est indépendant : si l'un échoue, le site reste utilisable. */
(()=>{
'use strict';
const rd=matchMedia('(prefers-reduced-motion:reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const root=document.documentElement;
if(rd)return; // mouvement réduit : rien à faire, le CSS affiche tout

/* ---------- 1. Cascade à l'apparition ----------
   Les éléments qui apparaissent ensemble (une rangée de cartes, le haut de page)
   se décalent de 80 ms chacun, du haut vers le bas puis de gauche à droite. */
const rv=[...document.querySelectorAll('.rv')];
if(rv.length&&'IntersectionObserver'in window){
  const io=new IntersectionObserver(es=>{
    es.filter(e=>e.isIntersecting)
      .sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left)
      .forEach((e,i)=>{
        const el=e.target;io.unobserve(el);
        el.style.transitionDelay=Math.min(i,5)*80+'ms';
        /* Une fois apparu, l'élément retrouve ses propres styles (survol, etc.) */
        el.addEventListener('transitionend',function f(ev){
          if(ev.target!==el||ev.propertyName!=='opacity')return;
          el.removeEventListener('transitionend',f);
          el.style.transitionDelay='';el.classList.remove('rv','in');
        });
      });
  },{threshold:.12});
  rv.forEach(el=>io.observe(el));
}

if(!fine)return; // les effets ci-dessous demandent une souris

/* ---------- 2. Boutons magnétiques ---------- */
const mags=[...document.querySelectorAll('.btn,.go')].map(el=>{
  el.setAttribute('data-magnet','');
  const go=el.classList.contains('go');
  return{el,s:go?.4:.35,r:go?120:90,tx:0,ty:0,cx:0,cy:0};
});
let mraf=0;
const mloop=()=>{
  let busy=false;
  for(const m of mags){
    m.cx+=(m.tx-m.cx)*.18;m.cy+=(m.ty-m.cy)*.18;
    const moving=Math.abs(m.tx-m.cx)>.05||Math.abs(m.ty-m.cy)>.05;
    /* `translate` et non `transform` : l'animation d'entrée de l'accueil (fill-mode both)
       verrouille `transform` et aurait bloqué le déplacement des boutons « Entrer ». */
    if(moving){busy=true;m.el.style.translate=`${m.cx.toFixed(2)}px ${m.cy.toFixed(2)}px`}
    else if(m.el.style.translate){m.cx=m.tx;m.cy=m.ty;m.el.style.translate=(m.tx||m.ty)?`${m.tx}px ${m.ty}px`:''}
  }
  mraf=busy?requestAnimationFrame(mloop):0;
};
if(mags.length)addEventListener('mousemove',e=>{
  let kick=false;
  for(const m of mags){
    const b=m.el.getBoundingClientRect();
    if(b.bottom<-m.r||b.top>innerHeight+m.r)continue;
    const dx=e.clientX-(b.left+b.width/2-m.cx),dy=e.clientY-(b.top+b.height/2-m.cy);
    if(Math.hypot(dx,dy)<m.r){m.tx=dx*m.s;m.ty=dy*m.s;kick=true}
    else if(m.tx||m.ty){m.tx=0;m.ty=0;kick=true}
  }
  if(kick&&!mraf)mraf=requestAnimationFrame(mloop);
},{passive:true});

/* ---------- 3. Cartes inclinées en 3D ---------- */
function tilt(el,max){
  let tx=0,ty=0,cx=0,cy=0,raf=0;
  const loop=()=>{
    cx+=(tx-cx)*.1;cy+=(ty-cy)*.1;
    el.style.transform=`perspective(800px) rotateX(${cx.toFixed(2)}deg) rotateY(${cy.toFixed(2)}deg)`;
    if(Math.abs(tx-cx)>.01||Math.abs(ty-cy)>.01)raf=requestAnimationFrame(loop);
    else{raf=0;if(!tx&&!ty)el.style.transform=''}
  };
  el.addEventListener('mousemove',e=>{
    const b=el.getBoundingClientRect();
    tx=((e.clientY-b.top-b.height/2)/b.height)*max;
    ty=-((e.clientX-b.left-b.width/2)/b.width)*max;
    if(!raf)raf=requestAnimationFrame(loop);
  },{passive:true});
  el.addEventListener('mouseleave',()=>{tx=0;ty=0;if(!raf)raf=requestAnimationFrame(loop)});
  el.style.willChange='transform';
}
document.querySelectorAll('.logo-stage').forEach(el=>tilt(el,8));
document.querySelectorAll('.hero-shot img').forEach(el=>tilt(el,4));

/* ---------- 4. Accueil : inclinaison du split + curseur ---------- */
const split=document.querySelector('.split');
if(split){
  root.classList.add('fine-motion');
  let tx=0,ty=0,cx=0,cy=0,raf=0;
  const loop=()=>{
    cx+=(tx-cx)*.08;cy+=(ty-cy)*.08;
    split.style.setProperty('--rx',cx.toFixed(2)+'deg');
    split.style.setProperty('--ry',cy.toFixed(2)+'deg');
    raf=(Math.abs(tx-cx)>.01||Math.abs(ty-cy)>.01)?requestAnimationFrame(loop):0;
  };
  split.addEventListener('mousemove',e=>{
    if(split.classList.contains('entering'))return;
    const b=split.getBoundingClientRect();
    tx=((e.clientY-b.top)/b.height-.5)*6;
    ty=-((e.clientX-b.left)/b.width-.5)*6;
    if(!raf)raf=requestAnimationFrame(loop);
  },{passive:true});
  const rest=()=>{tx=0;ty=0;if(!raf)raf=requestAnimationFrame(loop)};
  split.addEventListener('mouseleave',rest);
  split.addEventListener('click',rest); // au clic (entrée dans un univers), le split se redresse

  /* Curseur : un point + un anneau qui le suit en retard */
  const ring=document.createElement('div'),dot=document.createElement('div');
  ring.className='cursor-ring';dot.className='cursor-dot';
  ring.setAttribute('aria-hidden','true');dot.setAttribute('aria-hidden','true');
  document.body.append(ring,dot);
  root.classList.add('has-cursor');
  let mx=0,my=0,rx=0,ry=0,craf=0,first=true;
  const cloop=()=>{
    rx+=(mx-rx)*.16;ry+=(my-ry)*.16;
    ring.style.transform=`translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) translate(-50%,-50%)`;
    craf=(Math.abs(mx-rx)>.1||Math.abs(my-ry)>.1)?requestAnimationFrame(cloop):0;
  };
  addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`;
    if(first){first=false;rx=mx;ry=my;root.classList.add('cursor-on')}
    ring.style.setProperty('--s',e.target.closest&&e.target.closest('a,button')?1.8:1);
    if(!craf)craf=requestAnimationFrame(cloop);
  },{passive:true});
  document.addEventListener('mouseleave',()=>root.classList.remove('cursor-on'));
  document.addEventListener('mouseenter',()=>{if(!first)root.classList.add('cursor-on')});
}
})();

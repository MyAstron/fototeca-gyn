(function(){
const $=s=>document.querySelector(s),esc=App.esc,imgSrc=App.imgSrc;
/* ===== Modelo: JSON -> pasos (padres e hijos aplanados) ===== */
function readingOrder(arr){   /* arriba→abajo y, en la misma fila, izquierda→derecha */
  const m=arr.map(c=>{const h=c.hb||[0,0,0,0];return {c,cy:h[1]+h[3]/2,x:h[0],h:h[3]}}).sort((a,b)=>a.cy-b.cy),rows=[];
  m.forEach(o=>{const r=rows[rows.length-1];if(r&&o.cy-r.cy<Math.max(r.h,o.h)*.6)r.items.push(o);else rows.push({cy:o.cy,h:o.h,items:[o]})});
  return rows.flatMap(r=>r.items.sort((a,b)=>a.x-b.x).map(o=>o.c));
}
function buildSteps(info){
  const cv=hb=>hb&&info.hbFormat!=="xywh"?[hb[1]/10,hb[0]/10,hb[3]/10,hb[2]/10]:hb;   /* por defecto hb=[y,x,alto,ancho] en escala 0–1000; hbFormat:"xywh" → [x,y,ancho,alto] en % */
  const D=[{t:info.title||"Obra",b:info.intro||info.description||""},
    ...(info.frames||[]).map(f=>({t:f.title,b:f.text||"",hb:cv(f.hb),tags:f.tags,sort:f.sort,items:(f.children||[]).map(c=>({t:c.title,b:c.text||"",hb:cv(c.hb),tags:c.tags}))})),
    {end:true,t:"La obra completa",b:info.outro||""}];
  const out=[];let ti=0;
  D.forEach((s,i)=>{
    if(i&&!s.end)ti++;
    const items=s.sort===false?s.items||[]:readingOrder(s.items||[]),n=items.length,num=String(ti),pi=out.length;
    out.push({...s,items,top:pi,tag:n?num+".0":num,k:i===0?"Introducción":s.end?"Vista general":(n?"Área ":"Símbolo ")+num});
    items.forEach((c,j)=>out.push({...c,parent:s.t,top:pi,tag:num+"."+(j+1),k:`${s.t} · ${j+1}/${n}`}));
  });
  return out;
}
function subMenu(i){
  const st=S.steps,p=st[i].top,P=st[p];
  if(!P.items||!P.items.length)return "";
  const idx=[p,...P.items.map((_,j)=>p+1+j)];
  return `<div class="subs">${idx.map(k=>`<button class="chip${k===i?" on":""}" data-go="${k}">${k===p?"Vista del área":esc(st[k].t)}</button>`).join("")}</div>`;
}

/* ===== Visor ===== */
const V=$("#viewer"),track=$("#track"),stage=$(".stage"),wrap=$(".wrap"),frame=$("#frame"),zoom=$("#zoom"),art=$("#art"),
  sel=$("#sel"),tag=$("#tag"),cards=$("#cards"),hbs=$("#hbs"),hint=$("#hint"),prevB=$("#prev"),nextB=$("#next"),homeB=$("#home");
const STEP_VH=1.4,ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)},lerp=(a,b,t)=>a+(b-a)*t;
const mqP=matchMedia("(max-width:800px) and (orientation:portrait)");
let S=null;

function fit(){stage.style.removeProperty("--imgh");if(mqP.matches)stage.style.setProperty("--imgh",wrap.clientHeight+"px")}
function layout(){const h=V.clientHeight;V.style.setProperty("--vh",h+"px");if(S)track.style.height=(S.N*STEP_VH+1)*h+"px";fit()}

/* Ficha (año, medidas, estado) en la introducción y etiquetas en cada elemento */
function ficha(i){const r=[["Año",i.year],["Medidas",i.measures],["Estado actual",i.status],["Tipo",i.type]].filter(x=>x[1]);
  return r.length?`<dl class="ficha">${r.map(x=>`<div><dt>${x[0]}</dt><dd>${esc(x[1])}</dd></div>`).join("")}</dl>`:""}
function tagsHtml(s){return s.tags&&s.tags.length?`<div class="tags">${s.tags.map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}
function openViewer(e,fromUrl){
  const steps=buildSteps(e.info),N=steps.length-1;
  S={steps,N,e,free:false,playing:false,active:-1,jump:null,view:{fx:50,fy:50,s:1,op:0,r:[0,0,100,100]},
    TOPS:steps.map((s,i)=>i).filter(i=>!steps[i].parent),
    R:steps.map((s,i)=>{
      if(!i||s.end||!s.hb)return {x:50,y:50,z:1,end:!!s.end,r:[0,0,100,100]};
      const [hx,hy,hw,hh]=s.hb;   /* zoom calculado para que el encuadre completo quepa con margen */
      return {x:hx+hw/2,y:hy+hh/2,z:Math.max(1,Math.min(6,Math.min(100/hw,100/hh)*(s.fill||.7))),end:false,r:s.hb};
    })};
  cards.innerHTML="";hbs.innerHTML="";
  art.alt=e.info.description||e.info.title||e.base;art.src=imgSrc(e.f);
  document.body.style.overflow="hidden";V.hidden=false;V.scrollTop=0;
  V.classList.remove("free");V.style.overflowY="";playB.textContent="▶ Reproducir";
  if(!fromUrl){try{history.pushState({v:1},"","?obra="+encodeURIComponent(e.base))}catch(_){}}
  steps.forEach((s,i)=>{
    const d=document.createElement("div");d.className="card";
    d.innerHTML=`<div class="mono">${esc(s.k)}</div><h2>${esc(s.t)}</h2><p>${esc(s.b)}</p>`+subMenu(i)+(i===0?ficha(e.info):tagsHtml(s));
    d.querySelectorAll("[data-go]").forEach(bt=>bt.onclick=()=>goTo(+bt.dataset.go));
    cards.appendChild(d);
    if(i&&s.hb&&!s.parent&&!s.end){   /* áreas clicables al inicio */
      const h=document.createElement("button");h.className="hb";h.setAttribute("aria-label",s.t);
      h.style.cssText=`left:${s.hb[0]}%;top:${s.hb[1]}%;width:${s.hb[2]}%;height:${s.hb[3]}%`;
      h.innerHTML=`<span>${esc(s.t)}</span>`;h.onclick=()=>goTo(i);hbs.appendChild(h);
    }
  });
  layout();render();
}
function closeViewer(fromPop){
  stopPlay();ptr.clear();V.classList.remove("free");V.style.overflowY="";V.hidden=true;S=null;document.body.style.overflow="";
  if(!fromPop){try{if(history.state&&history.state.v)history.back();else history.replaceState(null,"",location.pathname)}catch(_){}}
}
function goTo(i,auto){
  if(!auto)stopPlay();if(S.free)setFree(false);   /* salto directo: el scroll se coloca de golpe y la cámara viaja sin pasar por los demás */
  S.jump={...S.view,t0:performance.now(),dur:900};
  V.scrollTo({top:i*STEP_VH*V.clientHeight+2,behavior:"instant"});render();
}
function render(){
  if(!S||V.hidden)return;
  if(S.free){applyFree();return}
  const {steps,R,N}=S,y=V.scrollTop,p=Math.max(0,Math.min(N,y/(V.clientHeight*STEP_VH)));
  const i=Math.min(Math.floor(p),N-1),f=p-i,t=ease((f-.3)/.4),a=R[i],b=R[i+1];
  let fx=lerp(a.x,b.x,t),fy=lerp(a.y,b.y,t),s=lerp(a.z,b.z,t);
  let op=i===0?Math.max(0,(t-.6)/.4):(b.end?Math.max(0,1-t*2.5):1);
  let r=a.r.map((v,k)=>lerp(v,b.r[k],t));
  const j=S.jump;
  if(j){const u=Math.min(1,(performance.now()-j.t0)/j.dur),e=ease(u);
    fx=lerp(j.fx,fx,e);fy=lerp(j.fy,fy,e);s=lerp(j.s,s,e);op=lerp(j.op,op,e);r=r.map((v,k)=>lerp(j.r[k],v,e));
    if(u<1)requestAnimationFrame(render);else S.jump=null}
  S.view={fx,fy,s,op,r};
  hbs.classList.toggle("on",p<.3&&!S.jump);
  const W=frame.clientWidth,H=frame.clientHeight;
  const tx=Math.max(W-W*s,Math.min(0,W/2-fx/100*W*s)),ty=Math.max(H-H*s,Math.min(0,H/2-fy/100*H*s));
  zoom.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;S.tf={s,x:tx,y:ty};
  sel.style.left=r[0]+"%";sel.style.top=r[1]+"%";sel.style.width=r[2]+"%";sel.style.height=r[3]+"%";
  sel.style.setProperty("--k",1/s);sel.style.opacity=op;
  const cur=Math.round(i+t);
  if(cur!==S.active){
    S.active=cur;[...cards.children].forEach((c,k)=>c.classList.toggle("on",k===cur));
    tag.textContent=steps[Math.max(cur,1)].tag;
    const tp=S.TOPS.indexOf(steps[cur].top);prevB.disabled=tp===0;homeB.disabled=cur===0;nextB.disabled=tp===S.TOPS.length-1;
  }
  hint.style.opacity=y>40?0:1;
}
/* ===== Reproducir: avanza solo entre padres e hijos; más texto = más tiempo en cada paso ===== */
const playB=$("#play"),shareB=$("#share"),pbar=$("#pbar");
function stopPlay(){if(!S||!S.playing)return;S.playing=false;clearTimeout(S.timer);playB.textContent="▶ Reproducir";pbar.style.transition="none";pbar.style.width="0"}
function playStep(){
  if(!S||!S.playing)return;
  const i=S.active;if(i>=S.N){stopPlay();return}
  const words=(S.steps[i].b||"").split(/\s+/).filter(Boolean).length,ms=1000+Math.min(8000,Math.max(2200,words*250));
  pbar.style.transition="none";pbar.style.width="0";void pbar.offsetWidth;pbar.style.transition="width "+ms+"ms linear";pbar.style.width="100%";   /* barra de progreso del paso */
  S.timer=setTimeout(()=>{if(!S||!S.playing)return;goTo(i+1,true);playStep()},ms);
}
playB.onclick=()=>{if(!S)return;if(S.playing){stopPlay();return}if(S.free)setFree(false);S.playing=true;playB.textContent="❚❚ Pausa";playStep()};
["wheel","touchstart","pointerdown"].forEach(t=>V.addEventListener(t,e=>{if(S&&S.playing&&!playB.contains(e.target))stopPlay()},{passive:true}));

/* ===== Zoom libre: se activa solo cuando el usuario intenta hacer zoom sobre la imagen =====
   (pellizco con dos dedos, Ctrl + rueda / pellizco del trackpad, doble clic o la tecla +).
   Si no hace nada de eso, el recorrido guiado sigue como siempre. */
const F={s:1,x:0,y:0},ptr=new Map(),exitB=$("#freeexit");
function applyFree(){
  const W=frame.clientWidth,H=frame.clientHeight;F.s=Math.max(1,Math.min(8,F.s));
  F.x=Math.max(W-W*F.s,Math.min(0,F.x));F.y=Math.max(H-H*F.s,Math.min(0,F.y));
  zoom.style.transform=`translate(${F.x}px,${F.y}px) scale(${F.s})`;
}
function zoomAt(cx,cy,k){
  const r=frame.getBoundingClientRect(),px=cx-r.left,py=cy-r.top,ns=Math.max(1,Math.min(8,F.s*k));
  F.x=px-(px-F.x)*ns/F.s;F.y=py-(py-F.y)*ns/F.s;F.s=ns;applyFree();
  if(k<1&&F.s<=1.001)setFree(false);   /* al alejar del todo, vuelve al recorrido guiado */
}
function setFree(on){
  if(!S||S.free===on)return;
  if(on){stopPlay();const t=S.tf||{s:1,x:0,y:0};F.s=t.s;F.x=t.x;F.y=t.y}   /* parte de la vista guiada actual */
  S.free=on;V.classList.toggle("free",on);V.style.overflowY=on?"hidden":"";
  if(on)applyFree();else render();
}
exitB.onclick=()=>setFree(false);
const mid=k=>{const r=frame.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,k)};
frame.addEventListener("wheel",e=>{
  if(!S)return;
  if(!S.free){if(!e.ctrlKey)return;setFree(true)}          /* la rueda sola sigue haciendo scroll del recorrido */
  e.preventDefault();zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*(e.ctrlKey?.006:.0015)));
},{passive:false});
frame.addEventListener("dblclick",e=>{if(!S||e.target.closest(".hb"))return;if(!S.free)setFree(true);zoomAt(e.clientX,e.clientY,2)});
frame.addEventListener("pointerdown",e=>{
  if(!S||(e.pointerType!=="touch"&&!S.free))return;
  ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptr.size===2&&!S.free)setFree(true);                   /* dos dedos = pellizco */
  if(S.free)frame.setPointerCapture(e.pointerId);
});
frame.addEventListener("pointermove",e=>{
  if(!S||!S.free||!ptr.has(e.pointerId))return;
  const p=ptr.get(e.pointerId),old=[...ptr.values()].map(q=>({x:q.x,y:q.y})),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptr.size===1){F.x+=dx;F.y+=dy;applyFree()}
  else if(ptr.size===2){const n=[...ptr.values()],d0=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y),d1=Math.hypot(n[0].x-n[1].x,n[0].y-n[1].y);if(d0)zoomAt((n[0].x+n[1].x)/2,(n[0].y+n[1].y)/2,d1/d0)}
});
["pointerup","pointercancel"].forEach(t=>frame.addEventListener(t,e=>ptr.delete(e.pointerId)));

/* ===== Compartir: enlace de la obra (con su propia vista previa si hay página generada) ===== */
shareB.onclick=()=>{
  if(!S)return;const e=S.e,url=location.origin+location.pathname+"?obra="+encodeURIComponent(e.base);
  if(navigator.share){navigator.share({title:e.info.title||e.base,text:e.info.description||"",url}).catch(()=>{});return}
  const ok=()=>{shareB.textContent="¡Enlace copiado!";setTimeout(()=>{shareB.textContent="Compartir"},1600)};
  (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(ok,()=>prompt("Copia el enlace:",url));
};
addEventListener("popstate",()=>{if(S)closeViewer(true)});

/* Anterior/Siguiente saltan solo entre padres; los hijos se eligen en el submenú */
const tpos=()=>S.TOPS.indexOf(S.steps[Math.max(0,S.active)].top);
prevB.onclick=()=>S&&goTo(S.TOPS[Math.max(0,tpos()-1)]);
nextB.onclick=()=>S&&goTo(S.TOPS[Math.min(S.TOPS.length-1,tpos()+1)]);
homeB.onclick=()=>S&&goTo(0);
$("#close").onclick=()=>closeViewer();
let tick=false;
V.addEventListener("scroll",()=>{if(!tick){tick=true;requestAnimationFrame(()=>{render();tick=false})}},{passive:true});
art.addEventListener("load",render);
const ro=new ResizeObserver(()=>{if(S){layout();render()}});ro.observe(V);ro.observe(wrap);
/* Teclado del visor: Esc cierra, flechas van entre elementos padre */
addEventListener("keydown",e=>{
  if(!S)return;
  if(e.key==="Escape"){if(S.free)setFree(false);else closeViewer()}else if(e.key==="ArrowRight")nextB.click();else if(e.key==="ArrowLeft")prevB.click();else if(e.key==="+"||e.key==="="){if(!S.free)setFree(true);mid(1.4)}else if(S.free&&e.key==="-")mid(1/1.4);
});
App.openViewer=openViewer;App.viewerOpen=()=>!!S;
})();

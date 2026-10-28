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
    ...(info.frames||[]).map(f=>({t:f.title,b:f.text||"",hb:cv(f.hb),sort:f.sort,items:(f.children||[]).map(c=>({t:c.title,b:c.text||"",hb:cv(c.hb)}))})),
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

function openViewer(e){
  const steps=buildSteps(e.info),N=steps.length-1;
  S={steps,N,active:-1,jump:null,view:{fx:50,fy:50,s:1,op:0,r:[0,0,100,100]},
    TOPS:steps.map((s,i)=>i).filter(i=>!steps[i].parent),
    R:steps.map((s,i)=>{
      if(!i||s.end||!s.hb)return {x:50,y:50,z:1,end:!!s.end,r:[0,0,100,100]};
      const [hx,hy,hw,hh]=s.hb;   /* zoom calculado para que el encuadre completo quepa con margen */
      return {x:hx+hw/2,y:hy+hh/2,z:Math.max(1,Math.min(6,Math.min(100/hw,100/hh)*(s.fill||.7))),end:false,r:s.hb};
    })};
  cards.innerHTML="";hbs.innerHTML="";
  art.alt=e.info.title||e.base;art.src=imgSrc(e.f);
  document.body.style.overflow="hidden";V.hidden=false;V.scrollTop=0;
  steps.forEach((s,i)=>{
    const d=document.createElement("div");d.className="card";
    d.innerHTML=`<div class="mono">${esc(s.k)}</div><h2>${esc(s.t)}</h2><p>${esc(s.b)}</p>`+subMenu(i);
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
function closeViewer(){V.hidden=true;S=null;document.body.style.overflow=""}
function goTo(i){   /* salto directo: el scroll se coloca de golpe y la cámara viaja sin pasar por los demás */
  S.jump={...S.view,t0:performance.now(),dur:900};
  V.scrollTo({top:i*STEP_VH*V.clientHeight+2,behavior:"instant"});render();
}
function render(){
  if(!S||V.hidden)return;
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
  zoom.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;
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
/* Anterior/Siguiente saltan solo entre padres; los hijos se eligen en el submenú */
const tpos=()=>S.TOPS.indexOf(S.steps[Math.max(0,S.active)].top);
prevB.onclick=()=>S&&goTo(S.TOPS[Math.max(0,tpos()-1)]);
nextB.onclick=()=>S&&goTo(S.TOPS[Math.min(S.TOPS.length-1,tpos()+1)]);
homeB.onclick=()=>S&&goTo(0);
$("#close").onclick=closeViewer;
let tick=false;
V.addEventListener("scroll",()=>{if(!tick){tick=true;requestAnimationFrame(()=>{render();tick=false})}},{passive:true});
art.addEventListener("load",render);
const ro=new ResizeObserver(()=>{if(S){layout();render()}});ro.observe(V);ro.observe(wrap);
/* Teclado del visor: Esc cierra, flechas van entre elementos padre */
addEventListener("keydown",e=>{
  if(!S)return;
  if(e.key==="Escape")closeViewer();else if(e.key==="ArrowRight")nextB.click();else if(e.key==="ArrowLeft")prevB.click();
});
App.openViewer=openViewer;App.viewerOpen=()=>!!S;
})();

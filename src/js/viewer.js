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
let S=null,frameW=800,frameH=600;

function fit(){stage.style.removeProperty("--imgh");if(mqP.matches)stage.style.setProperty("--imgh",wrap.clientHeight+"px")}
function layout(){
  const h=V.clientHeight;
  V.style.setProperty("--vh",h+"px");
  if(S)track.style.height=(S.N*STEP_VH+1)*h+"px";
  fit();
  /* Cachea dimensiones para evitar forzar reflow (layout thrashing) en cada fotograma */
  frameW=frame.clientWidth||800;
  frameH=frame.clientHeight||600;
}

/* Ficha (año, medidas, estado) en la introducción y etiquetas en cada elemento */
function ficha(i){const r=[["Año",i.year],["Medidas",i.measures],["Estado actual",i.status],["Tipo",i.type]].filter(x=>x[1]);
  return r.length?`<dl class="ficha">${r.map(x=>`<div><dt>${x[0]}</dt><dd>${esc(x[1])}</dd></div>`).join("")}</dl>`:""}
function tagsHtml(s){return s.tags&&s.tags.length?`<div class="tags">${s.tags.map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}
function openViewer(e,fromUrl,from,sourceEl){
  const steps=buildSteps(e.info),N=steps.length-1;
  S={steps,N,e,sourceEl:sourceEl||null,free:false,playing:false,active:-1,activeCard:null,jump:null,view:{fx:50,fy:50,s:1,op:0,r:[0,0,100,100]},
    TOPS:steps.map((s,i)=>i).filter(i=>!steps[i].parent),
    R:steps.map((s,i)=>{
      if(!i||s.end||!s.hb)return {x:50,y:50,z:1,end:!!s.end,r:[0,0,100,100]};
      const [hx,hy,hw,hh]=s.hb;   /* zoom calculado para que el encuadre completo quepa con margen */
      return {x:hx+hw/2,y:hy+hh/2,z:Math.max(1,Math.min(6,Math.min(100/hw,100/hh)*(s.fill||.7))),end:false,r:s.hb};
    })};
  cards.replaceChildren();hbs.replaceChildren();

  const hasSvg=Boolean(e.thumb&&/\.svg$/i.test(e.thumb));
  const activeFmt=e.activeFmt||(hasSvg?"svg":"orig");
  e.activeFmt=activeFmt;
  const currentSrc=(activeFmt==="svg"&&hasSvg)?App.thumbSrc(e.thumb):App.imgSrc(e.f,e);

  art.alt=e.info.description||e.info.title||e.base;
  art.src=currentSrc;

  // Selector de formato (Foto vs SVG) en la barra superior del visor
  const vfmt=$("#vfmt"),btnOrig=$("#btn-orig"),btnSvg=$("#btn-svg");
  if(vfmt){
    vfmt.hidden=!hasSvg;
    if(hasSvg){
      const syncVfmt=fmt=>{
        if(btnOrig)btnOrig.classList.toggle("on",fmt==="orig");
        if(btnSvg)btnSvg.classList.toggle("on",fmt==="svg");
      };
      syncVfmt(activeFmt);
      if(btnOrig)btnOrig.onclick=()=>{
        if(e.activeFmt==="orig")return;
        e.activeFmt="orig";
        art.src=App.imgSrc(e.f,e);
        syncVfmt("orig");
        App.toast("Mostrando fotografía original");
        if(App.gallery&&App.gallery.syncFmt)App.gallery.syncFmt(e.base,"orig");
      };
      if(btnSvg)btnSvg.onclick=()=>{
        if(e.activeFmt==="svg")return;
        e.activeFmt="svg";
        art.src=App.thumbSrc(e.thumb);
        syncVfmt("svg");
        App.toast("Mostrando versión vectorial SVG");
        if(App.gallery&&App.gallery.syncFmt)App.gallery.syncFmt(e.base,"svg");
      };
      const btnDlSvg=$("#btn-dl-svg");
      if(btnDlSvg){
        btnDlSvg.onclick=()=>{
          if(!e.thumb)return;
          const a=document.createElement("a");
          a.href=App.thumbSrc(e.thumb);
          a.download=e.thumb;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          App.toast("Descargando archivo SVG limpio");
        };
      }
    }
  }

  const thumbImg=(sourceEl||document.querySelector(`button.tile[data-base="${e.base}"]`))?.querySelector("img");
  const useViewTransition=Boolean(document.startViewTransition&&!matchMedia("(prefers-reduced-motion:reduce)").matches);

  const performOpen=()=>{
    const appHeader=document.getElementById("app-header"),appMain=document.getElementById("app-main");
    if(appHeader)appHeader.setAttribute("inert","");
    if(appMain)appMain.setAttribute("inert","");

    document.body.style.overflow="hidden";V.hidden=false;V.scrollTop=0;
    clearTimeout(V._t);V.classList.remove("leave","enter");   /* entrada: zoom ligero + desenfoque en los lados */
    if(from){V.style.setProperty("--ox",from.x+"px");V.style.setProperty("--oy",from.y+"px")}else{V.style.removeProperty("--ox");V.style.removeProperty("--oy")}
    void V.offsetWidth;V.classList.add("enter");V._t=setTimeout(()=>V.classList.remove("enter"),1100);
    if(App.autoplay.get())setTimeout(()=>{if(S&&S.e===e&&!S.playing&&!S.free)startPlay()},1000);   /* autoplay global */
    V.classList.remove("free");V.style.overflowY="";playB.textContent="Reproducir";

    const stepParam=new URLSearchParams(location.search).get("paso");
    const initStep=stepParam?parseInt(stepParam,10):0;
    if(!fromUrl){
      try{history.pushState({v:1,step:initStep},"","?obra="+encodeURIComponent(e.base)+(initStep>0?"&paso="+initStep:""))}catch(_){}
    }
    
    const fragCards=document.createDocumentFragment(),fragHbs=document.createDocumentFragment();
    steps.forEach((s,i)=>{
      const d=document.createElement("div");d.className="card";
      d.innerHTML=`<div class="mono">${esc(s.k)}</div><h2>${esc(s.t)}</h2><p>${esc(s.b)}</p>`+subMenu(i)+(i===0?ficha(e.info):tagsHtml(s));
      d.querySelectorAll("[data-go]").forEach(bt=>bt.onclick=()=>goTo(+bt.dataset.go));
      fragCards.appendChild(d);
      if(i&&s.hb&&!s.parent&&!s.end){   /* áreas clicables al inicio */
        const h=document.createElement("button");h.className="hb";h.setAttribute("aria-label",s.t);
        h.style.cssText=`left:${s.hb[0]}%;top:${s.hb[1]}%;width:${s.hb[2]}%;height:${s.hb[3]}%`;
        h.innerHTML=`<span>${esc(s.t)}</span>`;h.onclick=()=>goTo(i);fragHbs.appendChild(h);
      }
    });
    cards.appendChild(fragCards);hbs.appendChild(fragHbs);
    layout();render();
    if(initStep>0&&initStep<steps.length)goTo(initStep,true);
  };

  if(useViewTransition&&thumbImg){
    thumbImg.style.viewTransitionName="active-artwork";
    art.style.viewTransitionName="active-artwork";
    const transition=document.startViewTransition(()=>{
      performOpen();
    });
    transition.finished.finally(()=>{
      thumbImg.style.viewTransitionName="";
      art.style.viewTransitionName="";
      const closeB=$("#close");
      if(closeB)closeB.focus();
    });
  }else{
    performOpen();
    const closeB=$("#close");
    if(closeB)closeB.focus();
  }
}
function closeViewer(fromPop){
  if(S&&S.autoplayBeforeFree)App.autoplay.set(true,true);
  stopPlay(false);ptr.clear();V.classList.remove("free");V.style.overflowY="";

  const activeEntry=S?S.e:null;
  const targetTile=S?.sourceEl||(activeEntry?document.querySelector(`button.tile[data-base="${activeEntry.base}"]`):null);
  const thumbImg=targetTile?.querySelector("img");
  const useViewTransition=Boolean(document.startViewTransition&&!matchMedia("(prefers-reduced-motion:reduce)").matches);

  const performClose=()=>{
    const appHeader=document.getElementById("app-header"),appMain=document.getElementById("app-main");
    if(appHeader)appHeader.removeAttribute("inert");
    if(appMain)appMain.removeAttribute("inert");

    S=null;document.body.style.overflow="";
    clearTimeout(V._t);V.classList.remove("enter");V.classList.add("leave");
    V._t=setTimeout(()=>{V.hidden=true;V.classList.remove("leave")},320);   /* salida suave */
  };

  if(useViewTransition&&thumbImg){
    art.style.viewTransitionName="active-artwork";
    thumbImg.style.viewTransitionName="active-artwork";
    const transition=document.startViewTransition(()=>{
      performClose();
    });
    transition.finished.finally(()=>{
      art.style.viewTransitionName="";
      thumbImg.style.viewTransitionName="";
      if(targetTile)targetTile.focus();
    });
  }else{
    performClose();
    if(targetTile)targetTile.focus();
  }

  if(!fromPop){try{if(history.state&&history.state.v)history.back();else history.replaceState(null,"",location.pathname)}catch(_){}}
}
function goTo(i,auto){
  if(!auto)stopPlay();if(S.free)setFree(false,true);   /* salto directo: el scroll se coloca de golpe y la cámara viaja sin pasar por los demás */
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
  const W=frameW,H=frameH;   /* utiliza dimensiones cacheadas en layout() */
  const tx=Math.max(W-W*s,Math.min(0,W/2-fx/100*W*s)),ty=Math.max(H-H*s,Math.min(0,H/2-fy/100*H*s));
  zoom.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;S.tf={s,x:tx,y:ty};
  sel.style.left=r[0]+"%";sel.style.top=r[1]+"%";sel.style.width=r[2]+"%";sel.style.height=r[3]+"%";
  sel.style.setProperty("--k",1/s);sel.style.opacity=op;
  const cur=Math.round(i+t);
  if(cur!==S.active){
    if(S.activeCard)S.activeCard.classList.remove("on");
    S.active=cur;
    const nc=cards.children[cur];
    if(nc){nc.classList.add("on");S.activeCard=nc}
    tag.textContent=steps[Math.max(cur,1)].tag;
    const tp=S.TOPS.indexOf(steps[cur].top);prevB.disabled=tp===0;homeB.disabled=cur===0;nextB.disabled=tp===S.TOPS.length-1;
    // Anuncio accesible por lector de pantalla
    const announcer=$("#v-announcer");
    if(announcer&&steps[cur]){
      const s=steps[cur];
      announcer.textContent=`Paso ${cur+1} de ${steps.length}: ${s.t||""}. ${s.b||""}`;
    }
    try{
      const q="?obra="+encodeURIComponent(S.e.base)+(cur>0?"&paso="+cur:"");
      if(location.search!==q)history.replaceState({v:1,step:cur},"",q);
    }catch(_){}
  }
  hint.style.opacity=y>40?0:1;
}
/* ===== Reproducir: avanza solo entre padres e hijos; más texto = más tiempo en cada paso ===== */
const playB=$("#play"),shareB=$("#share"),pbar=$("#pbar"),autopB=$("#autotop");
function stopPlay(msg){   /* msg: texto del aviso; false = sin aviso */
  if(!S||!S.playing)return;
  S.playing=false;clearTimeout(S.timer);playB.textContent="Reproducir";
  pbar.style.transition="opacity .4s";pbar.style.opacity="0";clearTimeout(pbar._t);   /* la barra se desvanece */
  pbar._t=setTimeout(()=>{pbar.style.transition="none";pbar.style.width="0";pbar.style.opacity="1"},450);
  if(msg!==false)App.toast(msg||"Reproductor en pausa");
}
function startPlay(){
  if(!S||S.playing)return;if(S.free)setFree(false);
  S.playing=true;playB.textContent="Pausa";App.toast("Reproductor activo");playStep();
}
function playStep(){
  if(!S||!S.playing)return;
  const i=S.active;if(i>=S.N){stopPlay("Fin del recorrido");return}
  const words=(S.steps[i].b||"").split(/\s+/).filter(Boolean).length,ms=1000+Math.min(8000,Math.max(2200,words*250));
  clearTimeout(pbar._t);pbar.style.opacity="1";
  pbar.style.transition="none";pbar.style.width="0";void pbar.offsetWidth;pbar.style.transition="width "+ms+"ms linear";pbar.style.width="100%";   /* barra de progreso del paso */
  S.timer=setTimeout(()=>{if(!S||!S.playing)return;goTo(i+1,true);playStep()},ms);
}
playB.onclick=()=>{if(!S)return;S.playing?stopPlay():startPlay()};
["wheel","touchstart","pointerdown"].forEach(t=>V.addEventListener(t,e=>{if(S&&S.playing&&!playB.contains(e.target))stopPlay()},{passive:true}));
/* Autoplay global (se activa en el encabezado o aquí) */
const syncAutop=()=>{const on=App.autoplay.get();autopB.classList.toggle("on",on);autopB.setAttribute("aria-pressed",on)};
autopB.onclick=()=>{
  const on=!App.autoplay.get();App.autoplay.set(on,true);
  if(!S)return;
  if(on){if(S.active>=S.N)goTo(0,true);startPlay()}   /* al activarlo, reproduce este elemento de una vez */
  else if(S.playing)stopPlay("Autoplay desactivado");else App.toast("Autoplay desactivado");
};
App.autoplay.sub(syncAutop);syncAutop();

/* ===== Zoom libre: se activa solo cuando el usuario intenta hacer zoom sobre la imagen =====
   (pellizco con dos dedos, Ctrl + rueda / pellizco del trackpad, doble clic o la tecla +).
   Si no hace nada de eso, el recorrido guiado sigue como siempre. */
const F={s:1,x:0,y:0},ptr=new Map(),exitB=$("#freeexit");
function applyFree(){
  const W=frameW,H=frameH;F.s=Math.max(1,Math.min(8,F.s));
  F.x=Math.max(W-W*F.s,Math.min(0,F.x));F.y=Math.max(H-H*F.s,Math.min(0,F.y));
  zoom.style.transform=`translate(${F.x}px,${F.y}px) scale(${F.s})`;
}
function zoomAt(cx,cy,k){
  const r=frame.getBoundingClientRect(),px=cx-r.left,py=cy-r.top,ns=Math.max(1,Math.min(8,F.s*k));
  F.x=px-(px-F.x)*ns/F.s;F.y=py-(py-F.y)*ns/F.s;F.s=ns;applyFree();
  if(k<1&&F.s<=1.001)setFree(false);   /* al alejar del todo, vuelve al recorrido guiado */
}
function setFree(on,instant){
  if(!S||S.free===on)return;
  if(on){
    // Al entrar a zoom libre: recordar si el autoplay estaba activo y apagarlo directamente ("como nuevo")
    S.autoplayBeforeFree=App.autoplay.get()||S.playing;
    if(S.playing)stopPlay(false);
    if(App.autoplay.get())App.autoplay.set(false,true);

    const t=S.tf||{s:1,x:0,y:0};F.s=t.s;F.x=t.x;F.y=t.y;
    ptr.forEach((_,id)=>{try{frame.setPointerCapture(id)}catch(_){}});
  }
  S.free=on;V.classList.toggle("free",on);V.style.overflowY=on?"hidden":"";
  if(on){applyFree();return}
  if(instant){   /* lo usa goTo: el salto parte desde donde está la vista libre */
    const W=frameW,H=frameH;S.view={...S.view,fx:(W/2-F.x)/(W*F.s)*100,fy:(H/2-F.y)/(H*F.s)*100,s:F.s,op:0};
    if(S.autoplayBeforeFree){
      S.autoplayBeforeFree=false;
      App.autoplay.set(true,true);
    }
    return;
  }
  // Al regresar al zoom normal: reestablecer el autoplay en caso de haber estado activo antes
  if(S.autoplayBeforeFree){
    S.autoplayBeforeFree=false;
    App.autoplay.set(true,true);
    startPlay();
  }
  zoom.style.transition="transform .75s cubic-bezier(.2,.75,.2,1)";sel.style.transition="opacity .6s ease .15s,box-shadow .6s";   /* vuelta suave al recorrido guiado */
  render();clearTimeout(S.ft);S.ft=setTimeout(()=>{zoom.style.transition="";sel.style.transition=""},950);
}
exitB.onclick=()=>setFree(false);
const mid=k=>{const r=frame.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,k)};
frame.addEventListener("wheel",e=>{
  if(!S)return;
  if(!S.free){if(!e.ctrlKey)return;setFree(true)}          /* la rueda sola sigue haciendo scroll del recorrido */
  e.preventDefault();zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*(e.ctrlKey?.006:.0015)));
},{passive:false});
frame.addEventListener("dblclick",e=>{if(!S||e.target.closest(".hb"))return;if(!S.free)setFree(true);zoomAt(e.clientX,e.clientY,2)});

let lastTap=0,tapPos={x:0,y:0},touchStart=null;
frame.addEventListener("pointerdown",e=>{
  if(!S||(e.pointerType!=="touch"&&!S.free))return;
  ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(e.pointerType==="touch"&&ptr.size===1&&!S.free){
    touchStart={x:e.clientX,y:e.clientY,t:Date.now()};
  }
  if(ptr.size===2&&!S.free)setFree(true);                   /* dos dedos = pellizco */
  if(S.free){try{frame.setPointerCapture(e.pointerId)}catch(_){}}
});
frame.addEventListener("pointermove",e=>{
  if(!S||!S.free||!ptr.has(e.pointerId))return;
  const p=ptr.get(e.pointerId),old=[...ptr.values()].map(q=>({x:q.x,y:q.y})),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptr.size===1){F.x+=dx;F.y+=dy;applyFree()}
  else if(ptr.size===2){
    const n=[...ptr.values()],d0=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y),d1=Math.hypot(n[0].x-n[1].x,n[0].y-n[1].y);
    if(d0>0&&d1>0){
      zoomAt((n[0].x+n[1].x)/2,(n[0].y+n[1].y)/2,d1/d0);
      F.x+=dx/2;F.y+=dy/2;applyFree();
    }
  }
});
["pointerup","pointercancel"].forEach(t=>frame.addEventListener(t,e=>{
  if(e.pointerType==="touch"&&ptr.has(e.pointerId)){
    const now=Date.now(),dist=Math.hypot(e.clientX-tapPos.x,e.clientY-tapPos.y);
    if(now-lastTap<320&&dist<35){
      // Doble toque táctil
      if(!S.free){setFree(true);zoomAt(e.clientX,e.clientY,2)}
      else{if(F.s>1.1)setFree(false);else zoomAt(e.clientX,e.clientY,2)}
      lastTap=0;
      touchStart=null;
    }else{
      // Gesto Swipe horizontal para navegación táctil natural (Modern Web Guidance: natural-interactions)
      if(!S.free&&touchStart){
        const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y,dt=now-touchStart.t;
        if(dt<500&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){
          if(dx<0){
            if(nextB)nextB.click();
          }else{
            if(prevB)prevB.click();
          }
          touchStart=null;
          ptr.delete(e.pointerId);
          return;
        }
      }
      lastTap=now;tapPos={x:e.clientX,y:e.clientY};
    }
  }
  touchStart=null;
  ptr.delete(e.pointerId);
}));

/* ===== Copiar enlace directo al portapapeles de inmediato ===== */
function copyFallback(text,cb){
  try{
    const ta=document.createElement("textarea");
    ta.value=text;ta.style.position="fixed";ta.style.opacity="0";ta.style.pointerEvents="none";
    document.body.appendChild(ta);ta.focus();ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    if(cb)cb();
  }catch(_){
    prompt("Copia el enlace:",text);
  }
}
function copyLinkToClipboard(){
  if(!S)return;
  const e=S.e,step=S.active>0?"&paso="+S.active:"";
  const url=location.origin+location.pathname+"?obra="+encodeURIComponent(e.base)+step;
  const onDone=()=>{
    shareB.textContent="¡Copiado!";
    App.toast("Enlace copiado al portapapeles");
    setTimeout(()=>{shareB.textContent="Copiar enlace";},1800);
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(onDone).catch(()=>copyFallback(url,onDone));
  }else{
    copyFallback(url,onDone);
  }
}
shareB.onclick=copyLinkToClipboard;

/* ===== Captura de pantalla de la obra (como la tenga el usuario) ===== */
function captureScreenshot(){
  if(!S)return;
  const dpr=Math.max(1,window.devicePixelRatio||1);
  const W=frameW||frame.clientWidth||800;
  const H=frameH||frame.clientHeight||600;
  const canvas=document.createElement("canvas");
  canvas.width=W*dpr;
  canvas.height=H*dpr;
  const ctx=canvas.getContext("2d");
  if(!ctx)return;

  // Fondo oscuro de lienzo
  ctx.fillStyle="#1c1b1a";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Transformación actual (zoom libre o encuadre de paso guiado)
  const tf=S.free?{s:F.s,x:F.x,y:F.y}:(S.tf||{s:1,x:0,y:0});

  ctx.save();
  ctx.scale(dpr,dpr);
  ctx.translate(tf.x,tf.y);
  ctx.scale(tf.s,tf.s);

  // Dibujar imagen actual
  try{
    ctx.drawImage(art,0,0,art.naturalWidth||art.width,art.naturalHeight||art.height,0,0,art.width,art.height);
  }catch(_){}

  // Si no está en zoom libre y hay un paso activo con selección visible, dibujar recuadro
  if(!S.free&&S.view&&S.view.op>.1&&S.view.r){
    const r=S.view.r;
    const rx=(r[0]/100)*art.width;
    const ry=(r[1]/100)*art.height;
    const rw=(r[2]/100)*art.width;
    const rh=(r[3]/100)*art.height;

    // Recuadro tenue de selección
    ctx.strokeStyle="rgba(255,255,255,0.75)";
    ctx.lineWidth=1.5/tf.s;
    ctx.strokeRect(rx,ry,rw,rh);

    // Esquinas de encuadre
    const cLen=12/tf.s;
    ctx.strokeStyle="#ffffff";
    ctx.lineWidth=2.5/tf.s;
    ctx.beginPath();ctx.moveTo(rx,ry+cLen);ctx.lineTo(rx,ry);ctx.lineTo(rx+cLen,ry);ctx.stroke();
    ctx.beginPath();ctx.moveTo(rx+rw-cLen,ry);ctx.lineTo(rx+rw,ry);ctx.lineTo(rx+rw,ry+cLen);ctx.stroke();
    ctx.beginPath();ctx.moveTo(rx,ry+rh-cLen);ctx.lineTo(rx,ry+rh);ctx.lineTo(rx+cLen,ry+rh);ctx.stroke();
    ctx.beginPath();ctx.moveTo(rx+rw-cLen,ry+rh);ctx.lineTo(rx+rw,ry+rh);ctx.lineTo(rx+rw,ry+rh-cLen);ctx.stroke();
  }
  ctx.restore();

  // Cartela cultural discreta en la parte inferior
  ctx.save();
  ctx.scale(dpr,dpr);
  const pad=16;
  const title=S.e.info.title||S.e.base;
  const year=S.e.info.year?` · ${S.e.info.year}`:"";
  const stepLabel=(!S.free&&S.active>0&&S.steps[S.active])?` | ${S.steps[S.active].t||""}`:"";
  const label=`Fototeca Gris y Negro · ${title}${year}${stepLabel}`;

  ctx.font='11px "Space Mono", ui-monospace, monospace';
  const textMetrics=ctx.measureText(label);
  const pillW=Math.min(W-pad*2,textMetrics.width+24);
  const pillH=26;
  const pillX=pad;
  const pillY=H-pad-pillH;

  ctx.fillStyle="rgba(10,8,6,0.82)";
  ctx.strokeStyle="rgba(255,255,255,0.22)";
  ctx.lineWidth=1;
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(pillX,pillY,pillW,pillH,3);else ctx.rect(pillX,pillY,pillW,pillH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle="#e5322d";
  ctx.beginPath();
  ctx.arc(pillX+10,pillY+pillH/2,3,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#f1ece2";
  ctx.textBaseline="middle";
  ctx.fillText(label,pillX+20,pillY+pillH/2,pillW-28);
  ctx.restore();

  canvas.toBlob(blob=>{
    if(!blob)return;
    const a=document.createElement("a");
    const stepSuffix=(!S.free&&S.active>0)?`-paso${S.active}`:"";
    a.download=`${S.e.base}${stepSuffix}-captura.png`;
    a.href=URL.createObjectURL(blob);
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    App.toast("Captura de pantalla guardada");
  },"image/png");
}

const exportB=$("#export-ficha");
if(exportB){
  exportB.onclick=captureScreenshot;
}

/* Generador de Cita Académica Cultural */
const citeB=$("#btn-cite");
if(citeB){
  citeB.onclick=()=>{
    if(!S)return;
    if(App.openCite)App.openCite(S.e,S.active);
  };
}

/* Descargar Ficha de Catalogación en JSON */
const dlJsonB=$("#btn-dl-json");
if(dlJsonB){
  dlJsonB.onclick=()=>{
    if(!S)return;
    const e=S.e,info=e.info||{};
    const catalogData={
      "@context":"https://schema.org",
      "@type":"VisualArtwork",
      "name":info.title||e.base,
      "artMedium":info.type||"Fotografía / Manta / Mural",
      "dateCreated":info.year||null,
      "description":info.description||"",
      "creator":{"@type":"Organization","name":"Colectivo Gris y Negro"},
      "archivalSource":{
        "collection":"Fototeca Gris y Negro",
        "canonicalId":e.base,
        "url":`${location.origin}${location.pathname}?obra=${encodeURIComponent(e.base)}`,
        "variants":e.variants||{},
        "vectorThumb":e.thumb||null
      },
      "iconographicSteps":(info.frames||[]).map((f,idx)=>({
        "step":idx+1,
        "title":f.title||"",
        "description":f.text||"",
        "tags":f.tags||[],
        "subDetails":(f.children||[]).map(c=>({"title":c.title||"","description":c.text||"","tags":c.tags||[]}))
      })),
      "license":"https://creativecommons.org/licenses/by-nc-sa/4.0/",
      "exportedAt":new Date().toISOString()
    };
    const blob=new Blob([JSON.stringify(catalogData,null,2)],{type:"application/json;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`${e.base}-catalogacion.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    App.toast("Ficha JSON de catalogación descargada");
  };
}
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
/* Teclado del visor: Esc cierra, flechas navegan, Espacio reproduce/pausa, F activa zoom libre, V conmuta SVG/Foto y Tab confina el foco */
addEventListener("keydown",e=>{
  if(!S)return;
  if(e.key==="Escape"){
    if(S.free)setFree(false);
    else closeViewer();
  }else if(e.key==="ArrowRight"){
    nextB.click();
  }else if(e.key==="ArrowLeft"){
    prevB.click();
  }else if(e.key==="Home"){
    e.preventDefault();
    goTo(0);
  }else if((e.code==="KeyS"||e.key==="s"||e.key==="S")&&!e.ctrlKey&&!e.metaKey){
    if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName))return;
    e.preventDefault();
    shareB.click();
  }else if((e.key==="?"||(e.shiftKey&&e.key==="/"))&&!/INPUT|TEXTAREA/.test(document.activeElement?.tagName)){
    e.preventDefault();
    if(App.openShortcuts)App.openShortcuts();
  }else if(e.code==="Space"||e.key===" "){
    if(document.activeElement?.tagName==="BUTTON"&&document.activeElement!==playB)return;
    e.preventDefault();
    playB.click();
  }else if(e.code==="KeyF"||e.key==="f"||e.key==="F"){
    if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName))return;
    e.preventDefault();
    setFree(!S.free);
    App.toast(S.free?"Zoom libre activado":"Recorrido guiado");
  }else if((e.code==="KeyV"||e.key==="v"||e.key==="V")&&vfmt&&!vfmt.hidden){
    if(/INPUT|TEXTAREA/.test(document.activeElement?.tagName))return;
    e.preventDefault();
    const nextFmt=S.e.activeFmt==="orig"?"svg":"orig";
    if(nextFmt==="orig"&&btnOrig)btnOrig.click();
    else if(nextFmt==="svg"&&btnSvg)btnSvg.click();
  }else if(e.key==="+"||e.key==="="){
    if(!S.free)setFree(true);
    mid(1.4);
  }else if(S.free&&e.key==="-"){
    mid(1/1.4);
  }else if(e.key==="Tab"){
    /* Confinamiento de foco (Focus Trap) dentro del visor */
    const focusables=Array.from(V.querySelectorAll('button:not([disabled]):not([hidden]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el=>el.offsetParent!==null||getComputedStyle(el).display!=="none");
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(e.shiftKey){
      if(document.activeElement===first||!V.contains(document.activeElement)){
        e.preventDefault();
        last.focus();
      }
    }else{
      if(document.activeElement===last||!V.contains(document.activeElement)){
        e.preventDefault();
        first.focus();
      }
    }
  }
});
App.openViewer=openViewer;App.viewerOpen=()=>!!S;
})();

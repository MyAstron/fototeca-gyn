(function(){
const $=s=>document.querySelector(s),esc=App.esc,imgSrc=App.imgSrc;
/* ===== Sitio: encabezado fijo + secciones al final (src/site.json) ===== */
function renderSite(s){
  const brand=$("#brand");
  if(brand)brand.textContent=s.title||"Fototeca";
  /* Sección "Sobre la obra" comentada para rellenar más tarde */
  const sec=(s.sections||[]).filter(x=>x.id!=="sobre");
  const nav=$("#nav");
  if(nav)nav.innerHTML=sec.map(x=>`<a href="#${esc(x.id)}">${esc(x.title)}</a>`).join("")+(s.instagram?`<a href="#contacto">Contacto</a>`:"");
  const ig=s.instagram?`<a class="ig" href="https://instagram.com/${esc(s.instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".7" fill="currentColor" stroke="none"/></svg><span class="mono">${esc(s.instagram)}</span></a>`:"";
  const info=$("#info");
  if(info)info.innerHTML=sec.map(x=>`<section class="sec" id="${esc(x.id)}"><div class="mono">${esc(x.title)}</div><p>${esc(x.text)}</p></section>`).join("")+`<footer class="foot" id="contacto"><span class="mono">© ${esc(s.year||new Date().getFullYear())}</span>${ig}</footer>`;
  startTyping(s.phrases||[]);
}
/* Frases que se "escriben" solas, se borran y pasan a la siguiente (pausa si la pestaña se oculta en móviles) */
function startTyping(list){
  const ph=list.map(p=>typeof p==="string"?{text:p}:p).filter(p=>p&&p.text);
  if(!ph.length)return;
  const live=$("#live"),ghost=$("#ghost");
  if(!live||!ghost)return;
  ghost.textContent=ph.reduce((a,p)=>p.text.length>a.length?p.text:a,"");   /* reserva el alto de la frase más larga */
  let i=0;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches){
    const show=()=>{live.textContent=ph[i].text;setTimeout(()=>{i=(i+1)%ph.length;show()},ph[i].hold||3500)};show();return;
  }
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  (async()=>{for(;;){
    if(document.hidden){
      await new Promise(r=>{
        const h=()=>{if(!document.hidden){document.removeEventListener("visibilitychange",h);r()}};
        document.addEventListener("visibilitychange",h);
      });
    }
    const p=ph[i],c=Array.from(p.text);
    for(let k=1;k<=c.length;k++){
      if(document.hidden)break;
      live.textContent=c.slice(0,k).join("");
      await sleep(55+Math.random()*80+(",.".includes(c[k-1])?220:0));
    }
    await sleep(p.hold||2300);
    for(let k=c.length-1;k>=0;k--){
      if(document.hidden)break;
      live.textContent=c.slice(0,k).join("");
      await sleep(18);
    }
    await sleep(350);i=(i+1)%ph.length;
  }})();
}

/* Tema claro/oscuro (Alt + M) y atajo "/" para buscar */
function initSite(){
  const root=document.documentElement;
  function syncColorScheme(val){
    const meta=document.querySelector('meta[name="color-scheme"]');
    if(meta)meta.content=val;
  }
  function toggleTheme(){
    const dark=root.dataset.theme?root.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;
    const next=dark?"light":"dark";
    root.dataset.theme=next;
    syncColorScheme(next);
    try{localStorage.setItem("theme",next)}catch(e){}
  }
  try{
    const t=localStorage.getItem("theme");
    if(t){
      root.dataset.theme=t;
      syncColorScheme(t);
    }
  }catch(e){}
  window.addEventListener("storage",e=>{
    if(e.key==="theme"&&e.newValue){
      root.dataset.theme=e.newValue;
      syncColorScheme(e.newValue);
    }
  });
  const themeB=$("#theme");
  if(themeB)themeB.onclick=toggleTheme;
  addEventListener("keydown",e=>{
    if(e.altKey&&e.code==="KeyM"){toggleTheme();return}
    if(e.key==="/"&&!(App.viewerOpen&&App.viewerOpen())&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){
      const q=$("#q");
      if(q){e.preventDefault();q.focus()}
    }
    if((e.key==="?"||(e.shiftKey&&e.key==="/"))&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){
      e.preventDefault();
      if(App.openShortcuts)App.openShortcuts();
    }
  });
}
/* Autoplay global: si está activo, cada obra que se abre empieza a reproducirse sola */
let ap=false;try{ap=localStorage.getItem("autoplay")==="1"}catch(_){}
const subs=[];
App.autoplay={
  get:()=>ap,
  sub:fn=>subs.push(fn),
  set(v,quiet){
    ap=!!v;
    try{localStorage.setItem("autoplay",ap?"1":"0")}catch(_){}
    subs.forEach(f=>f(ap));
    if(!quiet)App.toast(ap?"Autoplay activado · las obras se reproducen solas":"Autoplay desactivado");
  }
};
function initAutoplay(){
  const b=$("#autoplay");
  if(!b)return;
  const sync=()=>{b.classList.toggle("on",ap);b.setAttribute("aria-pressed",ap)};
  sync();App.autoplay.sub(sync);b.onclick=()=>App.autoplay.set(!ap);
  if(ap)setTimeout(()=>App.toast("Reproductor activo · las obras se reproducen solas"),700);   /* aviso al abrir la fototeca */
}

/* Instalación Web App (PWA) según Modern Web Guidance:
   Prioriza Web Install API (navigator.install) con fallback progresivo a beforeinstallprompt */
function initInstall(){
  const btn=$("#btn-install");
  if(!btn)return;

  const supportsWebInstall=typeof Navigator!=="undefined"&&typeof Navigator.prototype.install==="function";
  let deferredPrompt=null;

  if(supportsWebInstall){
    btn.hidden=false;
  }

  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();
    deferredPrompt=e;
    if(!supportsWebInstall){
      btn.hidden=false;
    }
  });

  window.addEventListener("appinstalled",()=>{
    btn.hidden=true;
    deferredPrompt=null;
    App.toast("Fototeca instalada como App");
  });

  btn.addEventListener("click",async()=>{
    if(btn.getAttribute("aria-disabled")==="true")return;
    btn.setAttribute("aria-disabled","true");

    try{
      if(supportsWebInstall){
        await navigator.install();
        App.toast("Fototeca instalada o abierta");
        btn.hidden=true;
      }else if(deferredPrompt){
        const promptEvent=deferredPrompt;
        deferredPrompt=null;
        await promptEvent.prompt();
        const {outcome}=await promptEvent.userChoice;
        if(outcome==="accepted"){
          App.toast("Instalación completada");
          btn.hidden=true;
        }else{
          App.toast("Instalación pospuesta");
        }
      }
    }catch(err){
      if(err.name==="AbortError"){
        App.toast("Instalación cancelada");
      }else{
        console.error("[PWA Install]",err);
        App.toast("No se pudo iniciar la instalación");
      }
    }finally{
      btn.removeAttribute("aria-disabled");
    }
  });
}

/* Diálogo accesible de atajos de teclado y sugerencia para primera visita */
function initShortcuts(){
  const dlg=document.getElementById("dlg-shortcuts");
  const btnHeader=document.getElementById("btn-shortcuts");
  const btnClose=document.getElementById("sc-close");
  const banner=document.getElementById("sc-banner");
  const bannerOpen=document.getElementById("sc-banner-open");
  const bannerDismiss=document.getElementById("sc-banner-dismiss");

  function openShortcuts(){
    if(!dlg)return;
    if(typeof dlg.showModal==="function"){
      if(dlg.open)dlg.close();
      else dlg.showModal();
    }else{
      dlg.setAttribute("open","");
    }
  }

  function closeShortcuts(){
    if(!dlg)return;
    if(typeof dlg.close==="function")dlg.close();
    else dlg.removeAttribute("open");
  }

  App.openShortcuts=openShortcuts;
  App.closeShortcuts=closeShortcuts;

  if(btnHeader)btnHeader.onclick=openShortcuts;
  if(btnClose)btnClose.onclick=closeShortcuts;

  if(dlg){
    dlg.addEventListener("click",e=>{
      const rect=dlg.getBoundingClientRect();
      const inDialog=(rect.top<=e.clientY&&e.clientY<=rect.top+rect.height&&rect.left<=e.clientX&&e.clientX<=rect.left+rect.width);
      if(!inDialog)closeShortcuts();
    });
  }

  // Sugerencia de primera visita
  const STORAGE_KEY="fototeca_shortcuts_seen";
  let seen=false;
  try{seen=localStorage.getItem(STORAGE_KEY)==="1"}catch(_){}

  if(!seen&&banner){
    setTimeout(()=>{
      banner.hidden=false;
    },1500);

    if(bannerOpen){
      bannerOpen.onclick=()=>{
        banner.hidden=true;
        try{localStorage.setItem(STORAGE_KEY,"1")}catch(_){}
        openShortcuts();
      };
    }

    if(bannerDismiss){
      bannerDismiss.onclick=()=>{
        banner.hidden=true;
        try{localStorage.setItem(STORAGE_KEY,"1")}catch(_){}
        App.toast("Sugerencia oculta · Consulta los atajos con la tecla ? o en el menú");
      };
    }
  }
}

/* Indicador de conectividad y modo sin conexión (PWA) */
function initConnectivity(){
  const badge=$("#offline-badge");
  function syncOnline(){
    const isOff=!navigator.onLine;
    if(badge)badge.hidden=!isOff;
    if(isOff)App.toast("Modo sin conexión · Archivo local disponible");
  }
  window.addEventListener("online",()=>{
    if(badge)badge.hidden=true;
    App.toast("Conexión restablecida");
  });
  window.addEventListener("offline",syncOnline);
  if(!navigator.onLine)syncOnline();
}

/* Modal de Cita Académica y Preservación Cultural */
function initCiteModal(){
  const dlg=$("#dlg-cite"),btnClose=$("#cite-close");
  if(!dlg)return;

  function closeCite(){
    if(dlg.open)dlg.close();
  }
  if(btnClose)btnClose.onclick=closeCite;
  dlg.addEventListener("click",e=>{
    const rect=dlg.getBoundingClientRect();
    const inDialog=(rect.top<=e.clientY&&e.clientY<=rect.top+rect.height&&rect.left<=e.clientX&&e.clientX<=rect.left+rect.width);
    if(!inDialog)closeCite();
  });

  // Copiar formato con botón
  dlg.querySelectorAll(".cite-copy-btn").forEach(btn=>{
    btn.onclick=()=>{
      const fmt=btn.dataset.fmt;
      const el=document.getElementById("cite-"+fmt);
      if(!el)return;
      const text=el.textContent||"";
      (navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject())
        .catch(()=>{
          const ta=document.createElement("textarea");
          ta.value=text;document.body.appendChild(ta);ta.select();
          document.execCommand("copy");document.body.removeChild(ta);
          return Promise.resolve();
        })
        .then(()=>{
          const prev=btn.textContent;
          btn.textContent="Copiado";
          App.toast(`Cita ${fmt.toUpperCase()} copiada al portapapeles`);
          setTimeout(()=>{btn.textContent=prev;},1800);
        });
    };
  });

  App.openCite=(entry,stepIdx)=>{
    if(!entry)return;
    const title=entry.info.title||entry.base;
    const year=entry.info.year||(new Date().getFullYear());
    const type=entry.info.type||"Fotografía documental";
    const stepParam=stepIdx>0?`&paso=${stepIdx}`:"";
    const url=`${location.origin}${location.pathname}?obra=${encodeURIComponent(entry.base)}${stepParam}`;
    const stepDetail=(stepIdx>0&&entry.info.frames&&entry.info.frames[stepIdx-1])?` (Detalle: ${entry.info.frames[stepIdx-1].title})`:"";

    const apa=`Gris y Negro. (${year}). ${title}${stepDetail} [${type}]. Fototeca Gris y Negro. ${url}`;
    const chicago=`Gris y Negro. "${title}${stepDetail}." ${type}, ${year}. Fototeca Gris y Negro. ${url}.`;
    const bibtexKey=`grisynegro_${entry.base}${stepIdx>0?'_'+stepIdx:''}`;
    const bibtex=`@misc{${bibtexKey},
  author = {Gris y Negro},
  title = {${title}${stepDetail}},
  year = {${year}},
  howpublished = {Fototeca Gris y Negro},
  note = {${type}},
  url = {${url}}
}`;
    const iso=`GRIS Y NEGRO. ${title}${stepDetail} [en línea]. ${type}. ${year}. [consulta: ${new Date().toLocaleDateString("es-ES")}]. Disponible en: ${url}`;

    const setT=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
    setT("cite-apa",apa);
    setT("cite-chicago",chicago);
    setT("cite-bibtex",bibtex);
    setT("cite-iso",iso);

    if(dlg.showModal)dlg.showModal();else dlg.show();
  };
}

App.site={render:renderSite,init(){initSite();initAutoplay();initInstall();initShortcuts();initConnectivity();initCiteModal()}};
})();

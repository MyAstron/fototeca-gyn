(function(){
const $=s=>document.querySelector(s),esc=App.esc,imgSrc=App.imgSrc;
/* ===== Sitio: encabezado fijo + secciones al final (src/site.json) ===== */
function renderSite(s){
  document.title=s.title||"Fototeca";
  $("#brand").textContent=s.title||"Fototeca";
  const sec=s.sections||[];
  $("#nav").innerHTML=sec.map(x=>`<a href="#${esc(x.id)}">${esc(x.title)}</a>`).join("")+(s.instagram?`<a href="#contacto">Contacto</a>`:"");
  const ig=s.instagram?`<a class="ig" href="https://instagram.com/${esc(s.instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".7" fill="currentColor" stroke="none"/></svg><span class="mono">@${esc(s.instagram)}</span></a>`:"";
  $("#info").innerHTML=sec.map(x=>`<section class="sec" id="${esc(x.id)}"><div class="mono">${esc(x.title)}</div><p>${esc(x.text)}</p></section>`).join("")+`<footer class="foot" id="contacto"><span class="mono">© ${esc(s.year||new Date().getFullYear())}</span>${ig}</footer>`;
  startTyping(s.phrases||[]);
}
/* Frases que se "escriben" solas, se borran y pasan a la siguiente */
function startTyping(list){
  const ph=list.map(p=>typeof p==="string"?{text:p}:p).filter(p=>p&&p.text);
  if(!ph.length)return;
  const live=$("#live");
  $("#ghost").textContent=ph.reduce((a,p)=>p.text.length>a.length?p.text:a,"");   /* reserva el alto de la frase más larga */
  let i=0;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches){
    const show=()=>{live.textContent=ph[i].text;setTimeout(()=>{i=(i+1)%ph.length;show()},ph[i].hold||3500)};show();return;
  }
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  (async()=>{for(;;){
    const p=ph[i],c=Array.from(p.text);
    for(let k=1;k<=c.length;k++){live.textContent=c.slice(0,k).join("");await sleep(55+Math.random()*80+(",.".includes(c[k-1])?220:0))}
    await sleep(p.hold||2300);
    for(let k=c.length-1;k>=0;k--){live.textContent=c.slice(0,k).join("");await sleep(18)}
    await sleep(350);i=(i+1)%ph.length;
  }})();
}


/* Tema claro/oscuro (Alt + M) y atajo "/" para buscar */
function initSite(){
const root=document.documentElement;
function toggleTheme(){const dark=root.dataset.theme?root.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;root.dataset.theme=dark?"light":"dark";try{localStorage.setItem("theme",root.dataset.theme)}catch(e){}}
try{const t=localStorage.getItem("theme");if(t)root.dataset.theme=t}catch(e){}
$("#theme").onclick=toggleTheme;
  addEventListener("keydown",e=>{
    if(e.altKey&&e.code==="KeyM"){toggleTheme();return}
    if(e.key==="/"&&!(App.viewerOpen&&App.viewerOpen())&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();$("#q").focus()}
  });
}
App.site={render:renderSite,init:initSite};
})();

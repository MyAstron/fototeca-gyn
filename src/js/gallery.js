(function(){
const $=s=>document.querySelector(s),esc=App.esc,imgSrc=App.imgSrc,tsrc=e=>e.thumb?App.thumbSrc(e.thumb):App.imgSrc(e.f);   /* miniatura si existe, si no la original */
/* ===== Mosaico: pinta las obras que entrega App.api.obras() ===== */
function error(){$("#grid").innerHTML='<p class="mono">No se pudieron cargar las obras. Abre la página con “node server.js” (o ejecuta “node build-manifest.js” si usas hosting estático).</p>'}
function render(entries){
  entries.sort((a,b)=>(a.info.order??999)-(b.info.order??999));
  entries.forEach(e=>{
    const b=document.createElement("button");b.className="tile";b.dataset.type=e.info.type||"";
    b.innerHTML=`<img loading="lazy" src="${tsrc(e)}" alt="${esc(e.info.description||e.info.title||e.base)}"><div class="cap"><div class="row"><h3>${esc(e.info.title||e.base)}</h3><span class="mono">${esc([e.info.type,e.info.year].filter(Boolean).join(" · "))}</span></div><p>${esc(e.info.description||"")}</p></div>`;
    b.onclick=()=>App.api.viewer().then(()=>App.openViewer(e));$("#grid").appendChild(b);
  });
  /* Línea de tiempo: las mismas obras agrupadas por año */
  const tl=$("#timeline"),tItems=[],byYear={};
  entries.forEach((e,i)=>{const y=e.info.year||"—";(byYear[y]=byYear[y]||[]).push(i)});
  Object.keys(byYear).sort((a,b)=>a==="—"?1:b==="—"?-1:a-b).forEach(y=>{
    const sec=document.createElement("section");sec.className="ty";
    sec.innerHTML=`<h3 class="tyear">${y==="—"?"Sin fecha":esc(y)}</h3><div class="tlist"></div>`;
    byYear[y].forEach(i=>{const e=entries[i],b=document.createElement("button");b.className="titem";b.dataset.type=e.info.type||"";
      b.innerHTML=`<img loading="lazy" src="${tsrc(e)}" alt="${esc(e.info.description||e.info.title||e.base)}"><div><span class="mono">${esc(e.info.type||"")}</span><h4>${esc(e.info.title||e.base)}</h4><p>${esc(e.info.description||"")}</p></div>`;
      b.onclick=()=>App.api.viewer().then(()=>App.openViewer(e));sec.querySelector(".tlist").appendChild(b);tItems[i]=b});
    tl.appendChild(sec)});
  $("#views").addEventListener("click",ev=>{const b=ev.target.closest(".vw");if(!b)return;
    ev.currentTarget.querySelectorAll(".vw").forEach(x=>x.classList.toggle("on",x===b));$("#grid").hidden=b.dataset.v!=="grid";tl.hidden=b.dataset.v!=="time"});
  const ob=new URLSearchParams(location.search).get("obra"),eo=ob&&entries.find(x=>x.base===ob);   /* enlace directo: ?obra=nombre */
  if(eo)App.api.viewer().then(()=>App.openViewer(eo,true));
  const types=[...new Set(entries.map(e=>e.info.type).filter(Boolean))];
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const hay=entries.map(e=>{const i=e.info;return norm([i.title,i.description,i.intro,i.type,i.year,i.measures,i.status,...(i.frames||[]).flatMap(f=>[f.title,f.text,...(f.tags||[]),...(f.children||[]).flatMap(c=>[c.title,c.text,...(c.tags||[])])])].join(" "))});
  const tiles=[...document.querySelectorAll(".tile")],q=$("#q"),none=$("#none");let ft="";
  const apply=()=>{const w=norm(q.value).split(/\s+/).filter(Boolean);let n=0;   /* busca en títulos, descripciones y en cada recuadro/hijo */
    tiles.forEach((t,i)=>{const ok=(!ft||t.dataset.type===ft)&&w.every(x=>hay[i].includes(x));t.hidden=!ok;tItems[i].hidden=!ok;if(ok)n++});tl.querySelectorAll(".ty").forEach(s=>{s.hidden=![...s.querySelectorAll(".titem")].some(x=>!x.hidden)});none.hidden=n>0};
  q.addEventListener("input",apply);
  q.addEventListener("keydown",e=>{if(e.key==="Escape"){q.value="";apply();q.blur()}});
  if(types.length>1){   /* filtros por tipo, con conteo */
    const fl=$("#filters");
    const mk=(label,val,n)=>{const b=document.createElement("button");b.className="fl"+(val===""?" on":"");b.innerHTML=`${esc(label)}<i>${n}</i>`;
      b.onclick=()=>{fl.querySelectorAll(".fl").forEach(x=>x.classList.toggle("on",x===b));ft=val;apply()};fl.appendChild(b)};
    mk("Todas","",entries.length);
    types.forEach(t=>mk(t,t,entries.filter(e=>e.info.type===t).length));
  }
}

App.gallery={render,error};
})();

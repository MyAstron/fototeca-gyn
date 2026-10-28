(function(){
const $=s=>document.querySelector(s),esc=App.esc,imgSrc=App.imgSrc;
/* ===== Mosaico: pinta las obras que entrega App.api.obras() ===== */
function error(){$("#grid").innerHTML='<p class="mono">No se pudieron cargar las obras. Abre la página con “node server.js” (o ejecuta “node build-manifest.js” si usas hosting estático).</p>'}
function render(entries){
  entries.sort((a,b)=>(a.info.order??999)-(b.info.order??999));
  entries.forEach(e=>{
    const b=document.createElement("button");b.className="tile";b.dataset.type=e.info.type||"";
    b.innerHTML=`<img loading="lazy" src="${imgSrc(e.f)}" alt="${esc(e.info.title||e.base)}"><div class="cap"><div class="row"><h3>${esc(e.info.title||e.base)}</h3><span class="mono">${esc([e.info.type,e.info.year].filter(Boolean).join(" · "))}</span></div><p>${esc(e.info.description||"")}</p></div>`;
    b.onclick=()=>App.api.viewer().then(()=>App.openViewer(e));$("#grid").appendChild(b);
  });
  const types=[...new Set(entries.map(e=>e.info.type).filter(Boolean))];
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const hay=entries.map(e=>{const i=e.info;return norm([i.title,i.description,i.intro,i.type,i.year,...(i.frames||[]).flatMap(f=>[f.title,f.text,...(f.children||[]).flatMap(c=>[c.title,c.text])])].join(" "))});
  const tiles=[...document.querySelectorAll(".tile")],q=$("#q"),none=$("#none");let ft="";
  const apply=()=>{const w=norm(q.value).split(/\s+/).filter(Boolean);let n=0;   /* busca en títulos, descripciones y en cada recuadro/hijo */
    tiles.forEach((t,i)=>{const ok=(!ft||t.dataset.type===ft)&&w.every(x=>hay[i].includes(x));t.hidden=!ok;if(ok)n++});none.hidden=n>0};
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

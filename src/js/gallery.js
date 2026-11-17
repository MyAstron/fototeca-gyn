(function(){
const $=s=>document.querySelector(s),esc=App.esc,imgSrc=App.imgSrc;

/* Obtiene la ruta de imagen activa (SVG o raster original) */
function activeSrcOf(e){
  const hasSvg=Boolean(e.thumb&&/\.svg$/i.test(e.thumb));
  if(e.activeFmt==="orig")return App.imgSrc(e.f,e);
  if(e.activeFmt==="svg"&&hasSvg)return App.thumbSrc(e.thumb);
  return e.thumb?App.thumbSrc(e.thumb):App.imgSrc(e.f,e);
}

/* ===== Mosaico: pinta las obras que entrega App.api.obras() ===== */
function error(){
  const g=$("#grid");
  if(g)g.innerHTML='<p class="mono" style="padding:2rem 0">No se pudieron cargar las obras. Abre la página con “node server.js” (o ejecuta “node build-manifest.js” si usas hosting estático).</p>';
}

/* Abre una obra: la miniatura "respira", se precarga la foto y el visor entra haciendo zoom desde esa miniatura */
function openWork(e,el){
  if(el.classList.contains("opening"))return;
  el.classList.add("opening");
  const r=el.getBoundingClientRect(),from={x:r.left+r.width/2,y:r.top+r.height/2};
  const targetSrc=activeSrcOf(e);
  Promise.all([App.api.viewer(),App.preload(targetSrc)])
    .then(()=>App.openViewer(e,false,from,el))
    .catch(()=>{})
    .then(()=>setTimeout(()=>el.classList.remove("opening"),500));
}

function render(entries){
  entries.sort((a,b)=>(a.info.order??999)-(b.info.order??999));
  const grid=$("#grid");
  if(!grid)return;

  // Remueve skeletons de carga e inserta en un solo reflow con DocumentFragment
  grid.replaceChildren();
  const fragGrid=document.createDocumentFragment();
  const tiles=[];

  entries.forEach((e,idx)=>{
    const hasSvg=Boolean(e.thumb&&/\.svg$/i.test(e.thumb));
    e.hasSvg=hasSvg;
    if(!e.activeFmt)e.activeFmt=hasSvg?"svg":"orig";

    const b=document.createElement("button");
    b.className="tile";
    b.dataset.type=e.info.type||"";
    b.dataset.base=e.base||"";
    b._entry=e;

    // Las primeras 2 imágenes son candidatas a LCP (fetchpriority="high"). El resto usan lazy loading estándar
    const isLcp=idx<2;
    const loadAttrs=isLcp?'fetchpriority="high"':'loading="lazy"';
    const currentSrc=activeSrcOf(e);

    const toggleHtml=hasSvg?`
      <div class="fmt-toggle mono" role="group" aria-label="Formato de imagen">
        <span class="fmt-btn ${e.activeFmt==='orig'?'on':''}" data-fmt="orig" title="Ver fotografía original">Foto</span>
        <span class="fmt-btn ${e.activeFmt==='svg'?'on':''}" data-fmt="svg" title="Ver versión vectorial SVG">SVG</span>
      </div>`:``;

    b.innerHTML=`<div class="tile-media"><img ${loadAttrs} decoding="async" src="${currentSrc}" alt="${esc(e.info.description||e.info.title||e.base)}">${toggleHtml}</div><div class="cap"><div class="row"><h3>${esc(e.info.title||e.base)}</h3><span class="mono">${esc([e.info.type,e.info.year].filter(Boolean).join(" · "))}</span></div><p>${esc(e.info.description||"")}</p></div>`;
    b.onclick=()=>openWork(e,b);

    if(hasSvg){
      b.querySelectorAll(".fmt-btn").forEach(btn=>{
        btn.onclick=ev=>{
          ev.stopPropagation();
          setEntryFmt(e,btn.dataset.fmt);
        };
      });
    }

    tiles.push(b);
    fragGrid.appendChild(b);
  });
  grid.appendChild(fragGrid);

  /* Línea de tiempo: las mismas obras agrupadas por año */
  const tl=$("#timeline"),tItems=[],byYear={};
  if(tl){
    tl.replaceChildren();
    const fragTl=document.createDocumentFragment();
    entries.forEach((e,i)=>{const y=e.info.year||"—";(byYear[y]=byYear[y]||[]).push(i)});
    Object.keys(byYear).sort((a,b)=>a==="—"?1:b==="—"?-1:a-b).forEach(y=>{
      const sec=document.createElement("section");sec.className="ty";
      sec.innerHTML=`<h3 class="tyear">${y==="—"?"Sin fecha":esc(y)}</h3><div class="tlist"></div>`;
      const tlist=sec.querySelector(".tlist");
      byYear[y].forEach(i=>{
        const e=entries[i],b=document.createElement("button");b.className="titem";b.dataset.type=e.info.type||"";
        b._entry=e;
        const currentSrc=activeSrcOf(e);
        const toggleHtml=e.hasSvg?`
          <div class="fmt-toggle mono" role="group" aria-label="Formato de imagen">
            <span class="fmt-btn ${e.activeFmt==='orig'?'on':''}" data-fmt="orig" title="Ver fotografía original">Foto</span>
            <span class="fmt-btn ${e.activeFmt==='svg'?'on':''}" data-fmt="svg" title="Ver versión vectorial SVG">SVG</span>
          </div>`:``;

        b.innerHTML=`<div class="tile-media"><img loading="lazy" decoding="async" src="${currentSrc}" alt="${esc(e.info.description||e.info.title||e.base)}">${toggleHtml}</div><div><span class="mono">${esc(e.info.type||"")}</span><h4>${esc(e.info.title||e.base)}</h4><p>${esc(e.info.description||"")}</p></div>`;
        b.onclick=()=>openWork(e,b);

        if(e.hasSvg){
          b.querySelectorAll(".fmt-btn").forEach(btn=>{
            btn.onclick=ev=>{
              ev.stopPropagation();
              setEntryFmt(e,btn.dataset.fmt);
            };
          });
        }

        tlist.appendChild(b);
        tItems[i]=b;
      });
      fragTl.appendChild(sec);
    });
    tl.appendChild(fragTl);
  }

  function setEntryFmt(e,fmt){
    e.activeFmt=fmt;
    const src=activeSrcOf(e);
    const tileEl=tiles.find(x=>x._entry===e);
    if(tileEl){
      const img=tileEl.querySelector(".tile-media img");
      if(img)img.src=src;
      tileEl.querySelectorAll(".fmt-btn").forEach(x=>x.classList.toggle("on",x.dataset.fmt===fmt));
    }
    const tlEl=tItems.find(x=>x&&x._entry===e);
    if(tlEl){
      const img=tlEl.querySelector(".tile-media img");
      if(img)img.src=src;
      tlEl.querySelectorAll(".fmt-btn").forEach(x=>x.classList.toggle("on",x.dataset.fmt===fmt));
    }
  }
  App.gallery.syncFmt=(base,fmt)=>{
    const e=entries.find(x=>x.base===base);
    if(e)setEntryFmt(e,fmt);
  };

  const views=$("#views");
  if(views){
    views.addEventListener("click",ev=>{
      const b=ev.target.closest(".vw");if(!b)return;
      views.querySelectorAll(".vw").forEach(x=>x.classList.toggle("on",x===b));
      grid.hidden=b.dataset.v!=="grid";
      if(tl)tl.hidden=b.dataset.v!=="time";
    });
  }

  const ob=new URLSearchParams(location.search).get("obra"),eo=ob&&entries.find(x=>x.base===ob);   /* enlace directo: ?obra=nombre */
  if(eo)App.api.viewer().then(()=>App.openViewer(eo,true));

  const types=[...new Set(entries.map(e=>e.info.type).filter(Boolean))];
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const hay=entries.map(e=>{const i=e.info;return norm([i.title,i.description,i.intro,i.type,i.year,i.measures,i.status,...(i.frames||[]).flatMap(f=>[f.title,f.text,...(f.tags||[]),...(f.children||[]).flatMap(c=>[c.title,c.text,...(c.tags||[])])])].join(" "))});
  const q=$("#q"),none=$("#none");let ft="";

  /* Filtrado con debounce por requestAnimationFrame y prevención de mutaciones redundantes */
  let filterRaf=null;
  const apply=()=>{
    const w=norm(q?q.value:"").split(/\s+/).filter(Boolean);
    let n=0;
    tiles.forEach((t,i)=>{
      const ok=(!ft||t.dataset.type===ft)&&w.every(x=>hay[i].includes(x));
      if(t.hidden===ok)t.hidden=!ok;   /* evita mutación si ya está en ese estado */
      if(tItems[i]&&tItems[i].hidden===ok)tItems[i].hidden=!ok;
      if(ok)n++;
    });
    if(tl){
      tl.querySelectorAll(".ty").forEach(s=>{
        const hasVis=[...s.querySelectorAll(".titem")].some(x=>!x.hidden);
        if(s.hidden===hasVis)s.hidden=!hasVis;
      });
    }
    if(none&&(none.hidden!==(n>0)))none.hidden=n>0;
    const countEl=$("#search-count");
    if(countEl){
      if(ft||w.length){
        countEl.textContent=`${n} ${n===1?"obra":"obras"}`;
        countEl.hidden=false;
      }else{
        countEl.textContent=`${entries.length} obras`;
        countEl.hidden=false;
      }
    }
    updateHighlights(w);
  };

  /* Resaltado dinámico sin alterar el DOM (CSS Custom Highlight API) */
  function updateHighlights(words){
    if(typeof CSS==="undefined"||!("highlights" in CSS))return;
    CSS.highlights.delete("search-match");
    if(!words.length)return;

    const ranges=[];
    const walker=document.createTreeWalker(grid,NodeFilter.SHOW_TEXT,null);
    let node;
    while((node=walker.nextNode())){
      const parentTile=node.parentElement?.closest(".tile");
      if(parentTile&&parentTile.hidden)continue;
      const text=node.textContent||"";
      const normText=norm(text);
      for(const w of words){
        if(w.length<2)continue;
        let pos=0;
        while((pos=normText.indexOf(w,pos))!==-1){
          try{
            const r=new Range();
            r.setStart(node,pos);
            r.setEnd(node,pos+w.length);
            ranges.push(r);
          }catch(_){}
          pos+=w.length;
        }
      }
    }
    if(ranges.length){
      const h=new Highlight(...ranges);
      CSS.highlights.set("search-match",h);
    }
  }

  const scheduleApply=()=>{
    if(filterRaf)cancelAnimationFrame(filterRaf);
    filterRaf=requestAnimationFrame(apply);
  };

  if(q){
    q.addEventListener("input",scheduleApply);
    q.addEventListener("keydown",e=>{if(e.key==="Escape"){q.value="";apply();q.blur()}});
  }

  if(types.length>1){   /* filtros por tipo, con conteo */
    const fl=$("#filters");
    if(fl){
      fl.replaceChildren();
      const mk=(label,val,n)=>{
        const b=document.createElement("button");
        b.className="fl"+(val===""?" on":"");
        b.innerHTML=`${esc(label)}<i>${n}</i>`;
        b.onclick=()=>{
          fl.querySelectorAll(".fl").forEach(x=>x.classList.toggle("on",x===b));
          ft=val;
          scheduleApply();
        };
        fl.appendChild(b);
      };
      mk("Todas","",entries.length);
      types.forEach(t=>mk(t,t,entries.filter(e=>e.info.type===t).length));
    }
  }
  apply();
}

App.gallery={render,error};
})();

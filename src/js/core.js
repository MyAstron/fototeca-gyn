/* Núcleo: espacio de nombres, utilidades y resolvedor CDN para GitHub Pages */
window.App=window.App||{};
App.esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* Soporte CDN y GitHub Pages: configurable vía <meta name="cdn-url" content="..."> o window.__CDN_URL */
App.cdn=(function(){
  const meta=document.querySelector('meta[name="cdn-url"]');
  let base=(meta&&meta.getAttribute("content"))||window.__CDN_URL||"";
  if(base&&!base.endsWith("/"))base+="/";
  return {
    base,
    url(path){
      if(!path||/^(?:https?:|\/\/|data:|blob:)/i.test(path))return path;
      const clean=String(path).replace(/^\.?\//,"");
      return base?base+clean:clean;
    }
  };
})();

App.thumbSrc=n=>{
  const E=window.__EMBED;
  if(E&&E.img&&E.img["thumbs/"+n])return E.img["thumbs/"+n];
  return App.cdn.url("src/img/thumbs/"+encodeURIComponent(n));
};

App.imgSrc=n=>{
  const E=window.__EMBED;
  if(E&&E.img&&E.img[n])return E.img[n];
  return App.cdn.url("src/img/"+encodeURIComponent(n));
};

/* precarga la imagen original para que la transición arranque con la foto lista */
App.preload=src=>new Promise(r=>{
  const i=new Image();
  i.onload=i.onerror=()=>r();
  i.src=src;
  setTimeout(r,4000);
});

/* aviso suave y breve (reproductor activo / en pausa, autoplay, etc.) */
App.toast=(msg,ms)=>{
  let t=document.getElementById("toast");
  if(!t){
    t=document.createElement("div");
    t.id="toast";
    t.className="toast";
    t.setAttribute("role","status");
    t.setAttribute("aria-live","polite");
    document.body.appendChild(t);
  }
  t.textContent=msg;
  void t.offsetWidth;
  t.classList.add("on");
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove("on"),ms||2400);
};

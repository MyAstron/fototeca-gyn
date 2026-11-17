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

App.supportsWebp=true;
App.supportsAvif=false;
try{
  const testAvif=new Image();
  testAvif.onload=()=>{App.supportsAvif=testAvif.width===1;};
  testAvif.src="data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAG1pZjFhdmlmAAACAG1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAAACRwaXRtAAAAAQAAABNpaWxvAAAAAAAQAAABAAAAAAABB2lscmUAAAAA";
}catch(e){}

App.thumbSrc=n=>{
  const E=window.__EMBED;
  if(E&&E.img&&E.img["thumbs/"+n])return E.img["thumbs/"+n];
  return App.cdn.url("src/img/thumbs/"+encodeURIComponent(n));
};

App.imgSrc=(n,e)=>{
  const E=window.__EMBED;
  if(E&&E.img&&E.img[n])return E.img[n];
  if(e&&e.variants){
    if(App.supportsAvif&&e.variants.avif)return App.cdn.url("src/img/"+encodeURIComponent(e.variants.avif));
    if(App.supportsWebp&&e.variants.webp)return App.cdn.url("src/img/"+encodeURIComponent(e.variants.webp));
  }
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

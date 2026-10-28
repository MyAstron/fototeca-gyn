/* API de la app: cada función es una llamada AJAX (vía App.http).
   Primero intenta el endpoint del servidor (ajax/site, ajax/obras); si no existe (hosting estático)
   cae a los archivos de src/ (site.json, manifest.json e info/*.json). */
(function(){
  const H=App.http,baseName=f=>f.replace(/\.[^.]+$/,"");
  const orFallback=(primary,fallback)=>Promise.resolve().then(primary).catch(fallback);
  let vp=null;
  App.api={
    /* vistas HTML parciales */
    view:name=>Promise.resolve(H.html("src/views/"+name+".html")),
    /* datos del sitio: título, secciones, contacto, frases */
    site:()=>orFallback(()=>H.json("ajax/site"),()=>H.json("src/data/site.json")),
    /* lista de obras: [{f, base, info}] */
    obras:()=>orFallback(
      ()=>H.json("ajax/obras").then(r=>r.obras.map(o=>({f:o.file,base:o.base,info:o.info||{}}))),
      ()=>Promise.resolve(H.json("src/img/manifest.json")).then(m=>Promise.all(m.images.map(f=>
        Promise.resolve(H.json("src/img/info/"+baseName(f)+".json")).catch(()=>({})).then(info=>({f,base:baseName(f),info})))))),
    /* el visor (HTML + CSS + JS) se descarga solo la primera vez que se abre una obra */
    viewer:()=>vp||(vp=Promise.all([H.html("src/views/viewer.html"),H.css("src/css/viewer.css")])
      .then(r=>{jQuery("#app-viewer").html(r[0]);return H.script("src/js/viewer.js")})
      .catch(e=>{vp=null;throw e}))
  };
})();

/* Arranque: división de JavaScript por página/módulo, skeletons inmediatos y ejecución no bloqueante */
(function(){
  function initHeader(){
    return Promise.all([
      App.api.view("header"),
      App.http.script("src/js/site.js")
    ]).then(([html])=>{
      const el=document.getElementById("app-header");
      if(el)el.innerHTML=html;
      if(App.site&&App.site.init)App.site.init();
      return App.api.site().then(data=>{
        if(App.site&&App.site.render)App.site.render(data);
      }).catch(()=>{});
    });
  }

  function initHome(){
    return Promise.all([
      App.api.view("home"),
      App.http.script("src/js/gallery.js")
    ]).then(([html])=>{
      const el=document.getElementById("app-main");
      if(el)el.innerHTML=html;
      // Inicia la petición de obras y reemplaza los skeletons al completarse
      return App.api.obras().then(
        entries=>{if(App.gallery&&App.gallery.render)App.gallery.render(entries)},
        err=>{if(App.gallery&&App.gallery.error)App.gallery.error(err)}
      );
    }).catch(()=>{
      const el=document.getElementById("app-main");
      if(el)el.innerHTML='<p class="mono" style="padding:4rem 5vw">No se pudo cargar la galería.</p>';
    });
  }

  function boot(){
    // Carga paralela no bloqueante de vistas y scripts de página
    initHeader();
    initHome();

    // Si la URL contiene ?obra=..., precarga el módulo del visor bajo demanda
    const ob=new URLSearchParams(location.search).get("obra");
    if(ob){
      App.api.viewer().catch(()=>{});
    }
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();

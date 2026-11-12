/* Capa AJAX / HTTP moderna: fetch nativo con soporte CDN y fallback transparente */
(function(){
  const E=window.__EMBED,has=u=>E&&E.files&&u in E.files;
  const scriptCache=new Map(),styleCache=new Set();

  function request(url,type){
    if(has(url)){
      const val=E.files[url];
      return Promise.resolve(type==="json"?(typeof val==="string"?JSON.parse(val):val):val);
    }
    const finalUrl=App.cdn?App.cdn.url(url):url;
    if(typeof fetch!=="undefined"){
      const headers={"X-Requested-With":"XMLHttpRequest"};
      if(type==="json")headers["Accept"]="application/json, text/plain, */*";
      else if(type==="html")headers["Accept"]="text/html, text/plain, */*";
      return fetch(finalUrl,{headers,credentials:"same-origin"}).then(res=>{
        if(!res.ok)throw new Error("HTTP "+res.status+" al cargar "+finalUrl);
        return type==="json"?res.json():res.text();
      });
    }
    /* Fallback por compatibilidad si no hubiera fetch */
    return new Promise((resolve,reject)=>{
      if(window.jQuery){
        window.jQuery.ajax({url:finalUrl,dataType:type||"text",cache:true})
          .done(resolve).fail((_,__,err)=>reject(new Error(err||"Error en petición")));
      }else{
        const xhr=new XMLHttpRequest();
        xhr.open("GET",finalUrl);
        xhr.setRequestHeader("X-Requested-With","XMLHttpRequest");
        xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve(type==="json"?JSON.parse(xhr.responseText):xhr.responseText):reject(new Error("Status "+xhr.status));
        xhr.onerror=()=>reject(new Error("Error de red"));
        xhr.send();
      }
    });
  }

  function loadCss(url){
    const finalUrl=App.cdn?App.cdn.url(url):url;
    if(styleCache.has(finalUrl)||document.querySelector('style[data-src="'+finalUrl+'"],link[href="'+finalUrl+'"]')){
      return Promise.resolve();
    }
    styleCache.add(finalUrl);
    return request(url,"text").then(css=>{
      const style=document.createElement("style");
      style.setAttribute("data-src",finalUrl);
      style.textContent=css;
      document.head.appendChild(style);
    });
  }

  function loadScript(url){
    if(scriptCache.has(url))return scriptCache.get(url);
    if(has(url)){
      const code=E.files[url];
      const p=Promise.resolve().then(()=>{
        if(window.jQuery)window.jQuery.globalEval(code);
        else new Function(code)();
      });
      scriptCache.set(url,p);
      return p;
    }
    const finalUrl=App.cdn?App.cdn.url(url):url;
    const p=new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src=finalUrl;
      s.async=true;
      s.onload=()=>resolve();
      s.onerror=()=>reject(new Error("No se pudo cargar "+finalUrl));
      document.head.appendChild(s);
    });
    scriptCache.set(url,p);
    return p;
  }

  App.http={
    request,
    json:u=>request(u,"json"),
    html:u=>request(u,"html"),
    css:loadCss,
    script:loadScript
  };
})();

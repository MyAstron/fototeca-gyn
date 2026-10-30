/* Núcleo: espacio de nombres y utilidades. El AJAX vive en src/ajax/ */
window.App=window.App||{};
App.esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
App.thumbSrc=n=>{const E=window.__EMBED;return (E&&E.img&&E.img["thumbs/"+n])||"src/img/thumbs/"+encodeURIComponent(n)};
/* precarga la imagen original para que la transición arranque con la foto lista */
App.preload=src=>new Promise(r=>{const i=new Image();i.onload=i.onerror=()=>r();i.src=src;setTimeout(r,4000)});
/* aviso suave y breve (reproductor activo / en pausa, autoplay, etc.) */
App.toast=(msg,ms)=>{
  let t=document.getElementById("toast");
  if(!t){t=document.createElement("div");t.id="toast";t.className="toast";t.setAttribute("role","status");t.setAttribute("aria-live","polite");document.body.appendChild(t)}
  t.textContent=msg;void t.offsetWidth;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),ms||2400);
};
App.imgSrc=n=>{const E=window.__EMBED;return (E&&E.img&&E.img[n])||"src/img/"+encodeURIComponent(n)};

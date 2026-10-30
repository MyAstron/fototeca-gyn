/* Núcleo: espacio de nombres y utilidades. El AJAX vive en src/ajax/ */
window.App=window.App||{};
App.esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
App.thumbSrc=n=>{const E=window.__EMBED;return (E&&E.img&&E.img["thumbs/"+n])||"src/img/thumbs/"+encodeURIComponent(n)};
App.imgSrc=n=>{const E=window.__EMBED;return (E&&E.img&&E.img[n])||"src/img/"+encodeURIComponent(n)};

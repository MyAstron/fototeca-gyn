// Servidor local sin dependencias:  node server.js  ->  http://localhost:8080
// Solo "/" (el index) se abre escribiendo la URL. Todo lo demás se entrega únicamente cuando lo pide
// la propia página (AJAX, <img>, <link>, <script>, Service Worker). Si alguien lo escribe en la barra de direcciones
// (carpeta, archivo, /src/, etc.) responde 404 y la página 404 lo devuelve al inicio.
const http=require("http"),fs=require("fs"),path=require("path");
const ROOT=__dirname,SRC=path.join(ROOT,"src"),PORT=process.env.PORT||8080;
const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",
  ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".gif":"image/gif",".avif":"image/avif",".svg":"image/svg+xml",".ico":"image/x-icon"};
const NAV=["document","iframe","frame","embed","object"];   // valores de Sec-Fetch-Dest que significan "abrir como página"

// Endpoints AJAX: solo responden a peticiones AJAX; si alguien los escribe en la barra de direcciones -> 404 -> index
const readJSON=f=>{try{return JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){return null}};
const IMG=/\.(jpe?g|png|webp|gif|avif|svg)$/i;
const thumbOf=base=>{try{return fs.readdirSync(path.join(SRC,"img","thumbs")).find(f=>f.replace(/\.[^.]+$/,"")===base&&IMG.test(f))||null}catch(e){return null}};
const AJAX={
  site:()=>readJSON(path.join(SRC,"data","site.json")),
  obras:()=>({obras:fs.readdirSync(path.join(SRC,"img")).filter(f=>IMG.test(f)).sort().map(file=>{
    const base=file.replace(/\.[^.]+$/,"");
    return {file,base,thumb:thumbOf(base),info:readJSON(path.join(SRC,"img","info",base+".json"))||{}};
  })})
};
function notFound(res,asPage){
  res.writeHead(404,{"Content-Type":asPage?MIME[".html"]:"text/plain; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  if(asPage)fs.createReadStream(path.join(ROOT,"404.html")).pipe(res);else res.end("404");
}
http.createServer((req,res)=>{
  let p;try{p=decodeURIComponent(req.url.split("?")[0])}catch(e){return notFound(res,true)}
  const dest=req.headers["sec-fetch-dest"],xhr=req.headers["x-requested-with"]==="XMLHttpRequest";
  // navegadores modernos envían Sec-Fetch-Dest; si falta, se deduce por Accept (AJAX se identifica con X-Requested-With)
  const isNav=dest?NAV.includes(dest):(!xhr&&/text\/html/.test(req.headers.accept||""));

  if(p==="/"||p==="/index.html"){
    res.writeHead(200,{"Content-Type":MIME[".html"],"Cache-Control":"no-cache"});
    const origin=(req.headers["x-forwarded-proto"]||"http")+"://"+req.headers.host;   // og:image y og:url absolutas
    return res.end(fs.readFileSync(path.join(ROOT,"index.html"),"utf8").split("{{ORIGIN}}").join(origin));
  }

  // Entrega del Service Worker en la raíz
  if(p==="/sw.js"){
    const swPath=path.join(ROOT,"sw.js");
    return fs.stat(swPath,(e,st)=>{
      if(e||!st.isFile())return notFound(res,false);
      res.writeHead(200,{"Content-Type":MIME[".js"],"Cache-Control":"no-cache","Service-Worker-Allowed":"/","X-Content-Type-Options":"nosniff"});
      fs.createReadStream(swPath).pipe(res);
    });
  }

  if(isNav)return notFound(res,true);                                  // la escribieron a mano -> 404 -> index

  if(p.startsWith("/ajax/")){
    const fn=AJAX[p.slice(6)],data=fn&&fn();
    if(!data)return notFound(res,false);
    const body=JSON.stringify(data);
    const etag='W/"'+body.length.toString(16)+'"';
    if(req.headers["if-none-match"]===etag){
      res.writeHead(304);
      return res.end();
    }
    res.writeHead(200,{
      "Content-Type":MIME[".json"],
      "Cache-Control":"public, max-age=300, stale-while-revalidate=3600",
      "ETag":etag,
      "X-Content-Type-Options":"nosniff"
    });
    return res.end(body);
  }

  const file=path.normalize(path.join(ROOT,p));
  if(!file.startsWith(SRC+path.sep))return notFound(res,false);        // fuera de /src/ no se sirve nada

  fs.stat(file,(e,st)=>{
    if(e||!st.isFile())return notFound(res,false);                     // carpetas: nunca
    const etag='W/"'+st.size.toString(16)+'-'+Math.floor(st.mtimeMs).toString(16)+'"';
    if(req.headers["if-none-match"]===etag){
      res.writeHead(304);
      return res.end();
    }
    const ext=path.extname(file).toLowerCase();
    // Cache de estáticos por 7 días con revalidación suave
    const cacheCtrl=/\.(jpe?g|png|webp|gif|avif|svg|css|js|ico)$/i.test(ext)
      ?"public, max-age=604800, stale-while-revalidate=86400"
      :"public, max-age=600, stale-while-revalidate=3600";

    res.writeHead(200,{
      "Content-Type":MIME[ext]||"application/octet-stream",
      "Cache-Control":cacheCtrl,
      "ETag":etag,
      "Last-Modified":st.mtime.toUTCString(),
      "X-Content-Type-Options":"nosniff"
    });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT,()=>console.log("Fototeca en http://localhost:"+PORT));

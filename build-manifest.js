// Uso: node build-manifest.js  -> genera src/img/manifest.json (imágenes y miniaturas) para hosting estático
// Miniaturas: src/img/thumbs/<mismo nombre que la imagen>.svg|webp|png|jpg  (opcionales; si no hay, se usa la original)
const fs=require("fs"),p=require("path"),d=p.join(__dirname,"src/img"),EXT=/\.(jpe?g|png|webp|gif|avif|svg)$/i;
const images=fs.readdirSync(d).filter(f=>EXT.test(f)).sort();
const thumbs={};
try{fs.readdirSync(p.join(d,"thumbs")).filter(f=>EXT.test(f)).forEach(f=>{thumbs[f.replace(/\.[^.]+$/,"")]=f})}catch(e){}
fs.writeFileSync(p.join(d,"manifest.json"),JSON.stringify({images,thumbs},null,2));
console.log(images.length+" imágenes, "+Object.keys(thumbs).length+" miniaturas en el manifiesto");

// Uso: node build-manifest.js  -> genera src/img/manifest.json con las imágenes de src/img/
const fs=require("fs"),p=require("path"),d=p.join(__dirname,"src/img");
const images=fs.readdirSync(d).filter(f=>/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(f)).sort();
fs.writeFileSync(p.join(d,"manifest.json"),JSON.stringify({images},null,2));
console.log(images.length+" imágenes en el manifiesto");

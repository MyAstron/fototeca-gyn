// Uso: node build-manifest.js -> genera src/img/manifest.json para hosting estático y fallback
// Agrupa obras maestras únicas (JPG/PNG) y registra variantes modernas (WebP/AVIF) y miniaturas (SVG)
const fs = require("fs");
const p = require("path");

const d = p.join(__dirname, "src/img");
const RASTER = /\.(jpe?g|png)$/i;
const EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

const files = fs.readdirSync(d).filter(f => EXT.test(f) && !f.startsWith(".")).sort();

const byBase = new Map();
files.forEach(f => {
  const base = f.replace(/\.[^.]+$/, "");
  const ext = p.extname(f).toLowerCase().replace(".", "");
  if (!byBase.has(base)) {
    byBase.set(base, { primary: null, variants: {} });
  }
  const entry = byBase.get(base);
  if (RASTER.test(f)) {
    entry.primary = f;
  } else if (ext === "webp" || ext === "avif") {
    entry.variants[ext] = f;
  } else if (!entry.primary) {
    entry.primary = f;
  }
});

const images = [];
const variants = {};
for (const [base, entry] of byBase.entries()) {
  const prime = entry.primary || entry.variants.webp || entry.variants.avif;
  if (prime) {
    images.push(prime);
    if (Object.keys(entry.variants).length > 0) {
      variants[base] = entry.variants;
    }
  }
}
images.sort();

const thumbs = {};
try {
  fs.readdirSync(p.join(d, "thumbs")).filter(f => EXT.test(f) && !f.startsWith(".")).forEach(f => {
    thumbs[f.replace(/\.[^.]+$/, "")] = f;
  });
} catch (e) {}

fs.writeFileSync(p.join(d, "manifest.json"), JSON.stringify({ images, variants, thumbs }, null, 2));
console.log(`${images.length} obras maestras, ${Object.keys(variants).length} con variantes modernas (WebP/AVIF), ${Object.keys(thumbs).length} miniaturas en manifest.json`);

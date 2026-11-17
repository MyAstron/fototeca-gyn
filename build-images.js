/**
 * Pipeline de Optimización de Imágenes para Fototeca Gris y Negro
 * Genera variantes modernas de alta compresión (WebP y AVIF) a partir de los originales raster (JPG/PNG).
 * 
 * Uso:
 *   node build-images.js
 * 
 * Requisitos del sistema:
 *   - ImageMagick (`convert`) o `ffmpeg` para WebP
 *   - `ffmpeg` (con soporte libsvtav1 o libaom) para AVIF
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const IMG_DIR = path.join(ROOT, "src", "img");

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const HAS_CONVERT = hasCommand("convert");
const HAS_FFMPEG = hasCommand("ffmpeg");

function formatKb(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

function pctSaved(orig, next) {
  return ((1 - next / orig) * 100).toFixed(1) + "%";
}

function buildWebp(input, output) {
  if (HAS_CONVERT) {
    execSync(`convert "${input}" -quality 82 -define webp:method=6 "${output}"`, { stdio: "ignore" });
    return true;
  } else if (HAS_FFMPEG) {
    execSync(`ffmpeg -y -i "${input}" -c:v libwebp -quality 82 "${output}"`, { stdio: "ignore" });
    return true;
  }
  return false;
}

function buildAvif(input, output) {
  if (!HAS_FFMPEG) return false;
  try {
    // libsvtav1 con padding a dimensiones pares si es necesario
    execSync(`ffmpeg -y -i "${input}" -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libsvtav1 -crf 32 -preset 8 "${output}"`, { stdio: "ignore" });
    return true;
  } catch (e) {
    try {
      execSync(`ffmpeg -y -i "${input}" -c:v libaom-av1 -crf 34 -b:v 0 -still-picture 1 "${output}"`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

function main() {
  console.log("=== Pipeline de Optimización de Imágenes: Fototeca Gris y Negro ===");
  console.log(`Herramientas detectadas: convert=${HAS_CONVERT ? "OK" : "NO"}, ffmpeg=${HAS_FFMPEG ? "OK" : "NO"}`);

  if (!fs.existsSync(IMG_DIR)) {
    console.error(`Directorio no encontrado: ${IMG_DIR}`);
    process.exit(1);
  }

  // Filtrar originales raster (excluyendo derivados .webp, .avif y .svg)
  const files = fs.readdirSync(IMG_DIR)
    .filter(f => /\.(jpe?g|png)$/i.test(f) && !f.startsWith("."))
    .sort();

  if (files.length === 0) {
    console.log("No se encontraron imágenes JPG/PNG para optimizar.");
    return;
  }

  let totalOrig = 0;
  let totalWebp = 0;
  let totalAvif = 0;

  console.log("\nProcesando imágenes maestras...");
  console.log("---------------------------------------------------------------------------------");
  console.log("Archivo                Original     WebP (Ahorro)          AVIF (Ahorro)");
  console.log("---------------------------------------------------------------------------------");

  for (const file of files) {
    const inPath = path.join(IMG_DIR, file);
    const base = file.replace(/\.[^.]+$/, "");
    const origSize = fs.statSync(inPath).size;
    totalOrig += origSize;

    // Generar WebP
    const webpPath = path.join(IMG_DIR, base + ".webp");
    let webpCol = "N/A";
    if (buildWebp(inPath, webpPath)) {
      const webpSize = fs.statSync(webpPath).size;
      totalWebp += webpSize;
      webpCol = `${formatKb(webpSize).padEnd(10)} (-${pctSaved(origSize, webpSize)})`;
    }

    // Generar AVIF
    const avifPath = path.join(IMG_DIR, base + ".avif");
    let avifCol = "N/A";
    if (buildAvif(inPath, avifPath)) {
      const avifSize = fs.statSync(avifPath).size;
      totalAvif += avifSize;
      avifCol = `${formatKb(avifSize).padEnd(10)} (-${pctSaved(origSize, avifSize)})`;
    }

    console.log(`${file.padEnd(22)} ${formatKb(origSize).padEnd(12)} ${webpCol.padEnd(22)} ${avifCol}`);
  }

  console.log("---------------------------------------------------------------------------------");
  console.log(`TOTAL ORIGINAL:        ${formatKb(totalOrig)}`);
  if (totalWebp > 0) {
    console.log(`TOTAL WEBP:            ${formatKb(totalWebp)} (Ahorro global: -${pctSaved(totalOrig, totalWebp)})`);
  }
  if (totalAvif > 0) {
    console.log(`TOTAL AVIF:            ${formatKb(totalAvif)} (Ahorro global: -${pctSaved(totalOrig, totalAvif)})`);
  }
  console.log("=================================================================================\n");
}

main();

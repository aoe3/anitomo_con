#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, "src", "assets", "logos_unformatted");
const OUTPUT_DIR = path.join(ROOT, "src", "assets", "logos_formatted");
const TARGET_SIZE = 128;
const TARGET_COUNT = 117;

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
  ".gif",
]);

function padNumber(n, width = 3) {
  return String(n).padStart(width, "0");
}

async function ensureCleanOutputDir(dir) {
  await fs.promises.rm(dir, { recursive: true, force: true });
  await fs.promises.mkdir(dir, { recursive: true });
}

async function getInputFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function formatLogo(inputPath, outputPath) {
  const image = sharp(inputPath, { failOn: "none" });
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${inputPath}`);
  }

  const squareSize = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - squareSize) / 2);
  const top = Math.floor((metadata.height - squareSize) / 2);

  await image
    .extract({
      left,
      top,
      width: squareSize,
      height: squareSize,
    })
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .webp({
      quality: 90,
      effort: 4,
    })
    .toFile(outputPath);
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    throw new Error(`Input directory not found: ${INPUT_DIR}`);
  }

  const inputFiles = await getInputFiles(INPUT_DIR);

  if (inputFiles.length === 0) {
    throw new Error(`No supported image files found in: ${INPUT_DIR}`);
  }

  await ensureCleanOutputDir(OUTPUT_DIR);

  let created = 0;

  for (let i = 0; i < TARGET_COUNT; i++) {
    const sourceName = inputFiles[i % inputFiles.length];
    const sourcePath = path.join(INPUT_DIR, sourceName);

    const outputName = `vendor_logo_${padNumber(i + 1)}.webp`;
    const outputPath = path.join(OUTPUT_DIR, outputName);

    await formatLogo(sourcePath, outputPath);
    created += 1;

    console.log(
      `[${created}/${TARGET_COUNT}] ${sourceName} -> ${outputName}`
    );
  }

  console.log(`Done. Created ${created} formatted logos in:`);
  console.log(OUTPUT_DIR);
}

main().catch((err) => {
  console.error("Logo formatting failed:");
  console.error(err.message || err);
  process.exit(1);
});
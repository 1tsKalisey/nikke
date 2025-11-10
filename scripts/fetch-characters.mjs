#!/usr/bin/env node
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REMOTE_DATA_URL = 'https://nikke.gg/api/characters';
const REMOTE_PAGE_URL = 'https://nikke.gg/characters';
const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/nikke-characters.json');

async function main() {
  const { fromFile } = parseArgs(process.argv.slice(2));

  let characters = null;

  try {
    characters = await fetchFromApi();
  } catch (error) {
    console.warn(`No fue posible usar la API directa (${error.message}). Se intentará extraer los datos del sitio.`);
  }

  if (!characters) {
    try {
      characters = await scrapeFromSite({ fromFile });
    } catch (error) {
      throw new Error(`No se pudo extraer la información desde nikke.gg: ${error.message}`);
    }
  }

  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error('No se encontraron personajes en las fuentes disponibles.');
  }

  await mkdir(resolve(OUTPUT_PATH, '..'), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(characters, null, 2), 'utf8');
  console.log(`Se guardaron ${characters.length} personajes en ${OUTPUT_PATH}`);
}

async function fetchFromApi() {
  console.log(`Descargando datos de ${REMOTE_DATA_URL}...`);
  const response = await fetch(REMOTE_DATA_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': defaultUserAgent(),
      Referer: REMOTE_PAGE_URL
    }
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('La respuesta no es un arreglo de personajes.');
  }

  return data;
}

async function scrapeFromSite({ fromFile }) {
  const sourceDescription = fromFile ? `archivo local (${fromFile})` : `sitio ${REMOTE_PAGE_URL}`;
  console.log(`Intentando leer datos desde ${sourceDescription}...`);
  const html = fromFile ? await readFile(resolveCwd(fromFile), 'utf8') : await downloadPage();

  const nextDataJson = extractNextData(html);
  if (!nextDataJson) {
    throw new Error('No se encontró el bloque __NEXT_DATA__ en el HTML.');
  }

  let nextData;
  try {
    nextData = JSON.parse(nextDataJson);
  } catch (error) {
    throw new Error(`No fue posible interpretar los datos de Next.js: ${error.message}`);
  }

  const characters = findCharacterArray(nextData);
  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error('No se pudo localizar el arreglo de personajes en el documento.');
  }

  return characters;
}

async function downloadPage() {
  const response = await fetch(REMOTE_PAGE_URL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'User-Agent': defaultUserAgent()
    }
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  return response.text();
}

function extractNextData(html) {
  const scriptRegex = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>(.*?)<\/script>/s;
  const match = scriptRegex.exec(html);
  return match?.[1]?.trim() ?? null;
}

function findCharacterArray(root) {
  if (!root || typeof root !== 'object') {
    return null;
  }

  if (Array.isArray(root)) {
    if (root.length > 0 && root.every(isCharacterLike)) {
      return root;
    }
    for (const item of root) {
      const nested = findCharacterArray(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  for (const value of Object.values(root)) {
    const nested = findCharacterArray(value);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function isCharacterLike(entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const normalizedKeys = Object.keys(entry).map((key) => key.toLowerCase());
  const hints = ['nikkename', 'name', 'code', 'burst', 'manufacturer'];
  const matches = hints.filter((hint) => normalizedKeys.some((key) => key.includes(hint)));
  return matches.length >= 2;
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--from-file') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('La opción --from-file requiere una ruta.');
      }
      options.fromFile = value;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Uso: node scripts/fetch-characters.mjs [opciones]\n\nOpciones:\n  --from-file <ruta>  Usa un archivo HTML previamente descargado de nikke.gg/characters.\n  -h, --help          Muestra esta ayuda.`);
}

function defaultUserAgent() {
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36';
}

function resolveCwd(targetPath) {
  return resolve(process.cwd(), targetPath);
}

main().catch((error) => {
  console.error('No se pudo completar la descarga:', error.message);
  process.exitCode = 1;
});

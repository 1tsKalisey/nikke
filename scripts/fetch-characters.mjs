#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const REMOTE_DATA_URL = 'https://nikke.gg/api/characters';
const REMOTE_PAGE_URL = 'https://nikke.gg/characters';
const REMOTE_DETAIL_API_URL = 'https://nikke.gg/api/characters';
const REMOTE_DETAIL_PAGE_URL = 'https://nikke.gg/characters';
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_DELAY = 250;

const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../public/data/nikke-characters.json'
);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const {
    fromFile,
    detailsFrom,
    output = OUTPUT_PATH,
    concurrency = DEFAULT_CONCURRENCY,
    delay = DEFAULT_DELAY,
    pretty = true
  } = options;

  const list = await obtainCharacterList({ fromFile });
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('No se encontraron personajes en las fuentes disponibles.');
  }

  const enriched = await mapWithConcurrency(
    list,
    Number(concurrency) || DEFAULT_CONCURRENCY,
    async (entry, index) => {
      const slug = resolveSlug(entry);
      if (!slug) {
        console.warn(`No se pudo determinar el slug del personaje en posición ${index}. Se omite.`);
        return null;
      }

      const rawDetail = await obtainCharacterDetail({ entry, slug, detailsFrom, delay: Number(delay) || 0 });
      if (!rawDetail) {
        console.warn(`No se pudo obtener la información detallada de ${slug}. Se omite.`);
        return null;
      }

      const normalized = normalizeCharacter(rawDetail, entry, slug);
      if (!normalized) {
        console.warn(`No fue posible normalizar los datos de ${slug}. Se omite.`);
        return null;
      }

      return normalized;
    }
  );

  const filtered = enriched.filter(Boolean);
  if (filtered.length === 0) {
    throw new Error('No se pudieron procesar personajes.');
  }

  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(filtered, null, pretty ? 2 : 0), 'utf8');
  console.log(`Se guardaron ${filtered.length} personajes en ${output}`);
}

async function obtainCharacterList({ fromFile }) {
  let list = null;

  try {
    list = await fetchFromApi(REMOTE_DATA_URL);
  } catch (error) {
    console.warn(`No fue posible usar la API directa (${error.message}).`);
  }

  if (!list) {
    const html = fromFile
      ? await readFile(resolveCwd(fromFile), 'utf8')
      : await downloadPage(REMOTE_PAGE_URL);
    list = extractCharacterArray(html);
  }

  return Array.isArray(list) ? list : [];
}

async function obtainCharacterDetail({ entry, slug, detailsFrom, delay }) {
  const localDetail = detailsFrom ? await tryReadLocalDetail(detailsFrom, slug) : null;
  if (localDetail) {
    return localDetail;
  }

  let detail = null;
  try {
    detail = await fetchFromApi(`${REMOTE_DETAIL_API_URL}/${encodeURIComponent(slug)}`);
    detail = ensureCharacterDetail(detail);
  } catch (error) {
    if (!/404/.test(error.message)) {
      console.warn(`Fallo el endpoint de API detallada para ${slug}: ${error.message}`);
    }
  }

  if (!detail) {
    try {
      const pageHtml = await downloadPage(`${REMOTE_DETAIL_PAGE_URL}/${encodeURIComponent(slug)}`);
      detail = extractCharacterDetailFromHtml(pageHtml);
    } catch (error) {
      console.warn(`No se pudo extraer detalle HTML de ${slug}: ${error.message}`);
    }
  }

  if (!detail) {
    return null;
  }

  if (delay) {
    await sleep(delay);
  }

  return detail;
}

async function tryReadLocalDetail(baseDir, slug) {
  const normalizedSlug = slug.toLowerCase();
  const possible = [
    join(baseDir, `${normalizedSlug}.json`),
    join(baseDir, `${normalizedSlug}.html`),
    join(baseDir, `${normalizedSlug}.txt`)
  ];

  for (const candidate of possible) {
    try {
      const fileInfo = await stat(resolveCwd(candidate));
      if (!fileInfo.isFile()) {
        continue;
      }

      if (candidate.endsWith('.json')) {
        const raw = await readFile(resolveCwd(candidate), 'utf8');
        return ensureCharacterDetail(JSON.parse(raw));
      }

      const html = await readFile(resolveCwd(candidate), 'utf8');
      return extractCharacterDetailFromHtml(html);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`No se pudo leer ${candidate}: ${error.message}`);
      }
    }
  }

  return null;
}

async function fetchFromApi(url) {
  console.log(`Descargando datos de ${url}...`);
  const response = await fetch(url, {

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

  return data;
}

async function downloadPage(url) {
  console.log(`Descargando HTML de ${url}...`);
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'User-Agent': defaultUserAgent(),
      Referer: REMOTE_PAGE_URL
    }
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  return response.text();
}

function extractCharacterArray(html) {

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


function extractCharacterDetailFromHtml(html) {
  const nextDataJson = extractNextData(html);
  if (!nextDataJson) {
    throw new Error('El detalle no contiene __NEXT_DATA__.');
  }

  let nextData;
  try {
    nextData = JSON.parse(nextDataJson);
  } catch (error) {
    throw new Error(`No fue posible interpretar el detalle de Next.js: ${error.message}`);
  }

  const detail = ensureCharacterDetail(nextData);
  if (!detail) {
    throw new Error('No se encontró el objeto del personaje.');
  }

  return detail;
}

function ensureCharacterDetail(value) {
  if (!value) {
    return null;
  }
  if (isCharacterLike(value)) {
    return value;
  }
  return findCharacterObject(value);

}

function extractNextData(html) {
  const scriptRegex = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>(.*?)<\/script>/s;
  const match = scriptRegex.exec(html);
  return match?.[1]?.trim() ?? null;
}

function findCharacterArray(root) {

  return findMatchingNode(root, (value) =>
    Array.isArray(value) && value.length > 0 && value.every(isCharacterLike)
  );
}

function findCharacterObject(root) {
  return findMatchingNode(root, (value) => isCharacterLike(value));
}

function findMatchingNode(root, predicate) {
  const queue = [root];
  const seen = new Set();
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') {
      continue;
    }
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);

    if (predicate(node)) {
      return node;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        queue.push(item);
      }
    } else {
      for (const value of Object.values(node)) {
        queue.push(value);
      }
    }
  }

  return null;
}

function isCharacterLike(entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const keys = Object.keys(entry).map((key) => key.toLowerCase());
  const hints = ['nikkename', 'name', 'code', 'burst', 'manufacturer'];
  const matches = hints.filter((hint) => keys.some((key) => key.includes(hint)));
  return matches.length >= 2;
}

function resolveSlug(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const directKeys = ['slug', 'path', 'url', 'link'];
  for (const key of directKeys) {
    const value = pickValue(entry, key);
    if (typeof value === 'string' && value.trim()) {
      return cleanupSlug(value);
    }
  }

  const byName = pickValue(entry, 'nikkeName') || pickValue(entry, 'name');
  if (typeof byName === 'string' && byName.trim()) {
    return cleanupSlug(byName);
  }

  return null;
}

function cleanupSlug(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1];
    } catch (error) {
      return null;
    }
  }

  return trimmed
    .toLowerCase()
    .replace(/^characters\//, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-');
}

function normalizeCharacter(detail, listEntry, slug) {
  const base = listEntry && typeof listEntry === 'object' ? listEntry : {};
  const stats = findMatchingNode(detail, (value) => isStatsObject(value));
  const skillCollections = collectSkillEntries(detail);

  const normalized = {
    slug,
    nikkeName: pickFirst(detail, base, ['nikkeName', 'name', 'displayName']),
    class: pickFirst(detail, base, ['class', 'type', 'classType']),
    code: pickFirst(detail, base, ['code', 'nikkeCode']),
    burst: pickFirst(detail, base, ['burst', 'burstType']),
    buffs: toArray(pickFirst(detail, base, ['buffs', 'buff'])),
    weapon: pickFirst(detail, base, ['weapon', 'weaponType']),
    avatar: pickFirst(detail, base, ['avatar', 'icon', 'image']),
    role: pickFirst(detail, base, ['role']),
    roleSimple: pickFirst(detail, base, ['roleSimple', 'simpleRole', 'roleShort']),
    specialBuff: pickFirst(detail, base, ['specialBuff', 'uniqueSkill']),
    specialBuffCondition: pickFirst(detail, base, ['specialBuffCondition']),
    specialBuff2: pickFirst(detail, base, ['specialBuff2']),
    specialBuff2Condition: pickFirst(detail, base, ['specialBuff2Condition']),
    debuffs: toArray(pickFirst(detail, base, ['debuffs', 'debuff'])),
    synergyConstant: pickFirst(detail, base, ['synergyConstant', 'synergy']),
    burstCooldown: pickFirst(detail, base, ['burstCooldown', 'burstCooldownSeconds']),
    burstCooldownAlt: pickFirst(detail, base, ['burstCooldown2', 'burstCooldownAlt', 'burstCooldownAuto']),
    skills: normalizeSkills(skillCollections),
    altName: pickFirst(detail, base, ['altName', 'fullName', 'alias']),
    rarity: pickFirst(detail, base, ['rarity']),
    manufacturer: pickFirst(detail, base, ['manufacturer', 'company']),
    squad: pickFirst(detail, base, ['squad', 'group']),
    type: pickFirst(detail, base, ['type', 'classType']),
    element: pickFirst(detail, base, ['element', 'codeElement']),
    burstType: pickFirst(detail, base, ['burstType', 'burst']),
    power: pickFirst(stats, null, ['power']),
    hp: pickFirst(stats, null, ['hp', 'health']),
    atk: pickFirst(stats, null, ['atk', 'attack']),
    def: pickFirst(stats, null, ['def', 'defense']),
    weaponType: pickFirst(detail, base, ['weaponType', 'gunType']),
    ammo: pickFirst(detail, base, ['ammo', 'magazine']),
    atkPerHit: pickFirst(detail, base, ['atkPerHit', 'damagePerHit']),
    fullMagazineDamage: pickFirst(detail, base, ['fullMagazineDamage', 'fullMagazineDamageValue']),
    chargeTime: pickFirst(detail, base, ['chargeTime']),
    fullChargeMagnitude: pickFirst(detail, base, ['fullChargeMagnitude']),
    fullChargeTotalDamage: pickFirst(detail, base, ['fullChargeTotalDamage']),
    totalDualWieldingDamage: pickFirst(detail, base, ['totalDualWieldingDamage']),
    coreDamage: pickFirst(detail, base, ['coreDamage']),
    reloadTime: pickFirst(detail, base, ['reloadTime']),
    controlMode: pickFirst(detail, base, ['controlMode'])
  };

  return normalized;
}

function isStatsObject(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return false;
  }
  const keys = Object.keys(entry).map((key) => key.toLowerCase());
  const required = ['power', 'hp', 'atk', 'def'];
  return required.every((hint) => keys.some((key) => key.includes(hint)));
}

function collectSkillEntries(root) {
  const result = [];
  traverse(root, (value) => {
    if (Array.isArray(value) && value.length > 0 && value.every(isSkillLike)) {
      result.push(value);
    }
  });
  return result;
}

function isSkillLike(entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }
  const keys = Object.keys(entry).map((key) => key.toLowerCase());
  const hints = ['skill', 'cooldown', 'trigger'];
  return hints.some((hint) => keys.some((key) => key.includes(hint)));
}

function normalizeSkills(collections) {
  for (const collection of collections) {
    const normalized = collection.map((skill) => ({
      skillName: pickValue(skill, 'skillName') || pickValue(skill, 'name'),
      skillRank: pickValue(skill, 'skillRank') || pickValue(skill, 'rank'),
      type: pickValue(skill, 'type'),
      cooldown: pickValue(skill, 'cooldown'),
      trigger: pickValue(skill, 'trigger'),
      triggerQuantity: pickValue(skill, 'triggerQuantity') || pickValue(skill, 'triggerCount'),
      effect: pickValue(skill, 'effect') || pickValue(skill, 'description'),
      magnitude: pickValue(skill, 'magnitude'),
      maxStacks: pickValue(skill, 'maxStacks') || pickValue(skill, 'maxStack'),
      magnitudeProperty: pickValue(skill, 'magnitudeProperty'),
      target: pickValue(skill, 'target'),
      targetCondition: pickValue(skill, 'targetCondition'),
      casterCondition: pickValue(skill, 'casterCondition'),
      duration: pickValue(skill, 'duration')
    }));

    const meaningful = normalized.filter((item) => Object.values(item).some(Boolean));
    if (meaningful.length > 0) {
      return meaningful;
    }
  }

  return [];
}

function pickFirst(detail, fallback, keys) {
  for (const key of keys) {
    const value = pickValue(detail, key);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
    const fallbackValue = fallback && pickValue(fallback, key);
    if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '') {
      return fallbackValue;
    }
  }
  return null;
}

function pickValue(object, key) {
  if (!object || typeof object !== 'object') {
    return null;
  }

  const direct = Object.keys(object).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  if (direct) {
    return object[direct];
  }

  const queue = [object];
  const seen = new Set();
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') {
      continue;
    }
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);

    if (!Array.isArray(node)) {
      for (const [candidateKey, value] of Object.entries(node)) {
        if (candidateKey.toLowerCase() === key.toLowerCase()) {
          return value;
        }
        if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    } else {
      for (const value of node) {
        if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }
  }

  return null;
}

function toArray(value) {
  if (!value && value !== 0) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

async function mapWithConcurrency(items, limit, iteratee) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) {
        return;
      }
      results[current] = await iteratee(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit || 1) }, () => worker());
  await Promise.all(workers);
  return results;
}

function traverse(root, visitor) {
  const queue = [root];
  const seen = new Set();
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') {
      continue;
    }
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);

    visitor(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        queue.push(item);
      }
    } else {
      for (const value of Object.values(node)) {
        queue.push(value);
      }
    }
  }
}

function parseArgs(argv) {
  const options = { pretty: true };


  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--from-file') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('La opción --from-file requiere una ruta.');
      }
      options.fromFile = value;
      index += 1;

    } else if (token === '--details-from') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('La opción --details-from requiere una carpeta.');
      }
      options.detailsFrom = value;
      index += 1;
    } else if (token === '--output') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('La opción --output requiere una ruta.');
      }
      options.output = resolveCwd(value);
      index += 1;
    } else if (token === '--concurrency') {
      const value = parseInt(argv[index + 1], 10);
      if (Number.isNaN(value) || value <= 0) {
        throw new Error('La opción --concurrency requiere un número mayor a 0.');
      }
      options.concurrency = value;
      index += 1;
    } else if (token === '--delay') {
      const value = parseInt(argv[index + 1], 10);
      if (Number.isNaN(value) || value < 0) {
        throw new Error('La opción --delay requiere un número mayor o igual a 0.');
      }
      options.delay = value;
      index += 1;
    } else if (token === '--compact') {
      options.pretty = false;

    } else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {

  console.log(`Uso: node scripts/fetch-characters.mjs [opciones]\n\n` +
    `Opciones:\n` +
    `  --from-file <ruta>       Usa un archivo HTML previamente descargado de nikke.gg/characters.\n` +
    `  --details-from <carpeta> Toma archivos HTML o JSON de detalle por slug desde una carpeta.\n` +
    `  --output <ruta>          Ruta de salida para el JSON generado.\n` +
    `  --concurrency <n>        Número de descargas concurrentes (predeterminado ${DEFAULT_CONCURRENCY}).\n` +
    `  --delay <ms>             Retraso opcional entre descargas (en milisegundos).\n` +
    `  --compact                Genera el archivo sin formato legible.\n` +
    `  -h, --help               Muestra esta ayuda.\n`);
}

function defaultUserAgent() {
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, como Gecko) Chrome/127 Safari/537.36';

}

function resolveCwd(targetPath) {
  return resolve(process.cwd(), targetPath);
}


async function sleep(ms) {
  if (!ms) {
    return;
  }
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}


main().catch((error) => {
  console.error('No se pudo completar la descarga:', error.message);
  process.exitCode = 1;
});

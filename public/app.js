const REMOTE_DATA_URL = 'https://nikke.gg/api/characters';
const LOCAL_OVERRIDE_URL = './data/nikke-characters.json';
const FALLBACK_DATA_URL = './data/sample-characters.json';
const MAX_TEAM_SIZE = 5;

const GENERAL_FIELDS = [
  { id: 'nikkeName', label: 'Nikke Name', hints: ['nikkename', 'name'], directKeys: ['nikkeName', 'name'] },
  { id: 'class', label: 'Class', hints: ['class'], directKeys: ['class'] },
  { id: 'code', label: 'Code', hints: ['code'], directKeys: ['code'] },
  { id: 'burst', label: 'Burst', hints: ['burst'], directKeys: ['burst', 'burstType'] },
  { id: 'buffs', label: 'Buffs', hints: ['buffs', 'buff'], directKeys: ['buffs'] },
  { id: 'weapon', label: 'Weapon', hints: ['weapon'], directKeys: ['weapon', 'weaponType'] },
  { id: 'avatar', label: 'Avatar', hints: ['avatar', 'icon', 'image'], directKeys: ['avatar', 'icon', 'image'] },
  { id: 'role', label: 'Role', hints: ['role'], directKeys: ['role'] },
  { id: 'roleSimple', label: 'Role (simple)', hints: ['rolesimple', 'simplerole'] },
  { id: 'specialBuff', label: 'Special Buff', hints: ['specialbuff'], directKeys: ['specialBuff'] },
  { id: 'specialBuffCondition', label: 'Condition', hints: ['specialbuffcondition', 'condition'], directKeys: ['specialBuffCondition'] },
  { id: 'specialBuff2', label: 'Special Buff 2', hints: ['specialbuff2'], directKeys: ['specialBuff2'] },
  { id: 'specialBuff2Condition', label: 'Condition', hints: ['specialbuff2condition', 'condition'], directKeys: ['specialBuff2Condition'] },
  { id: 'debuffs', label: 'Debuffs', hints: ['debuff'], directKeys: ['debuffs'] },
  { id: 'synergyConstant', label: 'Synergy Constant', hints: ['synergy'], directKeys: ['synergyConstant'] },
  { id: 'burstCooldown', label: 'Burst Cooldown', hints: ['burstcooldown'], directKeys: ['burstCooldown'] },
  { id: 'burstCooldownAlt', label: 'Burst Cooldown', hints: ['burstcooldown'], directKeys: ['burstCooldown2', 'burstCooldownAlt'] },
  { id: 'skills', label: 'Skills', hints: ['skills'], extractor: extractSkillNames },
  { id: 'altName', label: 'Name', hints: ['alias', 'fullname'], directKeys: ['displayName', 'fullName'] },
  { id: 'rarity', label: 'Rarity', hints: ['rarity'], directKeys: ['rarity'] },
  { id: 'manufacturer', label: 'Manufacturer', hints: ['manufacturer'], directKeys: ['manufacturer'] },
  { id: 'squad', label: 'Squad', hints: ['squad', 'company'], directKeys: ['squad'] },
  { id: 'type', label: 'Type', hints: ['type'], directKeys: ['type'] },
  { id: 'element', label: 'Element', hints: ['element'], directKeys: ['element'] },
  { id: 'burstType', label: 'Burst type', hints: ['bursttype'], directKeys: ['burstType'] },
  { id: 'power', label: 'Power', hints: ['power'], directKeys: ['power'] },
  { id: 'hp', label: 'HP', hints: ['hp', 'health'], directKeys: ['hp'] },
  { id: 'atk', label: 'ATK', hints: ['atk', 'attack'], directKeys: ['atk'] },
  { id: 'def', label: 'DEF', hints: ['def', 'defense'], directKeys: ['def'] },
  { id: 'weaponType', label: 'Weapon type', hints: ['weapontype'], directKeys: ['weaponType'] },
  { id: 'ammo', label: 'Ammo', hints: ['ammo'], directKeys: ['ammo'] },
  { id: 'atkPerHit', label: 'ATK per hit', hints: ['atkperhit', 'damageperhit'] },
  { id: 'fullMagazineDamage', label: 'Full magazine damage', hints: ['fullmagazine'] },
  { id: 'chargeTime', label: 'Charge time', hints: ['chargetime'] },
  { id: 'fullChargeMagnitude', label: 'Full Charge Magnitude', hints: ['fullchargemagnitude'] },
  { id: 'fullChargeTotalDamage', label: 'Full charge total damage', hints: ['fullchargetotaldamage'] },
  { id: 'totalDualWieldingDamage', label: 'Total dual wielding damage', hints: ['dualwield', 'dualwielding'] },
  { id: 'coreDamage', label: 'Core damage', hints: ['coredamage'] },
  { id: 'reloadTime', label: 'Reload Time', hints: ['reloadtime'] },
  { id: 'controlMode', label: 'Control Mode', hints: ['controlmode'] }
];

const SKILL_FIELDS = [
  { id: 'skillName', label: 'Skill Name', hints: ['skillname', 'name'], directKeys: ['skillName', 'name'] },
  { id: 'skillRank', label: 'Skill Rank', hints: ['skillrank', 'rank'], directKeys: ['skillRank', 'rank'] },
  { id: 'type', label: 'Type', hints: ['type'] },
  { id: 'cooldown', label: 'Cooldown', hints: ['cooldown'] },
  { id: 'trigger', label: 'Trigger', hints: ['trigger'] },
  { id: 'triggerQuantity', label: 'Trigger quantity', hints: ['triggerquantity', 'triggercount'] },
  { id: 'effect', label: 'Effect', hints: ['effect'] },
  { id: 'magnitude', label: 'Magnitude', hints: ['magnitude'] },
  { id: 'maxStacks', label: 'Max number of stacks', hints: ['maxstack', 'stacks'] },
  { id: 'magnitudeProperty', label: 'Magnitude property', hints: ['magnitudeproperty'] },
  { id: 'target', label: 'Target', hints: ['target'] },
  { id: 'targetCondition', label: 'Target condition', hints: ['targetcondition'] },
  { id: 'casterCondition', label: 'Caster condition', hints: ['castercondition'] },
  { id: 'duration', label: 'Duration', hints: ['duration'] }
];

const FILTER_FIELDS = [
  { id: 'class', label: 'Clase', fieldId: 'class' },
  { id: 'role', label: 'Rol', fieldId: 'roleSimple', fallback: 'role' },
  { id: 'element', label: 'Elemento', fieldId: 'element' },
  { id: 'burst', label: 'Burst', fieldId: 'burst' },
  { id: 'manufacturer', label: 'Manufacturer', fieldId: 'manufacturer' }
];

const SUMMARY_FIELDS = {
  power: 'power',
  hp: 'hp',
  atk: 'atk',
  def: 'def'
};

const state = {
  characters: [],
  filtered: [],
  selected: null,
  team: Array.from({ length: MAX_TEAM_SIZE }, () => null),
  filters: new Set()
};

const elements = {
  status: document.querySelector('.data-source'),
  search: document.getElementById('search'),
  filterTags: document.querySelector('.filter-tags'),
  catalog: document.querySelector('.catalog-grid'),
  teamSlots: document.querySelector('.team-slots'),
  teamSummary: document.querySelector('.team-summary'),
  teamReset: document.querySelector('.team-reset'),
  detailsPanel: document.querySelector('.details'),
  detailsContent: document.querySelector('.details-content'),
  detailsEmpty: document.querySelector('.details-empty'),
  detailsHeader: document.querySelector('.details-header'),
  detailsTable: document.querySelector('.details-table tbody'),
  skills: document.querySelector('.skills'),
  cardTemplate: document.getElementById('character-card'),
  skillTemplate: document.getElementById('skill-template')
};

init();

async function init() {
  let loaded = false;
  setStatus('Buscando datos locales...');

  const localOverride = await tryFetchJson(LOCAL_OVERRIDE_URL);
  if (localOverride?.length) {
    prepareCharacters(localOverride);
    setStatus(`Datos locales cargados (${state.characters.length} Nikkes).`);
    loaded = true;
  }

  if (!loaded) {
    setStatus('Cargando personajes desde nikke.gg...');
    try {
      const remote = await fetchJson(REMOTE_DATA_URL);
      if (!Array.isArray(remote)) {
        throw new Error('Respuesta inválida');
      }
      prepareCharacters(remote);
      setStatus(`Datos cargados desde nikke.gg · ${state.characters.length} Nikkes.`);
      loaded = true;
    } catch (error) {
      console.error('Error al obtener datos remotos', error);
    }
  }

  if (!loaded) {
    try {
      const fallback = await fetchJson(FALLBACK_DATA_URL);
      prepareCharacters(Array.isArray(fallback) ? fallback : []);
      setStatus('No fue posible contactar a nikke.gg. Datos de ejemplo locales cargados.');
      loaded = true;
    } catch (fallbackError) {
      console.error('No se pudo cargar la fuente local', fallbackError);
      prepareCharacters([]);
      setStatus('No se pudieron cargar datos de Nikkes.', true);
    }
  }

  elements.search?.addEventListener('input', debounce(applyFilters, 150));
  elements.teamReset?.addEventListener('click', () => {
    state.team.fill(null);
    renderTeamSlots();
    updateTeamSummary();
  });

  renderTeamSlots();
  applyFilters();
  renderFilters();
}

function prepareCharacters(rawCharacters) {
  state.characters = rawCharacters.map((raw, index) => createCharacterEntry(raw, index));
  state.filtered = [...state.characters];
}

function createCharacterEntry(raw, index) {
  const entries = flattenRecord(raw);
  const getValue = (def) => getValueFromRecord(raw, entries, def);
  const name = getValue({ directKeys: ['nikkeName', 'name'], hints: ['nikkename', 'name'] }) || `Nikke ${index + 1}`;
  const id = raw.id ?? raw.slug ?? raw.code ?? normalizeToken(name) || `nikke-${index}`;
  const avatar = getValue({ directKeys: ['avatar', 'icon', 'image'], hints: ['avatar', 'icon'] });
  const manufacturer = getValue({ directKeys: ['manufacturer'], hints: ['manufacturer'] });
  const squad = getValue({ directKeys: ['squad'], hints: ['squad'] });
  const searchText = buildSearchIndex(raw, entries, [name, manufacturer, squad]);
  return {
    raw,
    entries,
    id,
    name,
    avatar,
    manufacturer,
    squad,
    searchText
  };
}

function extractSkillNames(character) {
  const skills = extractSkills(character);
  if (!skills || !skills.length) return '';
  return skills
    .map((skill) => getValueFromRecord(skill, flattenRecord(skill), { directKeys: ['skillName', 'name'], hints: ['skillname', 'name'] }) || '')
    .filter(Boolean)
    .join(', ');
}

function fetchJson(url) {
  return fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }
    return response.json();
  });
}

async function tryFetchJson(url) {
  try {
    const data = await fetchJson(url);
    return Array.isArray(data) ? data : null;
  } catch (error) {
    if (!(error instanceof Error && /404/.test(error.message))) {
      console.warn(`No se pudo cargar ${url}:`, error.message || error);
    }
    return null;
  }
}

function renderTeamSlots() {
  elements.teamSlots.innerHTML = '';
  state.team.forEach((member, index) => {
    const slot = document.createElement('div');
    slot.className = 'team-slot';
    slot.dataset.index = index;
    if (member) {
      slot.classList.add('filled');
      const name = document.createElement('h3');
      name.textContent = member.name;
      slot.appendChild(name);

      const meta = document.createElement('p');
      const role = getFieldValue(member, 'role') || getFieldValue(member, 'roleSimple');
      const burst = getFieldValue(member, 'burst');
      meta.textContent = [role, burst].filter(Boolean).join(' · ');
      slot.appendChild(meta);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = 'Quitar';
      removeButton.addEventListener('click', () => {
        state.team[index] = null;
        renderTeamSlots();
        updateTeamSummary();
      });
      slot.appendChild(removeButton);
    } else {
      const placeholder = document.createElement('p');
      placeholder.textContent = 'Vacío';
      placeholder.className = 'team-slot-empty';
      slot.appendChild(placeholder);
    }
    elements.teamSlots.appendChild(slot);
  });
}

function renderFilters() {
  if (!elements.filterTags) return;
  const fragment = document.createDocumentFragment();
  FILTER_FIELDS.forEach((field) => {
    const uniqueValues = new Map();
    state.characters.forEach((character) => {
      const value = getFieldValue(character, field.fieldId) || (field.fallback ? getFieldValue(character, field.fallback) : null);
      if (!value) return;
      const values = Array.isArray(value) ? value : [value];
      values.forEach((v) => {
        const normalized = normalizeDisplayValue(v);
        if (normalized) {
          uniqueValues.set(normalized, v);
        }
      });
    });

    const sorted = Array.from(uniqueValues.values()).sort((a, b) => normalizeString(a).localeCompare(normalizeString(b)));
    sorted.forEach((value) => {
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'filter-tag';
      const id = `${field.fieldId}::${normalizeString(value)}`;
      tag.dataset.filterId = id;
      tag.textContent = `${field.label}: ${value}`;
      if (state.filters.has(id)) {
        tag.classList.add('active');
      }
      tag.addEventListener('click', () => {
        if (state.filters.has(id)) {
          state.filters.delete(id);
          tag.classList.remove('active');
        } else {
          state.filters.add(id);
          tag.classList.add('active');
        }
        applyFilters();
      });
      fragment.appendChild(tag);
    });
  });
  elements.filterTags.innerHTML = '';
  elements.filterTags.appendChild(fragment);
}

function applyFilters() {
  const query = normalizeString(elements.search?.value || '');
  state.filtered = state.characters.filter((character) => {
    if (query) {
      if (!character.searchText.includes(query)) {
        return false;
      }
    }
    for (const filterId of state.filters) {
      const [fieldKey, valueKey] = filterId.split('::');
      const rawValue = getFieldValue(character, fieldKey) || getFieldValue(character, FILTER_FIELDS.find((f) => f.fieldId === fieldKey)?.fallback);
      if (!matchesFilter(rawValue, valueKey)) {
        return false;
      }
    }
    return true;
  });
  renderCatalog();
}

function matchesFilter(value, expectedToken) {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.some((item) => normalizeString(item).includes(expectedToken));
  }
  return normalizeString(value).includes(expectedToken);
}

function renderCatalog() {
  if (!elements.catalog) return;
  elements.catalog.innerHTML = '';
  if (!state.filtered.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No se encontraron Nikkes con los filtros actuales.';
    empty.className = 'catalog-empty';
    elements.catalog.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.filtered.forEach((character) => {
    const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
    const avatar = card.querySelector('.character-avatar');
    const nameElement = card.querySelector('.character-name');
    const metaElement = card.querySelector('.character-meta');
    const statsList = card.querySelector('.character-stats');
    const addButton = card.querySelector('.character-add');

    if (avatar && character.avatar) {
      avatar.style.backgroundImage = `url(${character.avatar})`;
    }
    if (nameElement) {
      nameElement.textContent = character.name;
    }
    if (metaElement) {
      const rarity = getFieldValue(character, 'rarity');
      const manufacturer = character.manufacturer;
      const element = getFieldValue(character, 'element');
      metaElement.textContent = [rarity, manufacturer, element].filter(Boolean).join(' · ');
    }

    if (statsList) {
      statsList.innerHTML = '';
      const fields = ['role', 'burst', 'power', 'atk'];
      fields.forEach((fieldId) => {
        const value = getFieldValue(character, fieldId);
        if (!value) return;
        const dt = document.createElement('dt');
        dt.textContent = GENERAL_FIELDS.find((f) => f.id === fieldId)?.label ?? fieldId;
        const dd = document.createElement('dd');
        dd.textContent = formatValue(value);
        statsList.appendChild(dt);
        statsList.appendChild(dd);
      });
    }

    card.addEventListener('click', () => {
      selectCharacter(character);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCharacter(character);
      }
    });

    if (addButton) {
      addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        addToTeam(character);
      });
    }

    fragment.appendChild(card);
  });

  elements.catalog.appendChild(fragment);
}

function addToTeam(character) {
  const existsIndex = state.team.findIndex((member) => member && member.id === character.id);
  if (existsIndex !== -1) {
    setStatus(`${character.name} ya está en el equipo.`);
    return;
  }
  const emptyIndex = state.team.findIndex((member) => !member);
  if (emptyIndex === -1) {
    setStatus('El equipo ya está completo (5 Nikkes).');
    return;
  }
  state.team[emptyIndex] = character;
  renderTeamSlots();
  updateTeamSummary();
}

function selectCharacter(character) {
  state.selected = character;
  if (!elements.detailsContent || !elements.detailsHeader || !elements.detailsTable) return;
  elements.detailsEmpty.hidden = true;
  elements.detailsContent.hidden = false;

  elements.detailsHeader.innerHTML = '';
  const headerFragment = document.createDocumentFragment();

  if (character.avatar) {
    const img = document.createElement('img');
    img.src = character.avatar;
    img.alt = `Retrato de ${character.name}`;
    img.className = 'details-avatar';
    headerFragment.appendChild(img);
  }

  const title = document.createElement('h3');
  title.textContent = character.name;
  headerFragment.appendChild(title);

  const sub = document.createElement('p');
  const manufacturer = character.manufacturer || getFieldValue(character, 'manufacturer');
  const squad = character.squad || getFieldValue(character, 'squad');
  sub.textContent = [manufacturer, squad].filter(Boolean).join(' · ');
  headerFragment.appendChild(sub);

  elements.detailsHeader.appendChild(headerFragment);

  elements.detailsTable.innerHTML = '';
  GENERAL_FIELDS.forEach((field) => {
    const value = getFieldValue(character, field.id);
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return;
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = field.label;
    const td = document.createElement('td');
    if (field.id === 'avatar' && typeof value === 'string') {
      const link = document.createElement('a');
      link.href = value;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Ver avatar';
      td.appendChild(link);
    } else {
      td.textContent = formatValue(value);
    }
    tr.appendChild(th);
    tr.appendChild(td);
    elements.detailsTable.appendChild(tr);
  });

  renderSkills(character);
}

function renderSkills(character) {
  if (!elements.skills) return;
  elements.skills.innerHTML = '';
  const skills = extractSkills(character);
  if (!skills || !skills.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Este Nikke no tiene habilidades registradas en la fuente de datos.';
    empty.className = 'skills-empty';
    elements.skills.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  skills.forEach((skill, index) => {
    const card = elements.skillTemplate.content.firstElementChild.cloneNode(true);
    const nameElement = card.querySelector('.skill-name');
    const metaElement = card.querySelector('.skill-meta');
    const detailsList = card.querySelector('.skill-details');

    const skillEntries = flattenRecord(skill);
    const skillName = getValueFromRecord(skill, skillEntries, SKILL_FIELDS[0]) || `Habilidad ${index + 1}`;
    const skillType = getValueFromRecord(skill, skillEntries, SKILL_FIELDS.find((f) => f.id === 'type'));
    const skillCooldown = getValueFromRecord(skill, skillEntries, SKILL_FIELDS.find((f) => f.id === 'cooldown'));

    if (nameElement) {
      nameElement.textContent = skillName;
    }
    if (metaElement) {
      metaElement.textContent = [skillType, skillCooldown ? `CD: ${formatValue(skillCooldown)}` : null]
        .filter(Boolean)
        .join(' · ');
    }

    if (detailsList) {
      detailsList.innerHTML = '';
      SKILL_FIELDS.forEach((field) => {
        const value = getValueFromRecord(skill, skillEntries, field);
        if (!value || field.id === 'skillName' || field.id === 'type' || field.id === 'cooldown') return;
        const dt = document.createElement('dt');
        dt.textContent = field.label;
        const dd = document.createElement('dd');
        dd.textContent = formatValue(value);
        detailsList.appendChild(dt);
        detailsList.appendChild(dd);
      });
    }

    fragment.appendChild(card);
  });
  elements.skills.appendChild(fragment);
}

function extractSkills(character) {
  const raw = character.raw ?? character;
  const candidates = [];
  const directSkills = raw.skills ?? raw.Skills;
  if (Array.isArray(directSkills)) {
    return directSkills;
  }
  if (directSkills && typeof directSkills === 'object') {
    return Object.values(directSkills);
  }
  for (const [key, value] of Object.entries(raw)) {
    if (!/skill/i.test(key)) continue;
    if (Array.isArray(value)) {
      candidates.push(...value);
    } else if (value && typeof value === 'object') {
      candidates.push(...Object.values(value));
    }
  }
  return candidates.filter((item) => item && typeof item === 'object');
}

function updateTeamSummary() {
  const totals = { power: 0, hp: 0, atk: 0, def: 0 };
  state.team.forEach((member) => {
    if (!member) return;
    Object.entries(SUMMARY_FIELDS).forEach(([summaryKey, fieldId]) => {
      const rawValue = getFieldValue(member, fieldId);
      const numeric = toNumber(rawValue);
      if (!Number.isNaN(numeric)) {
        totals[summaryKey] += numeric;
      }
    });
  });

  Object.entries(totals).forEach(([key, value]) => {
    const element = elements.teamSummary.querySelector(`[data-summary="${key}"]`);
    if (element) {
      element.textContent = value ? new Intl.NumberFormat('es-ES').format(Math.round(value)) : '0';
    }
  });
}

function getFieldValue(character, fieldId) {
  const field = GENERAL_FIELDS.find((f) => f.id === fieldId) || { id: fieldId, label: fieldId };
  if (field.extractor) {
    try {
      return field.extractor(character);
    } catch (error) {
      console.warn('Extractor error', error);
    }
  }
  return getValueFromRecord(character.raw ?? character, character.entries ?? flattenRecord(character.raw ?? character), field);
}

function getValueFromRecord(raw, entries, fieldDef) {
  if (fieldDef.directKeys) {
    for (const key of fieldDef.directKeys) {
      if (raw && Object.prototype.hasOwnProperty.call(raw, key) && raw[key] != null) {
        return raw[key];
      }
    }
  }
  const normalizedHints = (fieldDef.hints || []).map(normalizeToken);
  let bestMatch = null;
  const sourceEntries = Array.isArray(entries) ? entries : flattenRecord(raw);
  sourceEntries.forEach((entry) => {
    if (entry.value == null || entry.value === '') return;
    const normPath = normalizeToken(entry.path);
    const normKey = normalizeToken(entry.key);
    let score = 0;
    normalizedHints.forEach((hint) => {
      if (!hint) return;
      if (normKey === hint) {
        score += 200;
      }
      if (normPath.endsWith(hint)) {
        score += 120;
      } else if (normPath.includes(hint)) {
        score += 80;
      }
    });
    if (score && entry.depth <= 2) {
      score += 20;
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { entry, score };
    }
  });
  return bestMatch ? bestMatch.entry.value : undefined;
}

function flattenRecord(value, path = [], depth = 0, acc = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenRecord(item, path.concat(index), depth + 1, acc);
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, val]) => {
      flattenRecord(val, path.concat(key), depth + 1, acc);
    });
  } else {
    acc.push({ path: path.join('.'), key: path[path.length - 1] ?? '', depth, value });
  }
  return acc;
}

function buildSearchIndex(raw, entries, additional = []) {
  const tokens = new Set();
  entries.forEach((entry) => {
    if (entry.value == null) return;
    if (typeof entry.value === 'number') {
      tokens.add(entry.value.toString());
    } else if (typeof entry.value === 'string') {
      tokens.add(entry.value);
    }
  });
  additional.forEach((value) => {
    if (value) tokens.add(value);
  });
  return Array.from(tokens)
    .map((token) => normalizeString(token))
    .filter(Boolean)
    .join(' ');
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }
  if (value instanceof Date) {
    return value.toLocaleString('es-ES');
  }
  if (typeof value === 'number') {
    return new Intl.NumberFormat('es-ES').format(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }
  if (value == null) {
    return '';
  }
  return String(value);
}

function normalizeString(value) {
  if (!value && value !== 0) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeToken(value) {
  if (!value && value !== 0) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeDisplayValue(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/\s+/g, ' ');
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return NaN;
  const numeric = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : NaN;
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function setStatus(message, isError = false) {
  if (!elements.status) return;
  elements.status.textContent = message;
  elements.status.classList.toggle('is-error', Boolean(isError));
}

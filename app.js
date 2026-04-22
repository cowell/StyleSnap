const STORAGE_KEY = 'ensemble-engine-items-v1';
const LEGACY_STORAGE_KEYS = ['closetmuse-items-v1', 'stylesnap-items-v1'];
const SAVED_OUTFITS_KEY = 'ensemble-engine-saved-outfits-v1';

const itemForm = document.getElementById('item-form');
const recommendationForm = document.getElementById('recommendation-form');
const itemsContainer = document.getElementById('items');
const emptyState = document.getElementById('empty-state');
const recommendationEl = document.getElementById('recommendation');
const previewModeEl = document.getElementById('preview-mode');
const saveOutfitBtn = document.getElementById('save-outfit-btn');
const savedOutfitsEl = document.getElementById('saved-outfits');
const filterSearchEl = document.getElementById('filter-search');
const filterCategoryEl = document.getElementById('filter-category');
const filterStyleEl = document.getElementById('filter-style');
const filterCleanEl = document.getElementById('filter-clean');
const EMPTY_IMAGE_DATA_URI =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const previewSlots = {
  top: {
    imageEl: document.getElementById('preview-top-image'),
    textEl: document.getElementById('preview-top-text'),
    emptyText: 'No top selected.'
  },
  bottom: {
    imageEl: document.getElementById('preview-bottom-image'),
    textEl: document.getElementById('preview-bottom-text'),
    emptyText: 'No bottom selected.'
  },
  footwear: {
    imageEl: document.getElementById('preview-footwear-image'),
    textEl: document.getElementById('preview-footwear-text'),
    emptyText: 'No shoes selected.'
  },
  accessory: {
    imageEl: document.getElementById('preview-accessory-image'),
    textEl: document.getElementById('preview-accessory-text'),
    emptyText: 'No accessory selected.'
  }
};

const colorFamilies = {
  red: ['red', 'burgundy', 'maroon', 'crimson'],
  blue: ['blue', 'navy', 'teal', 'cobalt'],
  green: ['green', 'olive', 'mint', 'sage'],
  yellow: ['yellow', 'mustard', 'gold'],
  purple: ['purple', 'violet', 'lavender'],
  brown: ['brown', 'tan', 'beige', 'camel', 'khaki'],
  black: ['black', 'charcoal'],
  white: ['white', 'cream', 'ivory'],
  gray: ['gray', 'grey', 'slate'],
  pink: ['pink', 'rose', 'fuchsia']
};

const complementaryFamilies = {
  red: ['blue', 'white', 'black', 'gray'],
  blue: ['white', 'brown', 'gray', 'black'],
  green: ['white', 'brown', 'black', 'gray'],
  yellow: ['blue', 'white', 'gray', 'black'],
  purple: ['white', 'gray', 'black'],
  brown: ['blue', 'green', 'white', 'black'],
  black: ['white', 'gray', 'red', 'blue'],
  white: ['black', 'blue', 'green', 'brown'],
  gray: ['black', 'white', 'blue', 'red'],
  pink: ['white', 'gray', 'black', 'blue']
};

let items = loadItems();
let savedOutfits = loadSavedOutfits();
let previewSelection = {
  top: null,
  bottom: null,
  footwear: null,
  accessory: null
};
let latestRecommendedOutfit = null;

renderItems();
renderPreview();
renderSavedOutfits();

renderItems();
renderPreview();

itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const item = {
    id: crypto.randomUUID(),
    name: getValue('name'),
    category: getValue('category'),
    color: getValue('color').toLowerCase(),
    season: getValue('season'),
    style: getValue('style'),
    isClean: document.getElementById('is-clean').checked,
    occasions: getValue('occasions')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    image: await readSelectedImage()
  };

  items.push(item);
  persistItems();
  renderItems();
  itemForm.reset();
  document.getElementById('is-clean').checked = true;
});

recommendationForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const occasion = getValue('target-occasion').toLowerCase();
  const season = getValue('target-season');
  const style = getValue('target-style');
  const cleanOnly = document.getElementById('clean-only').checked;

  const result = recommendOutfit({ occasion, season, style, cleanOnly });

  const result = recommendOutfit({ occasion, season, style });

  recommendationEl.classList.remove('empty');
  if (!result) {
    recommendationEl.textContent =
      'Not enough matching items yet. Add tops/bottoms (or a dress) in this style/season to get recommendations.';
    latestRecommendedOutfit = null;
    saveOutfitBtn.disabled = true;
    return;
  }

  recommendationEl.innerHTML = result.html;
  previewModeEl.textContent = 'Showing recommended outfit preview.';
  previewSelection = mapItemsToPreviewSlots([...result.main, ...result.extras]);
  latestRecommendedOutfit = result;
  saveOutfitBtn.disabled = false;
  renderPreview();
});

saveOutfitBtn.addEventListener('click', () => {
  if (!latestRecommendedOutfit) return;

  const saved = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    itemIds: [...latestRecommendedOutfit.main, ...latestRecommendedOutfit.extras].map((item) => item.id),
    summary: `${latestRecommendedOutfit.main.map((item) => item.name).join(' + ')}`
  };

  savedOutfits.unshift(saved);
  savedOutfits = savedOutfits.slice(0, 20);
  persistSavedOutfits();
  renderSavedOutfits();
});

[filterSearchEl, filterCategoryEl, filterStyleEl, filterCleanEl].forEach((element) => {
  element.addEventListener('input', renderItems);
  element.addEventListener('change', renderItems);
});

  renderPreview();
});

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function loadItems() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed.map((item) => ({
      ...item,
      isClean: item.isClean ?? true
    }));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadSavedOutfits() {
  try {
    const raw = localStorage.getItem(SAVED_OUTFITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedOutfits() {
  localStorage.setItem(SAVED_OUTFITS_KEY, JSON.stringify(savedOutfits));
}

function renderItems() {
  itemsContainer.innerHTML = '';
  const filteredItems = items.filter((item) => {
    const search = filterSearchEl.value.trim().toLowerCase();
    const category = filterCategoryEl.value;
    const style = filterStyleEl.value;
    const clean = filterCleanEl.value;

    const matchesSearch =
      !search || item.name.toLowerCase().includes(search) || item.color.toLowerCase().includes(search);
    const matchesCategory = !category || item.category === category;
    const matchesStyle = !style || item.style === style;
    const matchesClean =
      !clean || (clean === 'clean' && item.isClean) || (clean === 'laundry' && !item.isClean);

    return matchesSearch && matchesCategory && matchesStyle && matchesClean;
  });
  emptyState.style.display = filteredItems.length ? 'none' : 'block';

  for (const item of filteredItems) {
function renderItems() {
  itemsContainer.innerHTML = '';
  emptyState.style.display = items.length ? 'none' : 'block';

  for (const item of items) {
    const node = document.createElement('article');
    node.className = 'item';

    const tags = [item.category, item.style, item.season]
      .map((value) => `<span class="badge">${escapeHtml(value)}</span>`)
      .join('');

    node.innerHTML = `
      <img src="${item.image || EMPTY_IMAGE_DATA_URI}" alt="${escapeHtml(item.name)}" />
      <div class="item-content">
        <div class="item-title">${escapeHtml(item.name)}</div>
        <div>Color: ${escapeHtml(item.color)}</div>
        <div class="status-chip ${item.isClean ? 'status-clean' : 'status-laundry'}">
          ${item.isClean ? 'Clean' : 'Needs laundry'}
        </div>
        <div class="badges">${tags}</div>
        <div class="item-actions">
          <button class="preview-btn" data-id="${item.id}" type="button">Preview</button>
          <button class="delete-btn" data-id="${item.id}" type="button">Delete</button>
        </div>
        <button class="clean-toggle-btn" data-id="${item.id}" type="button">
          Mark as ${item.isClean ? 'Needs laundry' : 'Clean'}
        </button>
      </div>
    `;

    node.querySelector('.preview-btn').addEventListener('click', () => {
      previewModeEl.textContent = `Showing manual preview for: ${item.name}`;
      const slot = slotForCategory(item.category);
      previewSelection[slot] = item;
      renderPreview();
    });

    node.querySelector('.delete-btn').addEventListener('click', () => {
      items = items.filter((existingItem) => existingItem.id !== item.id);
      clearDeletedItemFromPreview(item.id);
      savedOutfits = savedOutfits.filter((outfit) => !outfit.itemIds.includes(item.id));
      persistItems();
      persistSavedOutfits();
      renderItems();
      renderPreview();
      renderSavedOutfits();
    });

    node.querySelector('.clean-toggle-btn').addEventListener('click', () => {
      item.isClean = !item.isClean;
      persistItems();
      renderItems();
      persistItems();
      renderItems();
      renderPreview();
    });

    itemsContainer.appendChild(node);
  }
}

function recommendOutfit({ occasion, season, style, cleanOnly }) {
function recommendOutfit({ occasion, season, style }) {
  const candidates = items.filter(
    (item) =>
      (item.season === 'all' || item.season === season) &&
      item.style === style &&
      (!cleanOnly || item.isClean) &&
      (item.occasions.length === 0 || item.occasions.includes(occasion))
  );

  const dresses = candidates.filter((item) => item.category === 'dress');
  if (dresses.length > 0) {
    const dress = dresses[0];
    const extras = pickExtras(candidates, dress.color);
    return {
      main: [dress],
      extras,
      html: renderRecommendation({ main: [dress], extras })
    };
  }

  const tops = candidates.filter((item) => item.category === 'top');
  const bottoms = candidates.filter((item) => item.category === 'bottom');
  if (tops.length === 0 || bottoms.length === 0) {
    return null;
  }

  const top = tops[0];
  const bottom = pickColorPair(top, bottoms) || bottoms[0];
  const extras = pickExtras(candidates, top.color);

  return {
    main: [top, bottom],
    extras,
    html: renderRecommendation({ main: [top, bottom], extras })
  };
}

function pickColorPair(top, bottoms) {
  const topFamily = colorFamilyFor(top.color);
  if (!topFamily) return null;

  const preferredFamilies = complementaryFamilies[topFamily] || [];
  return bottoms.find((bottom) => preferredFamilies.includes(colorFamilyFor(bottom.color)));
}

function pickExtras(candidates, anchorColor) {
  return candidates
    .filter((item) => ['outerwear', 'footwear', 'accessory'].includes(item.category))
    .filter((item) => colorMatches(anchorColor, item.color))
    .slice(0, 3);
}

function colorMatches(a, b) {
  const familyA = colorFamilyFor(a);
  const familyB = colorFamilyFor(b);

  if (!familyA || !familyB) {
    return true;
  }

  return familyA === familyB || (complementaryFamilies[familyA] || []).includes(familyB);
}

function colorFamilyFor(color) {
  for (const [family, names] of Object.entries(colorFamilies)) {
    if (names.some((name) => color.includes(name))) {
      return family;
    }
  }

  return null;
}

function renderRecommendation({ main, extras }) {
  const primary = main.map((item) => `<li><strong>${escapeHtml(item.name)}</strong> (${escapeHtml(item.category)})</li>`).join('');
  const accessories = extras.length
    ? extras.map((item) => `<li>${escapeHtml(item.name)} (${escapeHtml(item.category)})</li>`).join('')
    : '<li>Optional: add neutral accessories.</li>';

  return `
    <h3>Suggested Outfit</h3>
    <p>Primary pieces:</p>
    <ul>${primary}</ul>
    <p>Complete the look:</p>
    <ul>${accessories}</ul>
  `;
}

async function readSelectedImage() {
  const file = document.getElementById('photo').files[0];
  if (!file) {
    return '';
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slotForCategory(category) {
  if (category === 'footwear') return 'footwear';
  if (category === 'accessory') return 'accessory';
  if (category === 'bottom' || category === 'dress') return 'bottom';
  return 'top';
}

function mapItemsToPreviewSlots(selectedItems) {
  const next = {
    top: null,
    bottom: null,
    footwear: null,
    accessory: null
  };

  for (const item of selectedItems) {
    const slot = slotForCategory(item.category);

    if (!next[slot]) {
      next[slot] = item;
    }

    if (item.category === 'dress') {
      next.top = item;
      next.bottom = item;
    }
  }

  return next;
}

function clearDeletedItemFromPreview(itemId) {
  for (const [slot, item] of Object.entries(previewSelection)) {
    if (item && item.id === itemId) {
      previewSelection[slot] = null;
    }
  }
}

function renderPreview() {
  for (const [slot, config] of Object.entries(previewSlots)) {
    const selectedItem = previewSelection[slot];

    if (!selectedItem) {
      config.imageEl.style.display = 'none';
      config.imageEl.src = '';
      config.textEl.textContent = config.emptyText;
      continue;
    }

    if (selectedItem.image) {
      config.imageEl.style.display = 'block';
      config.imageEl.src = selectedItem.image;
    } else {
      config.imageEl.style.display = 'none';
      config.imageEl.src = '';
    }

    config.textEl.textContent = `${selectedItem.name} (${selectedItem.category})`;
  }
}

function renderSavedOutfits() {
  savedOutfitsEl.innerHTML = '';

  if (savedOutfits.length === 0) {
    savedOutfitsEl.innerHTML = '<p class="muted">No saved outfits yet.</p>';
    return;
  }

  for (const outfit of savedOutfits) {
    const outfitItems = outfit.itemIds.map((id) => items.find((item) => item.id === id)).filter(Boolean);
    if (outfitItems.length === 0) continue;

    const node = document.createElement('article');
    node.className = 'saved-outfit';
    node.innerHTML = `
      <div><strong>${escapeHtml(outfit.summary)}</strong></div>
      <div class="muted">${new Date(outfit.createdAt).toLocaleString()}</div>
      <div>${outfitItems.map((item) => escapeHtml(item.name)).join(', ')}</div>
      <div class="saved-outfit-actions">
        <button class="saved-load-btn" type="button">Load in preview</button>
        <button class="saved-delete-btn" type="button">Remove</button>
      </div>
    `;

    node.querySelector('.saved-load-btn').addEventListener('click', () => {
      previewModeEl.textContent = 'Showing saved outfit preview.';
      previewSelection = mapItemsToPreviewSlots(outfitItems);
      renderPreview();
    });

    node.querySelector('.saved-delete-btn').addEventListener('click', () => {
      savedOutfits = savedOutfits.filter((saved) => saved.id !== outfit.id);
      persistSavedOutfits();
      renderSavedOutfits();
    });

    savedOutfitsEl.appendChild(node);
  }
}

const STORAGE_KEY = 'stylesnap-items-v1';

const itemForm = document.getElementById('item-form');
const recommendationForm = document.getElementById('recommendation-form');
const itemsContainer = document.getElementById('items');
const emptyState = document.getElementById('empty-state');
const recommendationEl = document.getElementById('recommendation');

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
renderItems();

itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const item = {
    id: crypto.randomUUID(),
    name: getValue('name'),
    category: getValue('category'),
    color: getValue('color').toLowerCase(),
    season: getValue('season'),
    style: getValue('style'),
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
});

recommendationForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const occasion = getValue('target-occasion').toLowerCase();
  const season = getValue('target-season');
  const style = getValue('target-style');

  const result = recommendOutfit({ occasion, season, style });

  recommendationEl.classList.remove('empty');
  if (!result) {
    recommendationEl.textContent =
      'Not enough matching items yet. Add tops/bottoms (or a dress) in this style/season to get recommendations.';
    return;
  }

  recommendationEl.innerHTML = result;
});

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

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
      <img src="${item.image || ''}" alt="${escapeHtml(item.name)}" />
      <div class="item-content">
        <div class="item-title">${escapeHtml(item.name)}</div>
        <div>Color: ${escapeHtml(item.color)}</div>
        <div class="badges">${tags}</div>
        <button class="delete-btn" data-id="${item.id}" type="button">Delete</button>
      </div>
    `;

    node.querySelector('.delete-btn').addEventListener('click', () => {
      items = items.filter((existingItem) => existingItem.id !== item.id);
      persistItems();
      renderItems();
    });

    itemsContainer.appendChild(node);
  }
}

function recommendOutfit({ occasion, season, style }) {
  const candidates = items.filter(
    (item) =>
      (item.season === 'all' || item.season === season) &&
      item.style === style &&
      (item.occasions.length === 0 || item.occasions.includes(occasion))
  );

  const dresses = candidates.filter((item) => item.category === 'dress');
  if (dresses.length > 0) {
    const dress = dresses[0];
    const extras = pickExtras(candidates, dress.color);
    return renderRecommendation({ main: [dress], extras });
  }

  const tops = candidates.filter((item) => item.category === 'top');
  const bottoms = candidates.filter((item) => item.category === 'bottom');
  if (tops.length === 0 || bottoms.length === 0) {
    return null;
  }

  const top = tops[0];
  const bottom = pickColorPair(top, bottoms) || bottoms[0];
  const extras = pickExtras(candidates, top.color);

  return renderRecommendation({ main: [top, bottom], extras });
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

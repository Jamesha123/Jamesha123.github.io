"use strict";

/**
 * Browser storage layer for Lists — ports server.js logic to localStorage
 * with cross-tab sync via BroadcastChannel.
 */
(function () {

const LIST_TYPES = ["todo", "groceries"];
const DEFAULT_TYPE = "todo";

// Preset grocery subtopics (excluding misc, which is universal + always last).
const GROCERY_PRESETS = ["produce", "bakery", "protein", "condiments", "pantry", "snacks", "beverages", "ava", "personal", "home"];
const PRESET_LABELS = {
  produce: "Produce",
  bakery: "Bakery",
  protein: "Protein",
  condiments: "Seasonings/Condiments",
  pantry: "Pantry",
  snacks: "Snacks",
  beverages: "Beverages",
  ava: "Ava",
  personal: "Personal Care",
  home: "Home Goods",
};
const DEFAULT_CATEGORY = "misc";

// Units for quantities. Conversions only make sense within a single dimension
// (you can't turn cups into apples, or fluid ounces into grams without knowing
// an ingredient's density). Each unit converts to a per-dimension base unit:
// count -> "each", volume -> milliliter, weight -> gram.
const UNITS = {
  each: { dim: "count", toBase: 1 },
  tsp: { dim: "volume", toBase: 4.92892 },
  tbsp: { dim: "volume", toBase: 14.7868 },
  floz: { dim: "volume", toBase: 29.5735 },
  cup: { dim: "volume", toBase: 236.588 },
  pt: { dim: "volume", toBase: 473.176 },
  qt: { dim: "volume", toBase: 946.353 },
  gal: { dim: "volume", toBase: 3785.41 },
  ml: { dim: "volume", toBase: 1 },
  l: { dim: "volume", toBase: 1000 },
  oz: { dim: "weight", toBase: 28.3495 },
  lb: { dim: "weight", toBase: 453.592 },
  g: { dim: "weight", toBase: 1 },
  kg: { dim: "weight", toBase: 1000 },
};

const round4 = (n) => Math.round(n * 10000) / 10000;

/** "chocolate milk" → "Chocolate Milk"; hyphenated words are capitalized per part. */
function titleCaseText(raw) {
  const s = String(raw == null ? "" : raw).trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
        .filter(Boolean)
        .join("-")
    )
    .join(" ");
}

/** Coerce arbitrary input into a valid { amount, unit } or null. */
function sanitizeQty(qty) {
  if (!qty || typeof qty !== "object") return null;
  const amount = Number(qty.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!UNITS[qty.unit]) return null;
  return { amount: round4(amount), unit: qty.unit };
}

/** Convert an amount between two units of the same dimension; null if incompatible. */
function convertAmount(amount, from, to) {
  if (from === to) return amount;
  const a = UNITS[from];
  const b = UNITS[to];
  if (!a || !b || a.dim !== b.dim) return null;
  return (amount * a.toBase) / b.toBase;
}

/** Combine two quantities for the same item, converting into base's unit. */
function mergeQty(base, extra) {
  if (!base) return extra || null;
  if (!extra) return base;
  const converted = convertAmount(extra.amount, extra.unit, base.unit);
  if (converted == null) return base; // different dimensions — keep base
  return { amount: round4(base.amount + converted), unit: base.unit };
}

// ---------------------------------------------------------------------------
// State + persistence
// ---------------------------------------------------------------------------

/** Newest activity kept in memory / on disk. */
const ACTIVITY_LIMIT = 200;
/** Entries older than this are dropped automatically. */
const ACTIVITY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days




/** Clean a display name from the client into something safe and bounded. */
function sanitizeName(raw) {
  const name = String(raw == null ? "" : raw)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return name || "Guest";
}

/** Drop entries older than the retention window, then cap the total kept. */
function pruneActivity() {
  const cutoff = Date.now() - ACTIVITY_MAX_AGE_MS;
  state.activity = state.activity.filter((a) => a && a.ts >= cutoff);
  if (state.activity.length > ACTIVITY_LIMIT) {
    state.activity.splice(0, state.activity.length - ACTIVITY_LIMIT);
  }
}

/**
 * Append an entry to the shared activity feed. Call inside a commit()'s mutate
 * callback so it is saved and broadcast together with the change it describes.
 */
function logActivity(actor, list, action, detail) {
  state.activity.push({
    id: crypto.randomUUID(),
    ts: Date.now(),
    actorId: actor && actor.id ? actor.id : null,
    actorName: actor && actor.name ? actor.name : "Someone",
    listId: list ? list.id : null,
    listName: list ? list.name : null,
    action,
    detail: detail == null ? "" : String(detail),
  });
  pruneActivity();
}

/** Per-list undo/redo history (in memory only): JSON snapshots of items. */
const histories = new Map();
const HISTORY_LIMIT = 100;

function emptyMemory() {
  return { todo: [], groceries: [] };
}

/** Make sure a list has all the fields this version expects. */
function normalizeList(list) {
  if (!Array.isArray(list.customCategories)) list.customCategories = [];
  for (const it of list.items || []) {
    if (!("qty" in it)) it.qty = null;
    if (it.text) it.text = titleCaseText(it.text);
  }
  return list;
}

/** Normalize a recipe and its ingredients. */
function normalizeRecipe(r) {
  return {
    id: r.id || crypto.randomUUID(),
    name: String(r.name || "Untitled recipe"),
    createdAt: r.createdAt || Date.now(),
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map((i) => ({
          id: i.id || crypto.randomUUID(),
          text: titleCaseText(i.text || ""),
          category: i.category || DEFAULT_CATEGORY,
          qty: sanitizeQty(i.qty),
        }))
      : [],
  };
}

function makeCategoryKey(label) {
  const slug = String(label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `c-${slug}` : "";
}

function isValidCategory(list, key) {
  if (!key) return false;
  if (key === DEFAULT_CATEGORY) return true;
  if (list.type === "groceries" && GROCERY_PRESETS.includes(key)) return true;
  return list.customCategories.some((c) => c.key === key);
}

function categoryLabelFor(list, key) {
  if (key === DEFAULT_CATEGORY) return "Miscellaneous";
  const custom = list.customCategories.find((c) => c.key === key);
  if (custom) return custom.label;
  if (PRESET_LABELS[key]) return PRESET_LABELS[key];
  return key;
}

function resolveCategory(list, key, label) {
  if (isValidCategory(list, key)) return key;
  if (typeof key === "string" && key.startsWith("c-") && label && String(label).trim()) {
    if (!list.customCategories.some((c) => c.key === key)) {
      list.customCategories.push({ key, label: String(label).trim() });
    }
    return key;
  }
  return DEFAULT_CATEGORY;
}

function addGrocerySubtopic(label) {
  const key = makeCategoryKey(label);
  if (!key) return "";
  if (!state.grocerySubtopics.some((s) => s.key === key)) {
    state.grocerySubtopics.push({ key, label: String(label).trim() });
  }
  return key;
}

function grocerySubtopicLabel(key) {
  if (key === DEFAULT_CATEGORY) return "Miscellaneous";
  if (PRESET_LABELS[key]) return PRESET_LABELS[key];
  const c = state.grocerySubtopics.find((s) => s.key === key);
  return c ? c.label : key;
}

function getHistory(id) {
  let h = histories.get(id);
  if (!h) {
    h = { undo: [], redo: [] };
    histories.set(id, h);
  }
  return h;
}

function recordHistory(list) {
  const h = getHistory(list.id);
  h.undo.push(JSON.stringify(list.items));
  if (h.undo.length > HISTORY_LIMIT) h.undo.shift();
  h.redo.length = 0;
}

function singularize(word) {
  if (word.length <= 3) return word;
  if (/ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (/oes$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

function normalizeKey(name) {
  const clean = String(name).toLowerCase().trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const tokens = clean.split(" ");
  tokens[tokens.length - 1] = singularize(tokens[tokens.length - 1]);
  return tokens.join(" ");
}

function rememberItem(list, name, category) {
  const cat = isValidCategory(list, category) ? category : DEFAULT_CATEGORY;
  upsertMemory(list.type, name, cat, categoryLabelFor(list, cat));
}

function upsertMemory(type, name, category, label) {
  const display = titleCaseText(name);
  const key = normalizeKey(display);
  if (!key) return;
  const bucket = state.remembered[type] || (state.remembered[type] = []);
  const existing = bucket.find((r) => r.key === key);
  if (existing) {
    existing.name = display;
    existing.category = category;
    existing.label = label || "";
  } else {
    bucket.push({ key, name: display, category, label: label || "" });
  }
}

function reflectEditInMemory(oldName, name, category) {
  const bucket = state.remembered.groceries;
  if (!bucket) return;
  const oldKey = normalizeKey(oldName);
  if (!bucket.some((r) => r.key === oldKey)) return;
  state.remembered.groceries = bucket.filter((r) => r.key !== oldKey);
  upsertMemory("groceries", name, category, grocerySubtopicLabel(category));
}

function publicState() {
  return {
    lists: state.lists.map((l) => {
      const h = histories.get(l.id);
      return { ...l, canUndo: !!(h && h.undo.length), canRedo: !!(h && h.redo.length) };
    }),
    remembered: state.remembered,
    recipes: state.recipes,
    grocerySubtopics: state.grocerySubtopics,
    activity: state.activity,
  };
}

const findList = (id) => state.lists.find((l) => l.id === id);

function makeItem(list, text, category, label, qty) {
  return {
    id: crypto.randomUUID(),
    text: titleCaseText(text),
    done: false,
    createdAt: Date.now(),
    category: resolveCategory(list, category, label),
    qty: sanitizeQty(qty),
  };
}

function addOrMerge(list, it) {
  const key = normalizeKey(it.text);
  const existing = key ? list.items.find((x) => normalizeKey(x.text) === key) : null;
  if (!existing) {
    list.items.push(makeItem(list, it.text, it.category, it.label, it.qty));
    return;
  }
  const incompatible =
    existing.qty && it.qty && convertAmount(it.qty.amount, it.qty.unit, existing.qty.unit) == null;
  if (incompatible) {
    list.items.push(makeItem(list, it.text, it.category, it.label, it.qty));
  } else {
    existing.qty = mergeQty(existing.qty, it.qty);
  }
}

function addSingle(list, text, category, label, qty) {
  const name = titleCaseText(text);
  const clean = sanitizeQty(qty);
  if (clean) return addOrMerge(list, { text: name, category, label, qty: clean });

  if (list.type === "groceries") {
    const key = normalizeKey(name);
    const existing = key ? list.items.find((x) => normalizeKey(x.text) === key) : null;
    if (existing) {
      if (!existing.qty) {
        existing.qty = { amount: 2, unit: "each" };
      } else if (UNITS[existing.qty.unit] && UNITS[existing.qty.unit].dim === "count") {
        existing.qty = { amount: round4(existing.qty.amount + 1), unit: existing.qty.unit };
      }
      return;
    }
  }

  list.items.push(makeItem(list, name, category, label, null));
}

// --- Browser persistence + sync -------------------------------------------

const STORAGE_KEY = "lists.static.v1";
const CHANNEL_NAME = "lists-sync-v1";
const PRESENCE_STALE_MS = 15000;

let saveTimer = null;
let applyingRemote = false;
let rev = 0;
const tabs = new Map();
let channel = null;
let connectOpts = null;
let presenceTimer = null;

function persistableState() {
  return {
    lists: state.lists,
    remembered: state.remembered,
    recipes: state.recipes,
    grocerySubtopics: state.grocerySubtopics,
    activity: state.activity,
    _rev: rev,
  };
}

function parseStoredPayload(parsed) {
  const remembered = emptyMemory();
  const upsert = (type, entry) => {
    if (!entry || !entry.key || !remembered[type]) return;
    const name = titleCaseText(entry.name);
    const existing = remembered[type].find((r) => r.key === entry.key);
    if (existing) {
      existing.name = name;
      existing.category = entry.category;
      if (entry.label) existing.label = entry.label;
    } else {
      remembered[type].push({
        key: entry.key,
        name,
        category: entry.category,
        label: entry.label || "",
      });
    }
  };

  rev = Number(parsed._rev) || 0;
  if (!Array.isArray(parsed.lists)) {
    return { lists: [], remembered, recipes: [], grocerySubtopics: [], activity: [] };
  }

  for (const list of parsed.lists) {
    normalizeList(list);
    if (Array.isArray(list.remembered)) {
      const type = list.type === "groceries" ? "groceries" : "todo";
      for (const r of list.remembered) upsert(type, r);
      delete list.remembered;
    }
  }
  if (Array.isArray(parsed.remembered)) {
    for (const r of parsed.remembered) upsert("groceries", r);
  }
  if (parsed.remembered && !Array.isArray(parsed.remembered)) {
    for (const type of LIST_TYPES) {
      if (Array.isArray(parsed.remembered[type])) {
        for (const r of parsed.remembered[type]) upsert(type, r);
      }
    }
  }

  const recipes = Array.isArray(parsed.recipes) ? parsed.recipes.map(normalizeRecipe) : [];
  const grocerySubtopics = [];
  const addSub = (key, label) => {
    if (key && !grocerySubtopics.some((s) => s.key === key)) {
      grocerySubtopics.push({ key, label: String(label || key) });
    }
  };
  if (Array.isArray(parsed.grocerySubtopics)) {
    for (const s of parsed.grocerySubtopics) if (s) addSub(s.key, s.label);
  }
  for (const list of parsed.lists) {
    if (list.type === "groceries") {
      for (const c of list.customCategories || []) addSub(c.key, c.label);
    }
  }

  const cutoff = Date.now() - ACTIVITY_MAX_AGE_MS;
  const activity = (Array.isArray(parsed.activity) ? parsed.activity : [])
    .filter((a) => a && a.ts >= cutoff)
    .slice(-ACTIVITY_LIMIT);

  return { lists: parsed.lists, remembered, recipes, grocerySubtopics, activity };
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { lists: [], remembered: emptyMemory(), recipes: [], grocerySubtopics: [], activity: [] };
    }
    return parseStoredPayload(JSON.parse(raw));
  } catch (e) {
    console.error("Failed to load lists state:", e);
  }
  return { lists: [], remembered: emptyMemory(), recipes: [], grocerySubtopics: [], activity: [] };
}

let state = loadStateFromStorage();
let defaultSeedPromise = null;

function defaultSeedUrl() {
  const script = document.querySelector('script[src*="store.js"]');
  if (script && script.src) {
    return script.src.replace(/\/store\.js(\?.*)?$/i, "/seed-default.json");
  }
  return "seed-default.json";
}

function ensureDefaultSeed() {
  if (localStorage.getItem(STORAGE_KEY) || state.lists.length > 0) {
    return Promise.resolve();
  }
  if (!defaultSeedPromise) {
    defaultSeedPromise = fetch(defaultSeedUrl())
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (parsed) {
        if (!parsed || !Array.isArray(parsed.lists) || parsed.lists.length === 0) {
          return;
        }
        state = parseStoredPayload(parsed);
        saveState();
      })
      .catch(function (e) {
        console.warn("Could not load default lists seed:", e);
      });
  }
  return defaultSeedPromise;
}

function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      rev += 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState(), null, 2));
      if (!applyingRemote && channel) {
        channel.postMessage({ type: "sync", rev, payload: persistableState() });
      }
    } catch (e) {
      console.error("Failed to save lists state:", e);
    }
  }, 150);
}

function notifyState() {
  if (connectOpts && connectOpts.onState) connectOpts.onState(publicState());
}

function notifyPresence() {
  if (connectOpts && connectOpts.onPresence) connectOpts.onPresence(presenceList());
}

function broadcast() {
  notifyState();
}

function broadcastPresence() {
  notifyPresence();
  if (channel) channel.postMessage({ type: "presence", tabs: Array.from(tabs.entries()) });
}

function commit(mutate) {
  mutate();
  saveState();
  broadcast();
}

function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function sanitizeActor(actor) {
  return {
    id: String((actor && actor.id) || "").slice(0, 64),
    name: sanitizeName(actor && actor.name),
  };
}

function applyRemote(payload) {
  if (!payload || (Number(payload._rev) || 0) <= rev) return;
  applyingRemote = true;
  rev = Number(payload._rev) || rev;
  state.lists = payload.lists || [];
  state.remembered = payload.remembered || emptyMemory();
  state.recipes = payload.recipes || [];
  state.grocerySubtopics = payload.grocerySubtopics || [];
  state.activity = payload.activity || [];
  for (const list of state.lists) normalizeList(list);
  applyingRemote = false;
  notifyState();
}

function presenceList() {
  const now = Date.now();
  const out = [];
  for (const [id, tab] of tabs) {
    if (now - tab.lastSeen > PRESENCE_STALE_MS) {
      tabs.delete(id);
      continue;
    }
    out.push({ id, name: tab.name, listId: tab.listId || null });
  }
  return out;
}

function updatePresence({ id, name, listId }) {
  if (!id) return jsonResponse(200, { ok: true });
  tabs.set(id, { name: sanitizeName(name), listId: listId || null, lastSeen: Date.now() });
  broadcastPresence();
  return jsonResponse(200, { ok: true });
}

async function handleRecipesRequest(method, parts, body) {
  const recipeId = parts[2];
  const sub = parts[3];

  if (!recipeId) {
    if (method === "POST") {
      const name = String(body.name || "").trim();
      if (!name) return jsonResponse(400, { error: "Name is required" });
      const recipe = normalizeRecipe({ name });
      commit(() => state.recipes.push(recipe));
      return jsonResponse(201, { ok: true, id: recipe.id });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (recipeId === "parse") {
    if (method !== "POST") return jsonResponse(405, { error: "Method not allowed" });
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const text = typeof body.text === "string" ? body.text : "";
    let parsed;
    try {
      if (url) parsed = await window.RecipeParser.importFromUrl(url);
      else if (text.trim()) parsed = window.RecipeParser.parseRecipeText(text, "");
      else return jsonResponse(400, { error: "Paste a recipe URL or some recipe text." });
    } catch (err) {
      return jsonResponse(400, { error: err.message || "Couldn't read that recipe." });
    }
    const ingredients = (parsed.ingredients || []).filter((i) => i && i.text);
    if (!ingredients.length) {
      return jsonResponse(422, { error: "No ingredients found. Try pasting the ingredient list." });
    }
    return jsonResponse(200, {
      ok: true,
      name: parsed.name || "",
      ingredients: ingredients.map((i) => ({
        text: titleCaseText(i.text),
        category: DEFAULT_CATEGORY,
        qty: i.qty,
      })),
    });
  }

  const recipe = state.recipes.find((r) => r.id === recipeId);
  if (!recipe) return jsonResponse(404, { error: "Recipe not found" });

  if (!sub) {
    if (method === "PATCH") {
      commit(() => {
        if (typeof body.name === "string" && body.name.trim()) recipe.name = body.name.trim();
      });
      return jsonResponse(200, { ok: true });
    }
    if (method === "DELETE") {
      commit(() => {
        state.recipes = state.recipes.filter((r) => r.id !== recipeId);
      });
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (sub === "save") {
    if (method !== "POST") return jsonResponse(405, { error: "Method not allowed" });
    commit(() => {
      for (const ing of recipe.ingredients) {
        const cat = ing.category || DEFAULT_CATEGORY;
        upsertMemory("groceries", ing.text, cat, grocerySubtopicLabel(cat));
      }
    });
    return jsonResponse(200, { ok: true });
  }

  if (sub !== "ingredients") return jsonResponse(404, { error: "Unknown endpoint" });

  const makeIngredient = (b) => ({
    id: crypto.randomUUID(),
    text: titleCaseText(b.text || ""),
    category: typeof b.category === "string" ? b.category : DEFAULT_CATEGORY,
    qty: sanitizeQty(b.qty),
  });

  const seg = parts[4];

  if (method === "POST" && seg === "batch") {
    const incoming = Array.isArray(body.items) ? body.items : [];
    const toAdd = incoming.map(makeIngredient).filter((i) => i.text);
    if (!toAdd.length) return jsonResponse(400, { error: "No ingredients to add" });
    commit(() => {
      for (const i of toAdd) recipe.ingredients.push(i);
    });
    return jsonResponse(201, { ok: true });
  }

  if (method === "PUT" && !seg) {
    const incoming = Array.isArray(body.items) ? body.items : [];
    const next = incoming.map(makeIngredient).filter((i) => i.text);
    commit(() => {
      recipe.ingredients = next;
    });
    return jsonResponse(200, { ok: true });
  }

  const ingId = seg && seg !== "batch" ? seg : undefined;

  if (method === "POST" && !ingId) {
    const ing = makeIngredient(body);
    if (!ing.text) return jsonResponse(400, { error: "Ingredient text is required" });
    commit(() => recipe.ingredients.push(ing));
    return jsonResponse(201, { ok: true });
  }

  if (method === "PATCH" && ingId) {
    const ing = recipe.ingredients.find((i) => i.id === ingId);
    if (!ing) return jsonResponse(404, { error: "Ingredient not found" });
    const oldName = ing.text;
    commit(() => {
      if (typeof body.text === "string" && body.text.trim()) ing.text = titleCaseText(body.text);
      if (typeof body.category === "string") ing.category = body.category;
      if ("qty" in body) ing.qty = sanitizeQty(body.qty);
      reflectEditInMemory(oldName, ing.text, ing.category || DEFAULT_CATEGORY);
    });
    return jsonResponse(200, { ok: true });
  }

  if (method === "DELETE" && ingId) {
    commit(() => {
      recipe.ingredients = recipe.ingredients.filter((i) => i.id !== ingId);
    });
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(405, { error: "Method not allowed" });
}

async function handleRequest(method, url, body, actor) {
  const parsed = new URL(url, "http://local");
  const parts = parsed.pathname.split("/").filter(Boolean);
  const act = sanitizeActor(actor);
  body = body || {};

  if (parts[1] === "recipes") return handleRecipesRequest(method, parts, body);
  if (parts[1] === "activity") {
    if (method === "DELETE") {
      commit(() => {
        state.activity = [];
      });
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }
  if (parts[1] === "presence") {
    if (method === "POST") return updatePresence(body);
    return jsonResponse(405, { error: "Method not allowed" });
  }
  if (parts[1] === "subtopics") {
    if (method === "POST") {
      const label = String(body.label || "").trim();
      const key = makeCategoryKey(label);
      if (!label || !key) return jsonResponse(400, { error: "A subtopic name is required" });
      commit(() => addGrocerySubtopic(label));
      return jsonResponse(201, { ok: true, key });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }
  if (parts[1] !== "lists") return jsonResponse(404, { error: "Unknown endpoint" });

  const listId = parts[2];
  const sub = parts[3];

  if (!listId) {
    if (method === "POST") {
      const name = String(body.name || "").trim();
      const type = LIST_TYPES.includes(body.type) ? body.type : DEFAULT_TYPE;
      if (!name) return jsonResponse(400, { error: "Name is required" });
      const list = normalizeList({ id: crypto.randomUUID(), name, type, createdAt: Date.now(), items: [] });
      commit(() => {
        state.lists.push(list);
        logActivity(act, list, "createList", list.name);
      });
      return jsonResponse(201, { ok: true, id: list.id });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const list = findList(listId);
  if (!list) return jsonResponse(404, { error: "List not found" });

  if (sub === "undo" || sub === "redo") {
    if (method !== "POST") return jsonResponse(405, { error: "Method not allowed" });
    const h = getHistory(list.id);
    const from = sub === "undo" ? h.undo : h.redo;
    const to = sub === "undo" ? h.redo : h.undo;
    if (from.length) {
      commit(() => {
        to.push(JSON.stringify(list.items));
        list.items = JSON.parse(from.pop());
      });
    }
    return jsonResponse(200, { ok: true });
  }

  if (sub === "categories") {
    if (method === "POST") {
      const label = String(body.label || "").trim();
      const key = makeCategoryKey(label);
      if (!label || !key) return jsonResponse(400, { error: "A subtopic name is required" });
      commit(() => {
        if (!list.customCategories.some((c) => c.key === key)) list.customCategories.push({ key, label });
        if (list.type === "groceries") addGrocerySubtopic(label);
      });
      return jsonResponse(201, { ok: true, key });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (sub === "remembered") {
    const key = parts[4] ? decodeURIComponent(parts[4]) : null;
    if (method === "DELETE" && key) {
      commit(() => {
        const bucket = state.remembered[list.type];
        if (bucket) state.remembered[list.type] = bucket.filter((r) => r.key !== key);
      });
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (!sub) {
    if (method === "PATCH") {
      commit(() => {
        const renamed = typeof body.name === "string" && body.name.trim() && body.name.trim() !== list.name;
        if (typeof body.name === "string" && body.name.trim()) list.name = body.name.trim();
        if (LIST_TYPES.includes(body.type)) list.type = body.type;
        if (renamed) logActivity(act, list, "renameList", list.name);
      });
      return jsonResponse(200, { ok: true });
    }
    if (method === "DELETE") {
      const removed = list.name;
      commit(() => {
        state.lists = state.lists.filter((l) => l.id !== listId);
        logActivity(act, null, "deleteList", removed);
      });
      histories.delete(listId);
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (sub !== "items") return jsonResponse(404, { error: "Unknown endpoint" });

  const seg = parts[4];

  if (method === "POST" && seg === "batch") {
    const incoming = Array.isArray(body.items) ? body.items : [];
    const toAdd = incoming
      .map((it) => ({
        text: titleCaseText(it.text || ""),
        category: it.category,
        label: it.label,
        qty: sanitizeQty(it.qty),
      }))
      .filter((it) => it.text);
    if (!toAdd.length) return jsonResponse(400, { error: "No items to add" });
    recordHistory(list);
    commit(() => {
      for (const it of toAdd) addSingle(list, it.text, it.category, it.label, it.qty);
      const detail =
        toAdd.length === 1 ? toAdd[0].text : `${toAdd.length} items (${toAdd.map((t) => t.text).join(", ")})`;
      logActivity(act, list, "add", detail);
    });
    return jsonResponse(201, { ok: true });
  }

  const itemId = seg && seg !== "batch" ? seg : undefined;

  if (method === "POST" && !itemId) {
    const text = titleCaseText(body.text || "");
    if (!text) return jsonResponse(400, { error: "Text is required" });
    recordHistory(list);
    commit(() => {
      addSingle(list, text, body.category, body.label, body.qty);
      logActivity(act, list, "add", text);
    });
    return jsonResponse(201, { ok: true });
  }

  if (method === "DELETE" && !itemId) {
    const all = parsed.searchParams.get("scope") === "all";
    recordHistory(list);
    commit(() => {
      if (all) {
        const n = list.items.length;
        list.items = [];
        logActivity(act, list, "clearAll", `${n} item${n === 1 ? "" : "s"}`);
      } else {
        const done = list.items.filter((t) => t.done);
        for (const it of done) rememberItem(list, it.text, it.category);
        list.items = list.items.filter((t) => !t.done);
        logActivity(act, list, "clearDone", `${done.length} completed`);
      }
    });
    return jsonResponse(200, { ok: true });
  }

  if (method === "PATCH" && itemId) {
    const item = list.items.find((t) => t.id === itemId);
    if (!item) return jsonResponse(404, { error: "Item not found" });
    recordHistory(list);
    const before = item.text;
    commit(() => {
      const toggled = typeof body.done === "boolean" && body.done !== item.done;
      const willBeDone = body.done;
      const renamed = typeof body.text === "string" && body.text.trim() && body.text.trim() !== item.text;
      if (typeof body.done === "boolean") item.done = body.done;
      if (typeof body.text === "string" && body.text.trim()) item.text = titleCaseText(body.text);
      if (isValidCategory(list, body.category)) item.category = body.category;
      if ("qty" in body) item.qty = sanitizeQty(body.qty);
      if (renamed) logActivity(act, list, "edit", `${before} → ${item.text}`);
      else if (toggled) logActivity(act, list, willBeDone ? "check" : "uncheck", item.text);
      else logActivity(act, list, "edit", item.text);
    });
    return jsonResponse(200, { ok: true });
  }

  if (method === "DELETE" && itemId) {
    const victim = list.items.find((t) => t.id === itemId);
    recordHistory(list);
    commit(() => {
      list.items = list.items.filter((t) => t.id !== itemId);
      if (victim) logActivity(act, list, "delete", victim.text);
    });
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(405, { error: "Method not allowed" });
}

function connect(opts) {
  connectOpts = opts;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e) => {
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "sync") applyRemote(msg.payload);
      if (msg.type === "presence" && Array.isArray(msg.tabs)) {
        tabs.clear();
        for (const [id, tab] of msg.tabs) tabs.set(id, tab);
        notifyPresence();
      }
    };
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      applyRemote(JSON.parse(e.newValue));
    } catch {
      /* ignore */
    }
  });

  ensureDefaultSeed().then(function () {
    if (opts.onConnected) opts.onConnected(true);
    if (opts.onState) opts.onState(publicState());
  });

  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(() => {
    if (!connectOpts) return;
    updatePresence({
      id: connectOpts.id,
      name: connectOpts.name,
      listId: connectOpts.getListId ? connectOpts.getListId() : null,
    });
    notifyPresence();
  }, 5000);
  updatePresence({
    id: opts.id,
    name: opts.name,
    listId: opts.getListId ? opts.getListId() : null,
  });
}

window.ListsStore = {
  request(method, url, body, actor) {
    return handleRequest(method, url, body, actor);
  },
  connect,
  updatePresence,
};
})();

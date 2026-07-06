"use strict";

/**
 * Browser recipe parser — same logic as the Node version, using fetch for URLs.
 * URL import may fail on sites that block cross-origin requests; paste still works.
 */

const round4 = (n) => Math.round(n * 10000) / 10000;

const UNIT_WORDS = {
  teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp", tsps: "tsp", t: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp",
  cup: "cup", cups: "cup",
  pint: "pt", pints: "pt", pt: "pt", pts: "pt",
  quart: "qt", quarts: "qt", qt: "qt", qts: "qt",
  gallon: "gal", gallons: "gal", gal: "gal",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", ml: "ml",
  liter: "l", liters: "l", litre: "l", litres: "l", l: "l",
  ounce: "oz", ounces: "oz", oz: "oz",
  pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
  gram: "g", grams: "g", gramme: "g", grammes: "g", g: "g",
  kilogram: "kg", kilograms: "kg", kilo: "kg", kilos: "kg", kg: "kg",
};

const TWO_WORD_UNITS = {
  "fluid ounce": "floz", "fluid ounces": "floz", "fl oz": "floz", "fl. oz": "floz",
};

const VULGAR = {
  "¼": "1/4", "½": "1/2", "¾": "3/4",
  "⅓": "1/3", "⅔": "2/3",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
  "⅙": "1/6", "⅚": "5/6",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
  "⅐": "1/7", "⅑": "1/9", "⅒": "1/10",
};
const VULGAR_CLASS = "¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⅐⅑⅒";
const NUMBER_TOKEN = "\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?";

function tokenToNumber(tok) {
  tok = tok.trim();
  if (tok.includes(" ")) {
    const [whole, frac] = tok.split(/\s+/);
    const [n, d] = frac.split("/").map(Number);
    return Number(whole) + (d ? n / d : 0);
  }
  if (tok.includes("/")) {
    const [n, d] = tok.split("/").map(Number);
    return d ? n / d : 0;
  }
  return Number(tok);
}

function parseLeadingQuantity(line) {
  let s = String(line).replace(/^[\s\-*•·▢◦‣~>]+/, "");
  s = s.replace(new RegExp(`(\\d)\\s*([${VULGAR_CLASS}])`, "g"), "$1 $2");
  s = s.replace(new RegExp(`[${VULGAR_CLASS}]`, "g"), (c) => VULGAR[c] || c);
  s = s.trim();
  const m = s.match(new RegExp(`^(${NUMBER_TOKEN})`));
  if (!m) return { value: null, rest: s };
  const value = tokenToNumber(m[1]);
  let rest = s.slice(m[1].length);
  const range = rest.match(new RegExp(`^\\s*(?:-|–|—|to|through)\\s*(?:${NUMBER_TOKEN})`, "i"));
  if (range) rest = rest.slice(range[0].length);
  return { value, rest: rest.trim() };
}

function parseUnit(rest) {
  const words = rest.split(/\s+/);
  const norm = (w) => w.replace(/\.$/, "").toLowerCase();
  if (words.length >= 2) {
    const two = `${norm(words[0])} ${norm(words[1])}`;
    if (TWO_WORD_UNITS[two]) return { unit: TWO_WORD_UNITS[two], rest: words.slice(2).join(" ") };
  }
  if (words.length >= 1) {
    const one = norm(words[0]);
    if (UNIT_WORDS[one]) return { unit: UNIT_WORDS[one], rest: words.slice(1).join(" ") };
  }
  return { unit: null, rest };
}

function cleanName(rest) {
  return String(rest)
    .replace(/^of\s+/i, "")
    .replace(/^[\s,.;:)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(str) {
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)));
}

function safeCodePoint(n) {
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

function parseIngredientLine(line) {
  const raw = decodeEntities(String(line).replace(/<[^>]*>/g, "")).trim();
  if (!raw) return null;
  if (/:\s*$/.test(raw)) return null;
  if (!/[a-z]/i.test(raw)) return null;
  const { value, rest } = parseLeadingQuantity(raw);
  if (value == null) return { text: cleanName(raw) || raw, qty: null };
  const { unit, rest: afterUnit } = parseUnit(rest);
  const text = cleanName(afterUnit) || cleanName(rest) || raw;
  const amount = round4(value);
  const qty = amount > 0 ? { amount, unit: unit || "each" } : null;
  return { text, qty };
}

function parseIngredients(text) {
  return String(text)
    .split(/\r?\n/)
    .map(parseIngredientLine)
    .filter((i) => i && i.text);
}

function parseRecipeText(text, name) {
  const clean = typeof name === "string" ? name.trim() : "";
  return { name: clean || "Imported recipe", ingredients: parseIngredients(text) };
}

async function fetchUrl(target, redirectsLeft = 5) {
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  const res = await fetch(parsed.href, {
    headers: { Accept: "text/html,application/xhtml+xml" },
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location || redirectsLeft <= 0) {
      throw new Error(redirectsLeft <= 0 ? "Too many redirects." : "Redirect failed.");
    }
    return fetchUrl(new URL(location, parsed).href, redirectsLeft - 1);
  }
  if (!res.ok) throw new Error(`The page returned HTTP ${res.status}.`);
  const data = await res.text();
  if (data.length > 5_000_000) throw new Error("That page is too large to read.");
  return data;
}

function deepFindRecipe(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindRecipe(item);
      if (found) return found;
    }
    return null;
  }
  const type = node["@type"];
  const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
  if (isRecipe && (node.recipeIngredient || node.ingredients)) return node;
  for (const key of Object.keys(node)) {
    const found = deepFindRecipe(node[key]);
    if (found) return found;
  }
  return null;
}

function nameFrom(value) {
  if (typeof value === "string") return decodeEntities(value.replace(/<[^>]*>/g, "")).trim();
  if (value && typeof value === "object" && typeof value["@value"] === "string") {
    return decodeEntities(value["@value"]).trim();
  }
  return "";
}

function fromJsonLd(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let parsed;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const recipe = deepFindRecipe(parsed);
    if (!recipe) continue;
    let list = recipe.recipeIngredient || recipe.ingredients || [];
    if (typeof list === "string") list = [list];
    if (!Array.isArray(list)) continue;
    const ingredients = list.map(parseIngredientLine).filter((i) => i && i.text);
    if (ingredients.length) {
      return { name: nameFrom(recipe.name) || "Imported recipe", ingredients };
    }
  }
  return null;
}

function fromMicrodata(html) {
  const re = /itemprop=["']recipe[Ii]ngredient["'][^>]*>([\s\S]*?)</gi;
  const lines = [];
  let m;
  while ((m = re.exec(html))) lines.push(m[1]);
  const ingredients = lines.map(parseIngredientLine).filter((i) => i && i.text);
  if (!ingredients.length) return null;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const name = titleMatch ? nameFrom(titleMatch[1]) : "";
  return { name: name || "Imported recipe", ingredients };
}

async function importFromUrl(url) {
  let html;
  try {
    html = await fetchUrl(url);
  } catch (err) {
    const msg = err && err.message ? err.message : "Could not reach that page.";
    if (/failed to fetch|network|cors/i.test(msg)) {
      throw new Error(
        "This browser can't read that URL directly. Paste the ingredient list instead."
      );
    }
    throw err;
  }
  const recipe = fromJsonLd(html) || fromMicrodata(html);
  if (!recipe) {
    throw new Error(
      "Couldn't find a recipe on that page. Try copying and pasting the ingredient list instead."
    );
  }
  return recipe;
}

window.RecipeParser = {
  parseIngredientLine,
  parseIngredients,
  parseRecipeText,
  importFromUrl,
  parseLeadingQuantity,
};

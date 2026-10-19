import { decodeSaveCode, encodeSaveCode, SaveCodeError } from "./decode.js";
import { describeItem } from "./format.js";

const CLASS_ORDER = ["amazon", "sorceress", "necromancer", "paladin", "barbarian", "druid", "assassin"];
const SLOT_ORDER = ["weapon", "head", "shield", "amulet", "body", "gloves", "ring1", "ring2", "belt", "boots"];
const SLOT_LABELS = {
  weapon: "Weapon",
  head: "Helm",
  shield: "Shield",
  amulet: "Amulet",
  body: "Armor",
  gloves: "Gloves",
  ring1: "Ring",
  ring2: "Ring",
  belt: "Belt",
  boots: "Boots",
};
const SHARED_TABS = ["shared1", "shared2", "shared3"];

const codeInput = document.querySelector("#code");
const fileInput = document.querySelector("#file");
const errorEl = document.querySelector("#error");
const statusEl = document.querySelector("#status");
const resultEl = document.querySelector("#result");
const summaryEl = document.querySelector("#summary");
const classTabsEl = document.querySelector("#classes");
const gearEl = document.querySelector("#gear");

let save = null;
let currentCode = "";
let selectedClass = "";
let selectedStash = "";

document.querySelector("#view").addEventListener("click", viewCurrent);
document.querySelector("#example").addEventListener("click", loadExample);
document.querySelector("#copy").addEventListener("click", copyLink);
document.querySelector("#clear").addEventListener("click", clearAll);
fileInput.addEventListener("change", readFile);
codeInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    viewCurrent();
  }
});
window.addEventListener("hashchange", () => {
  const fromHash = codeFromHash();
  if (fromHash && fromHash !== currentCode) {
    codeInput.value = fromHash;
    viewCurrent({ updateHash: false });
  }
});

const initial = codeFromHash();
if (initial) {
  codeInput.value = initial;
  viewCurrent({ updateHash: false });
}

function viewCurrent(options = {}) {
  const updateHash = options.updateHash !== false;
  try {
    const next = decodeSaveCode(codeInput.value);
    save = next;
    currentCode = codeInput.value.trim();
    if (updateHash) history.replaceState(null, "", shareUrl(normalizeForHash(codeInput.value)));
    hideError();
    showStatus("");
    const classes = classIds(save);
    if (!classes.includes(selectedClass)) selectedClass = classes[0] || "";
    selectedStash = "";
    render();
  } catch (error) {
    const message = error instanceof SaveCodeError ? error.message : "That code could not be opened.";
    showError(message);
    save = null;
    currentCode = "";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    render();
  }
}

async function loadExample() {
  try {
    const response = await fetch("fixtures/example-save.json");
    if (!response.ok) throw new SaveCodeError("The example save could not be loaded.");
    const data = await response.json();
    codeInput.value = encodeSaveCode(data);
    viewCurrent();
    showStatus("Showing a made-up example save.");
  } catch (error) {
    showError(error instanceof SaveCodeError ? error.message : "The example save could not be loaded.");
  }
}

async function copyLink() {
  if (!currentCode || !save) {
    showError("View a save before copying a link.");
    return;
  }
  const url = shareUrl(normalizeForHash(codeInput.value));
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
    hideError();
    showStatus("Link copied. The code is in the URL hash, so it is not sent to the server.");
  } catch {
    hideError();
    showStatus("Clipboard blocked. The link is in the address bar — copy it from there.");
  }
}

function clearAll() {
  codeInput.value = "";
  fileInput.value = "";
  save = null;
  currentCode = "";
  selectedClass = "";
  selectedStash = "";
  history.replaceState(null, "", location.pathname + location.search);
  hideError();
  showStatus("");
  render();
  codeInput.focus();
}

function readFile() {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    codeInput.value = String(reader.result || "");
    viewCurrent();
  };
  reader.onerror = () => showError("That file could not be read.");
  reader.readAsText(file);
}

function render() {
  if (!save) {
    resultEl.hidden = true;
    summaryEl.replaceChildren();
    classTabsEl.replaceChildren();
    gearEl.replaceChildren();
    return;
  }
  resultEl.hidden = false;
  renderSummary();
  renderClassTabs();
  renderGear();
}

function renderSummary() {
  summaryEl.replaceChildren();
  const gold = document.createElement("div");
  gold.className = "gold-pill";
  const goldLabel = document.createElement("span");
  goldLabel.textContent = "Gold";
  const goldValue = document.createElement("strong");
  goldValue.textContent = formatGold(save.gold);
  gold.append(goldLabel, goldValue);
  summaryEl.append(gold);

  for (const [label, table] of [
    ["Best", save.bestTimes],
    ["Continued", save.continuedBest],
  ]) {
    for (const chip of timeChips(label, table)) summaryEl.append(chip);
  }

  if (save.version !== 7) {
    const note = document.createElement("p");
    note.className = "version-note";
    note.textContent = `This save is version ${save.version}. Newer fields may not all be shown.`;
    summaryEl.append(note);
  }
}

function renderClassTabs() {
  classTabsEl.replaceChildren();
  const classes = classIds(save);
  if (!classes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "This code has no characters.";
    classTabsEl.append(empty);
    return;
  }
  for (const cls of classes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab" + (cls === selectedClass ? " active" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", cls === selectedClass ? "true" : "false");
    const name = document.createElement("span");
    name.textContent = titleCase(cls);
    button.append(name);
    const meta = classMeta(cls);
    if (meta) {
      const sub = document.createElement("small");
      sub.textContent = meta;
      button.append(sub);
    }
    button.addEventListener("click", () => {
      selectedClass = cls;
      selectedStash = "";
      render();
    });
    classTabsEl.append(button);
  }
}

function renderGear() {
  gearEl.replaceChildren();
  if (!selectedClass) {
    gearEl.append(note("Nothing equipped is stored on this code."));
    renderStash(null);
    return;
  }

  const equipped = save.equippedByClass && save.equippedByClass[selectedClass];
  gearEl.append(sectionTitle("Equipped"));
  if (equipped && typeof equipped === "object") {
    const doll = document.createElement("div");
    doll.className = "doll";
    const slots = slotKeys(equipped);
    for (const slot of slots) {
      doll.append(renderSlot(slot, equipped[slot]));
    }
    gearEl.append(doll);
  } else {
    gearEl.append(note("No gear recorded for this class."));
  }

  const inventory = save.inventoryByClass && save.inventoryByClass[selectedClass];
  const items = Array.isArray(inventory) ? sortItems(inventory) : [];
  gearEl.append(sectionTitle(`Inventory (${items.length})`));
  gearEl.append(items.length ? itemGrid(items) : note("Nothing in this pack."));

  renderStash(selectedClass);
}

function renderStash(cls) {
  const tabs = save.stashTabs && typeof save.stashTabs === "object" ? save.stashTabs : null;
  gearEl.append(sectionTitle("Stash"));
  if (!tabs) {
    gearEl.append(note("No stash in this code."));
    return;
  }
  const keys = stashKeys(tabs, cls);
  if (!keys.length) {
    gearEl.append(note("No stash in this code."));
    return;
  }
  if (!keys.includes(selectedStash)) selectedStash = keys[0];

  const bar = document.createElement("div");
  bar.className = "tabs stash-tabs";
  bar.setAttribute("role", "tablist");
  for (const key of keys) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab" + (key === selectedStash ? " active" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", key === selectedStash ? "true" : "false");
    const count = Array.isArray(tabs[key]) ? tabs[key].length : 0;
    button.textContent = `${stashLabel(key)} (${count})`;
    button.addEventListener("click", () => {
      selectedStash = key;
      render();
    });
    bar.append(button);
  }
  gearEl.append(bar);

  const items = Array.isArray(tabs[selectedStash]) ? sortItems(tabs[selectedStash]) : [];
  gearEl.append(items.length ? itemGrid(items) : note("This tab is empty."));
}

function renderSlot(slot, item) {
  const wrap = document.createElement("div");
  wrap.className = "slot";
  const label = document.createElement("div");
  label.className = "slot-label";
  label.textContent = SLOT_LABELS[slot] || titleCase(slot);
  wrap.append(label);
  if (isItem(item)) wrap.append(renderItem(item));
  else {
    const empty = document.createElement("div");
    empty.className = "item empty";
    empty.textContent = "Empty";
    wrap.append(empty);
  }
  return wrap;
}

function renderItem(item) {
  const card = document.createElement("article");
  const rarity = String(item.rarity || "normal").toLowerCase();
  card.className = `item rarity-${cssToken(rarity)}`;
  const name = document.createElement("h3");
  name.className = "name";
  name.textContent = item.name || item.base || "Unknown item";
  card.append(name);
  if (item.base && item.base !== item.name) {
    const base = document.createElement("p");
    base.className = "base";
    base.textContent = item.base;
    card.append(base);
  }
  for (const line of describeItem(item)) {
    const row = document.createElement("p");
    row.className = `line tone-${line.tone}`;
    row.textContent = line.text;
    card.append(row);
  }
  return card;
}

function itemGrid(items) {
  const grid = document.createElement("div");
  grid.className = "item-grid";
  for (const item of items) {
    if (isItem(item)) grid.append(renderItem(item));
  }
  return grid;
}

function sectionTitle(text) {
  const heading = document.createElement("h2");
  heading.textContent = text;
  return heading;
}

function note(text) {
  const p = document.createElement("p");
  p.className = "empty-note";
  p.textContent = text;
  return p;
}

function classIds(data) {
  const found = new Set();
  for (const key of ["equippedByClass", "inventoryByClass", "unlocked", "baalSlain"]) {
    const table = data[key];
    if (table && typeof table === "object") {
      for (const id of Object.keys(table)) found.add(id);
    }
  }
  if (data.stashTabs && typeof data.stashTabs === "object") {
    for (const id of Object.keys(data.stashTabs)) {
      if (!SHARED_TABS.includes(id)) found.add(id);
    }
  }
  return [...found].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a);
    const bi = CLASS_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function classMeta(cls) {
  const parts = [];
  const unlocked = save.unlocked && save.unlocked[cls];
  if (typeof unlocked === "string" && unlocked) parts.push(titleCase(unlocked));
  const slain = save.baalSlain && save.baalSlain[cls];
  if (typeof slain === "string" && slain) parts.push(`Baal ${titleCase(slain)}`);
  return parts.join(" · ");
}

function slotKeys(equipped) {
  const extras = Object.keys(equipped).filter((key) => !SLOT_ORDER.includes(key));
  return [...SLOT_ORDER, ...extras];
}

function stashKeys(tabs, cls) {
  const keys = SHARED_TABS.filter((key) => Object.prototype.hasOwnProperty.call(tabs, key));
  if (cls && Object.prototype.hasOwnProperty.call(tabs, cls)) keys.push(cls);
  if (!cls) {
    for (const key of Object.keys(tabs)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

function stashLabel(key) {
  const shared = /^shared(\d+)$/.exec(key);
  if (shared) return `Shared ${shared[1]}`;
  return titleCase(key);
}

function sortItems(items) {
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const ay = a.item && a.item.at ? a.item.at.y : 9999;
    const by = b.item && b.item.at ? b.item.at.y : 9999;
    if (ay !== by) return ay - by;
    const ax = a.item && a.item.at ? a.item.at.x : 9999;
    const bx = b.item && b.item.at ? b.item.at.x : 9999;
    if (ax !== bx) return ax - bx;
    return a.index - b.index;
  }).map((entry) => entry.item);
}

function isItem(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && (value.name || value.base || value.mods);
}

function timeChips(label, table) {
  if (!table || typeof table !== "object") return [];
  const chips = [];
  for (const difficulty of ["normal", "nightmare", "hell"]) {
    const clock = formatClock(table[difficulty]);
    if (!clock) continue;
    const chip = document.createElement("div");
    chip.className = "time-chip";
    chip.textContent = `${label} ${titleCase(difficulty)} ${clock}`;
    chips.push(chip);
  }
  return chips;
}

function formatGold(gold) {
  if (typeof gold !== "number" || !Number.isFinite(gold)) return "—";
  return Math.trunc(gold).toLocaleString("en-US");
}

function formatClock(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${minutes}:${ss}`;
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cssToken(value) {
  return String(value).replace(/[^a-z0-9_-]/g, "") || "normal";
}

function showError(message) {
  errorEl.hidden = false;
  errorEl.textContent = message;
  statusEl.hidden = true;
}

function hideError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function showStatus(message) {
  if (!message) {
    statusEl.hidden = true;
    statusEl.textContent = "";
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = message;
}

function shareUrl(code) {
  const url = new URL(location.href);
  url.hash = `code=${encodeURIComponent(code)}`;
  return url.toString();
}

function normalizeForHash(code) {
  return code.trim().replace(/\s+/g, "");
}

function codeFromHash() {
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  if (!raw) return "";
  const body = raw.startsWith("code=") ? raw.slice(5) : raw;
  if (!body.startsWith("D2S1:") && !body.startsWith("D2S1%3A") && !raw.startsWith("code=")) return "";
  try {
    return decodeURIComponent(body);
  } catch {
    return body;
  }
}

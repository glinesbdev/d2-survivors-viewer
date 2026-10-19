const root = document.querySelector("#guide");
const dataUrl = new URL("../data/guide.json", import.meta.url);

load();

async function load() {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error("status " + response.status);
    render(await response.json());
  } catch {
    root.replaceChildren(note("The guide could not be loaded."));
  }
}

function render(data) {
  root.replaceChildren();
  root.append(intro(data));
  root.append(jumpList(data));
  root.append(rulesPanel(data));
  if (data.gameData) root.append(gamePanel(data.gameData));
  for (const cls of data.classes) root.append(classPanel(cls, data.gameData));
  openFromHash();
}

function intro(data) {
  const block = document.createElement("section");
  block.className = "panel guide-intro";
  const checked = document.createElement("p");
  checked.className = "checked";
  checked.textContent = `Last checked ${formatDate(data.lastChecked)}. Changelog through ${data.changelogThrough.build} (${formatDate(data.changelogThrough.date)}).`;
  block.append(checked);

  const lead = document.createElement("p");
  lead.textContent = data.intro;
  block.append(lead);

  const classes = document.createElement("p");
  classes.textContent = data.classesNote + " Source: ";
  classes.append(link(data.siteUrl, "d2survivors.lol"));
  classes.append(".");
  block.append(classes);

  const source = document.createElement("p");
  source.append("Changelog: ");
  source.append(link(data.changelogUrl, "d2survivors.lol/changelog.json"));
  source.append(".");
  block.append(source);
  return block;
}

function jumpList(data) {
  const nav = document.createElement("nav");
  nav.className = "tabs class-jump";
  nav.setAttribute("aria-label", "Classes");
  nav.append(jumpLink("#rules", "Rules"));
  if (data.gameData) nav.append(jumpLink("#game-data", "Game data"));
  for (const cls of data.classes) nav.append(jumpLink(`#${cls.id}`, cls.name));
  return nav;
}

function jumpLink(href, label) {
  const link = document.createElement("a");
  link.className = "tab";
  link.href = href;
  link.textContent = label;
  return link;
}

function rulesPanel(data) {
  const section = document.createElement("section");
  section.className = "panel";
  section.id = "rules";
  section.append(heading("Rules"));
  for (const rule of data.general) section.append(ruleBlock(rule));
  return section;
}

function classPanel(cls, gameData) {
  const section = document.createElement("details");
  section.className = "panel class-fold";
  section.id = cls.id;
  const summary = document.createElement("summary");
  summary.textContent = cls.name;
  section.append(summary);

  const evolvedTitle = document.createElement("h3");
  evolvedTitle.textContent = "Evolved skills";
  section.append(evolvedTitle);
  if (!cls.evolved.length) {
    section.append(paragraph("The changelog does not name an evolved skill for this class."));
  } else {
    const shared = sharedCites(cls.evolved);
    const list = document.createElement("ul");
    list.className = "evolved";
    for (const skill of cls.evolved) {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = skill.name;
      item.append(name);
      item.append(` — ${skill.detail}`);
      if (!shared) item.append(cites(skill.cites));
      list.append(item);
    }
    section.append(list);
    if (shared) section.append(cites(shared));
  }

  if (cls.rules.length) {
    const rulesTitle = document.createElement("h3");
    rulesTitle.textContent = "Class rules";
    section.append(rulesTitle);
    for (const rule of cls.rules) section.append(ruleBlock(rule));
  }

  if (cls.fromGame && gameData) section.append(fromGame(cls.fromGame, gameData));
  if (cls.tip) section.append(tipBlock(cls.tip));
  return section;
}

function gamePanel(gameData) {
  const section = document.createElement("section");
  section.className = "panel";
  section.id = "game-data";
  section.append(heading("From the client"));
  const banner = document.createElement("p");
  banner.className = "data-banner";
  banner.textContent = gameData.label;
  section.append(banner);
  section.append(paragraph(gameData.recheck));
  for (const block of gameData.sections) {
    const title = document.createElement("h3");
    title.textContent = block.title;
    section.append(title);
    for (const text of block.paragraphs) section.append(paragraph(text));
  }
  return section;
}

function fromGame(block, gameData) {
  const wrap = document.createElement("div");
  wrap.className = "from-game";
  const banner = document.createElement("p");
  banner.className = "data-banner";
  banner.textContent = gameData.label;
  wrap.append(banner);

  wrap.append(subhead("Evolution chains"));
  wrap.append(bulletList(block.chains, "chains"));
  wrap.append(fold("Synergy pairs", block.synergies));
  wrap.append(fold("Notable passives", block.passives));

  wrap.append(subhead("Scaling"));
  const scaling = paragraph(block.scaling);
  scaling.classList.add("approx");
  wrap.append(scaling);

  wrap.append(subhead("Derived tips"));
  wrap.append(bulletList(block.tips, "derived"));
  const label = document.createElement("p");
  label.className = "tip-label";
  label.textContent = "Derived from game data, not tested in play.";
  wrap.append(label);
  return wrap;
}

function fold(title, items) {
  const details = document.createElement("details");
  details.className = "fold";
  const summary = document.createElement("summary");
  summary.textContent = title;
  details.append(summary);
  details.append(bulletList(items, "pairs"));
  return details;
}

function bulletList(items, className) {
  const list = document.createElement("ul");
  list.className = className;
  for (const text of items) {
    const item = document.createElement("li");
    item.textContent = text;
    list.append(item);
  }
  return list;
}

function subhead(text) {
  const el = document.createElement("h3");
  el.textContent = text;
  return el;
}

function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id && document.getElementById(id);
  if (el && el.tagName === "DETAILS") el.open = true;
}

window.addEventListener("hashchange", openFromHash);

function ruleBlock(rule) {
  const block = document.createElement("div");
  block.className = "rule";
  if (rule.title) {
    const title = document.createElement("h3");
    title.textContent = rule.title;
    block.append(title);
  }
  for (const text of rule.paragraphs) block.append(paragraph(text));
  block.append(cites(rule.cites));
  return block;
}

function tipBlock(tip) {
  const block = document.createElement("aside");
  block.className = "tip";
  const label = document.createElement("p");
  label.className = "tip-label";
  label.textContent = tip.label;
  block.append(label);
  for (const text of tip.paragraphs) block.append(paragraph(text));
  const source = document.createElement("p");
  source.className = "cites";
  source.append("Source: ");
  source.append(link(tip.href, tip.hrefLabel));
  source.append(`. ${tip.note}`);
  block.append(source);
  return block;
}

function sharedCites(skills) {
  const first = JSON.stringify(skills[0].cites);
  if (!skills.every((skill) => JSON.stringify(skill.cites) === first)) return null;
  return skills[0].cites;
}

function cites(list) {
  const el = document.createElement("p");
  el.className = "cites";
  list.forEach((cite, index) => {
    if (index) el.append(" ");
    const bit = document.createElement("span");
    bit.textContent = `Changelog ${cite.build} · ${formatDate(cite.date)}. “${cite.quote}.”`;
    el.append(bit);
  });
  return el;
}

function heading(text) {
  const el = document.createElement("h2");
  el.textContent = text;
  return el;
}

function paragraph(text) {
  const el = document.createElement("p");
  el.textContent = text;
  return el;
}

function note(text) {
  const el = document.createElement("p");
  el.className = "empty-note";
  el.textContent = text;
  return el;
}

function link(href, label) {
  const el = document.createElement("a");
  el.href = href;
  el.textContent = label;
  el.rel = "noopener noreferrer";
  return el;
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${names[month - 1]} ${year}`;
}

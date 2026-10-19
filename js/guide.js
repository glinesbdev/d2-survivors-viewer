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
  root.append(jumpList(data.classes));
  root.append(rulesPanel(data));
  for (const cls of data.classes) root.append(classPanel(cls));
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

function jumpList(classes) {
  const nav = document.createElement("nav");
  nav.className = "tabs class-jump";
  nav.setAttribute("aria-label", "Classes");
  const rules = document.createElement("a");
  rules.className = "tab";
  rules.href = "#rules";
  rules.textContent = "Rules";
  nav.append(rules);
  for (const cls of classes) {
    const link = document.createElement("a");
    link.className = "tab";
    link.href = `#${cls.id}`;
    link.textContent = cls.name;
    nav.append(link);
  }
  return nav;
}

function rulesPanel(data) {
  const section = document.createElement("section");
  section.className = "panel";
  section.id = "rules";
  section.append(heading("Rules"));
  for (const rule of data.general) section.append(ruleBlock(rule));
  return section;
}

function classPanel(cls) {
  const section = document.createElement("section");
  section.className = "panel";
  section.id = cls.id;
  section.append(heading(cls.name));

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

  if (cls.tip) section.append(tipBlock(cls.tip));
  return section;
}

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

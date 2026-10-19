/**
 * Turn save-file mod objects into Diablo II tooltip lines.
 *
 * Charge and proc stats keep the skill level in the name and the amount in
 * `value`: charge:corpseExplosion:14 with value 30 is level 14 and 30 charges,
 * not "+14 charges". Proc chance works the same way.
 */

const SKILL_TABS = {
  0: ["Bow and Crossbow Skills", "Amazon"],
  1: ["Passive and Magic Skills", "Amazon"],
  2: ["Javelin and Spear Skills", "Amazon"],
  3: ["Fire Spells", "Sorceress"],
  4: ["Lightning Spells", "Sorceress"],
  5: ["Cold Spells", "Sorceress"],
  6: ["Curses", "Necromancer"],
  7: ["Poison and Bone Spells", "Necromancer"],
  8: ["Summoning Spells", "Necromancer"],
  9: ["Combat Skills", "Paladin"],
  10: ["Offensive Auras", "Paladin"],
  11: ["Defensive Auras", "Paladin"],
  12: ["Combat Skills", "Barbarian"],
  13: ["Combat Masteries", "Barbarian"],
  14: ["Warcries", "Barbarian"],
  15: ["Summoning Skills", "Druid"],
  16: ["Shape Shifting Skills", "Druid"],
  17: ["Elemental Skills", "Druid"],
  18: ["Traps", "Assassin"],
  19: ["Shadow Disciplines", "Assassin"],
  20: ["Martial Arts", "Assassin"],
};

const CLASS_NAMES = {
  0: "Amazon",
  1: "Sorceress",
  2: "Necromancer",
  3: "Paladin",
  4: "Barbarian",
  5: "Druid",
  6: "Assassin",
};

const PROC_WHEN = {
  hit: "on hit",
  striking: "on striking",
  struck: "when struck",
  kill: "when you kill an enemy",
  death: "when you die",
  attack: "on attack",
  gethit: "when struck",
  levelup: "when you level up",
};

const PLUS_TO = {
  life: "Life",
  mana: "Mana",
  strength: "Strength",
  dexterity: "Dexterity",
  vitality: "Vitality",
  energy: "Energy",
  attackRatingPoints: "Attack Rating",
};

const PLUS_PERCENT = {
  enhancedDamage: "Enhanced Damage",
  enhancedDefense: "Enhanced Defense",
  attackSpeed: "Increased Attack Speed",
  fcr: "Faster Cast Rate",
  frw: "Faster Run/Walk",
  fasterBlock: "Faster Block Rate",
  attackRating: "Bonus to Attack Rating",
  magicFind: "Better Chance of Getting Magic Items",
  goldFind: "Extra Gold from Monsters",
};

const RESISTS = {
  fireResist: "Fire",
  coldResist: "Cold",
  lightningResist: "Lightning",
  poisonResist: "Poison",
};

const RANGES = {
  minDamage: ["maxDamage", null],
  fireMinDamage: ["fireMaxDamage", "Fire"],
  coldMinDamage: ["coldMaxDamage", "Cold"],
  lightningMinDamage: ["lightningMaxDamage", "Lightning"],
  poisonMinDamage: ["poisonMaxDamage", "Poison"],
};

const SOLO_DAMAGE = {
  minDamage: "Minimum Damage",
  maxDamage: "Maximum Damage",
  fireMinDamage: "Minimum Fire Damage",
  fireMaxDamage: "Maximum Fire Damage",
  coldMinDamage: "Minimum Cold Damage",
  coldMaxDamage: "Maximum Cold Damage",
  lightningMinDamage: "Minimum Lightning Damage",
  lightningMaxDamage: "Maximum Lightning Damage",
  poisonMinDamage: "Minimum Poison Damage",
  poisonMaxDamage: "Maximum Poison Damage",
};

export function formatMods(mods) {
  const list = Array.isArray(mods) ? mods.filter((mod) => mod && typeof mod === "object") : [];
  const skip = new Set();
  const pairAt = new Map();

  for (let i = 0; i < list.length; i++) {
    const spec = RANGES[list[i].stat];
    if (!spec) continue;
    const maxStat = spec[0];
    for (let j = 0; j < list.length; j++) {
      if (i === j || skip.has(j) || pairAt.has(j)) continue;
      if (list[j].stat !== maxStat) continue;
      const first = Math.min(i, j);
      const second = Math.max(i, j);
      pairAt.set(first, second);
      skip.add(second);
      break;
    }
  }

  const lines = [];
  for (let i = 0; i < list.length; i++) {
    if (skip.has(i)) continue;
    const partner = pairAt.get(i);
    if (partner == null) {
      lines.push(formatSingle(list[i]));
      continue;
    }
    const left = list[i];
    const right = list[partner];
    const minMod = RANGES[left.stat] ? left : right;
    const maxMod = minMod === left ? right : left;
    lines.push(formatRange(minMod, maxMod, RANGES[minMod.stat][1]));
  }
  return lines;
}

export function describeItem(item) {
  const lines = [];
  if (!item || typeof item !== "object") return lines;
  if (typeof item.defense === "number") {
    lines.push({ text: `Defense: ${formatNumber(item.defense)}`, tone: "base" });
  }
  lines.push(...formatMods(item.mods));
  const sockets = Array.isArray(item.stats)
    ? item.stats.find((stat) => stat && stat.stat === "item_numsockets" && stat.value)
    : null;
  if (sockets) {
    lines.push({ text: `Socketed (${formatNumber(sockets.value)})`, tone: "mod" });
  }
  if (typeof item.level === "number" && item.level > 0) {
    lines.push({ text: `Item Level: ${formatNumber(item.level)}`, tone: "meta" });
  }
  return lines;
}

function formatRange(minMod, maxMod, element) {
  const a = minMod.value;
  const b = maxMod.value;
  const same = a === b;
  let text;
  if (element === "Poison") {
    const core = same
      ? `+${formatNumber(a)} Poison Damage`
      : `Adds ${formatNumber(a)}-${formatNumber(b)} Poison Damage`;
    const length = minMod.length ?? maxMod.length;
    text = length == null ? core : `${core} over ${formatPoisonSeconds(length)}`;
  } else if (element) {
    text = same
      ? `+${formatNumber(a)} ${element} Damage`
      : `Adds ${formatNumber(a)}-${formatNumber(b)} ${element} Damage`;
  } else {
    text = same
      ? `+${formatNumber(a)} Damage`
      : `Adds ${formatNumber(a)}-${formatNumber(b)} Damage`;
  }
  const tone = toneOf(minMod) === "base" && toneOf(maxMod) === "base" ? "base" : "mod";
  return { text, tone };
}

function formatSingle(mod) {
  return { text: formatStat(String(mod.stat ?? ""), mod.value, mod), tone: toneOf(mod) };
}

function formatStat(stat, value, mod) {
  const charge = /^charge:([^:]+):(\d+)$/.exec(stat);
  if (charge) {
    const amount = Number(value);
    const word = amount === 1 ? "Charge" : "Charges";
    return `Level ${charge[2]} ${wordsFromId(charge[1])} (${formatNumber(amount)} ${word})`;
  }

  const proc = /^proc:([^:]+):([^:]+):(\d+)$/.exec(stat);
  if (proc) {
    const when = PROC_WHEN[proc[1]] || `on ${wordsFromId(proc[1]).toLowerCase()}`;
    return `${formatNumber(value)}% Chance to cast level ${proc[3]} ${wordsFromId(proc[2])} ${when}`;
  }

  const skill = /^skill:(.+)$/.exec(stat);
  if (skill) return `${signed(value)} to ${wordsFromId(skill[1])}`;

  const tab = /^skilltab(\d+)$/.exec(stat);
  if (tab) {
    const info = SKILL_TABS[Number(tab[1])];
    if (!info) return `${signed(value)} to Skill Tab ${tab[1]}`;
    return `${signed(value)} to ${info[0]} (${info[1]} Only)`;
  }

  const classSkills = /^classskills(\d+)$/.exec(stat);
  if (classSkills) {
    const name = CLASS_NAMES[Number(classSkills[1])];
    if (!name) return `${signed(value)} to Class ${classSkills[1]} Skills`;
    return `${signed(value)} to ${name} Skill Levels`;
  }

  if (PLUS_TO[stat]) return `${signed(value)} to ${PLUS_TO[stat]}`;
  if (PLUS_PERCENT[stat]) return `${signed(value)}% ${PLUS_PERCENT[stat]}`;
  if (RESISTS[stat]) return `${RESISTS[stat]} Resist ${signed(value)}%`;

  const maxResist = /^max(Fire|Cold|Lightning|Poison)Resist$/.exec(stat);
  if (maxResist) return `${signed(value)}% to Maximum ${maxResist[1]} Resist`;

  if (stat === "allSkills") return `${signed(value)} to All Skills`;
  if (stat === "fireSkills" || stat === "coldSkills" || stat === "lightningSkills") {
    return `${signed(value)} to ${wordsFromId(stat)}`;
  }
  if (stat === "lifePerLevel") return `${signed(value / 8)} to Life (Based on Character Level)`;
  if (stat === "manaPerLevel") return `${signed(value / 8)} to Mana (Based on Character Level)`;
  if (stat === "attackDamage" || stat === "damage") {
    if (mod.implicit || mod.auto) return `Damage: ${formatNumber(value)}`;
    return `${signed(value)} Damage`;
  }
  if (stat === "damageReduction") return formatDamageReduction(value, mod);
  if (stat === "missileReduction") {
    return `${formatNumber(ratioToPercent(value))}% Damage Reduction vs. Missiles`;
  }
  if (stat === "damageReduced") return `Damage Reduced by ${formatNumber(value)}`;
  if (stat === "magicReduced") return `Magic Damage Reduced by ${formatNumber(value)}`;
  if (stat === "block") return `${formatNumber(value)}% Increased Chance of Blocking`;
  if (stat === "lifeLeech") return `${formatNumber(value)}% Life stolen per hit`;
  if (stat === "manaLeech") return `${formatNumber(value)}% Mana stolen per hit`;
  if (stat === "crushingBlow") return `${formatNumber(value)}% Chance of Crushing Blow`;
  if (stat === "openWounds") return `${formatNumber(value)}% Chance of Open Wounds`;
  if (stat === "slowTarget") return `Slows Target by ${formatNumber(value)}%`;
  if (stat === "poisonLength") return `Poison Length Reduced by ${formatNumber(value)}%`;
  if (stat === "preventHeal") return "Prevent Monster Heal";
  if (stat === "thorns") return `Attacker Takes Damage of ${formatNumber(value)}`;
  if (stat === "lightningThorns") return `Attacker Takes Lightning Damage of ${formatNumber(value)}`;
  if (stat === "replenishLife") return `Replenish Life ${signed(value)}`;
  if (stat === "lightRadius") return `${signed(value)} to Light Radius`;
  if (stat === "explosiveArrows") return `Fires Level ${formatNumber(value)} Explosive Arrows`;
  if (stat === "pickup") return `${signed(value)}% Increased Pickup Range`;
  if (SOLO_DAMAGE[stat]) {
    let text = `${signed(value)} to ${SOLO_DAMAGE[stat]}`;
    if (stat.startsWith("poison") && mod.length != null) text += ` over ${formatPoisonSeconds(mod.length)}`;
    return text;
  }

  return fallback(stat, value);
}

function formatDamageReduction(value, mod) {
  if (mod.implicit) return `Damage Reduction: ${formatNumber(value)}`;
  if (typeof value === "number" && Number.isInteger(value)) {
    return `Damage Reduced by ${formatNumber(value)}%`;
  }
  return `${formatNumber(ratioToPercent(value))}% Damage Reduction`;
}

function ratioToPercent(value) {
  if (typeof value !== "number") return value;
  if (!Number.isInteger(value)) return value * 100;
  return value;
}

function formatPoisonSeconds(length) {
  const shown = formatNumber(length / 25);
  return `${shown} ${shown === "1" ? "second" : "seconds"}`;
}

function fallback(stat, value) {
  const label = String(stat)
    .split(":")
    .map((part) => wordsFromId(part))
    .join(" ");
  if (value == null || value === "") return label || "Unknown";
  if (typeof value === "number") return `${signed(value)} ${label}`;
  return `${label}: ${value}`;
}

function toneOf(mod) {
  return mod && (mod.implicit || mod.auto) ? "base" : "mod";
}

export function wordsFromId(id) {
  return String(id)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  const rounded = Math.round(value * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return rounded.toFixed(1);
}

function signed(value) {
  const shown = formatNumber(value);
  if (typeof value === "number" && value > 0) return `+${shown}`;
  return shown;
}

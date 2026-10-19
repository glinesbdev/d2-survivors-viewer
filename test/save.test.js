import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { decodeSaveCode, encodeSaveCode, SaveCodeError } from "../js/decode.js";
import { describeItem, formatMods } from "../js/format.js";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/example-save.json", import.meta.url), "utf8"));

function zlibCode(json) {
  const bytes = deflateSync(Buffer.from(json));
  const payload = Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `D2S1:${payload}`;
}

test("round-trips the synthetic save through pako", () => {
  const code = encodeSaveCode(fixture);
  assert.equal(code.startsWith("D2S1:"), true);
  assert.equal(code.includes("="), false);
  assert.equal(code.includes("+"), false);
  assert.equal(code.includes("/"), false);
  assert.equal(code.slice(5, 7), "eJ");
  assert.deepEqual(decodeSaveCode(code), fixture);
});

test("decodes a node zlib payload, including whitespace and quotes", () => {
  const code = zlibCode(JSON.stringify(fixture));
  const messy = `\n"${code.slice(0, 24)}\n${code.slice(24)}"\n`;
  assert.deepEqual(decodeSaveCode(messy), fixture);
});

test("rejects codes that are not saves", () => {
  assert.throws(() => decodeSaveCode("   "), (error) => {
    assert.ok(error instanceof SaveCodeError);
    assert.match(error.message, /Paste a save code/);
    return true;
  });
  assert.throws(() => decodeSaveCode("not-a-code"), /D2S1:/);
  assert.throws(() => decodeSaveCode("D2S1:!!!!"), /couldn't be read/);
  assert.throws(() => decodeSaveCode("D2S1:AAAA"), /couldn't be decompressed/);
  const notJson = zlibCode("hello");
  assert.throws(() => decodeSaveCode(notJson), /aren't a save file/);
  const noVersion = zlibCode(JSON.stringify({ gold: 1 }));
  assert.throws(() => decodeSaveCode(noVersion), /isn't a D2 Survivors save/);
});

test("formats mods as readable Diablo II lines", () => {
  const lines = formatMods([
    { stat: "enhancedDamage", value: 120 },
    { stat: "attackSpeed", value: 20 },
    { stat: "life", value: 25 },
    { stat: "fireResist", value: 20 },
    { stat: "magicFind", value: 18 },
    { stat: "damageReduction", value: 0.25 },
    { stat: "damageReduction", value: 10 },
    { stat: "skilltab14", value: 2 },
    { stat: "charge:corpseExplosion:14", value: 30 },
    { stat: "proc:hit:boneSpear:16", value: 50 },
    { stat: "mysteryTwist", value: 7 },
    { stat: "poisonLength", value: 25 },
  ]).map((line) => line.text);

  assert.deepEqual(lines, [
    "+120% Enhanced Damage",
    "+20% Increased Attack Speed",
    "+25 to Life",
    "Fire Resist +20%",
    "+18% Better Chance of Getting Magic Items",
    "25% Damage Reduction",
    "Damage Reduced by 10%",
    "+2 to Warcries (Barbarian Only)",
    "Level 14 Corpse Explosion (30 Charges)",
    "50% Chance to cast level 16 Bone Spear on hit",
    "+7 Mystery Twist",
    "Poison Length Reduced by 25%",
  ]);
});

test("pairs damage ranges and formats the example weapon", () => {
  const paired = formatMods([
    { stat: "fireMinDamage", value: 3 },
    { stat: "life", value: 4 },
    { stat: "fireMaxDamage", value: 6 },
    { stat: "poisonMinDamage", value: 204, length: 100 },
    { stat: "poisonMaxDamage", value: 204 },
    { stat: "proc:struck:poisonNova:5", value: 5 },
    { stat: "lifePerLevel", value: 12 },
    { stat: "lightRadius", value: -2 },
    { stat: "skill:fireBall", value: 2 },
    { stat: "classskills1", value: 1 },
  ]).map((line) => line.text);

  assert.deepEqual(paired, [
    "Adds 3-6 Fire Damage",
    "+4 to Life",
    "+204 Poison Damage over 4 seconds",
    "5% Chance to cast level 5 Poison Nova when struck",
    "+1.5 to Life (Based on Character Level)",
    "-2 to Light Radius",
    "+2 to Fire Ball",
    "+1 to Sorceress Skill Levels",
  ]);

  const weapon = describeItem(fixture.equippedByClass.barbarian.weapon).map((line) => line.text);
  assert.deepEqual(weapon, [
    "Damage: 24",
    "+120% Enhanced Damage",
    "+20% Increased Attack Speed",
    "Level 14 Corpse Explosion (30 Charges)",
    "50% Chance to cast level 16 Bone Spear on hit",
    "+7 Mystery Twist",
    "Socketed (2)",
    "Item Level: 40",
  ]);
});

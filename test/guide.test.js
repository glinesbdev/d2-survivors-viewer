import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guide = JSON.parse(readFileSync(new URL("../data/guide.json", import.meta.url), "utf8"));

const CLASSES = ["Amazon", "Sorceress", "Necromancer", "Paladin", "Barbarian", "Druid", "Assassin"];
const EVOLVED = {
  Sorceress: ["Meteor", "Blizzard"],
  Necromancer: ["Iron Golem"],
  Druid: ["Hurricane"],
  Assassin: ["Claws of Thunder", "Blade Shield", "Shadow Master"],
};

test("guide lists the seven classes and only the changelog's evolved skills", () => {
  assert.deepEqual(guide.classes.map((cls) => cls.name), CLASSES);
  assert.equal(guide.classesNote.includes("Warlock is not"), true);
  const evolved = new Map(guide.classes.map((cls) => [cls.name, cls.evolved.map((skill) => skill.name)]));
  for (const name of CLASSES) {
    assert.deepEqual(evolved.get(name), EVOLVED[name] || []);
  }
  const flat = [...evolved.values()].flat();
  assert.equal(flat.length, 7);
  for (const skill of guide.classes.flatMap((cls) => cls.evolved)) {
    assert.match(skill.detail, /does not name/);
    assert.ok(skill.cites.length);
  }
});

test("every rule cites a changelog build, and the barbarian tip is labeled", () => {
  const blocks = [
    ...guide.general,
    ...guide.classes.flatMap((cls) => cls.rules),
    ...guide.classes.flatMap((cls) => cls.evolved),
  ];
  for (const block of blocks) {
    assert.ok(block.cites.length);
    for (const cite of block.cites) {
      assert.match(cite.build, /^2026\d{4}\.\d+$/);
      assert.match(cite.date, /^2026-10-1[5-8]$/);
      assert.ok(cite.quote.length > 10);
    }
  }
  const barbarian = guide.classes.find((cls) => cls.name === "Barbarian");
  assert.match(barbarian.tip.label, /Fan tip/);
  assert.equal(barbarian.tip.href, "https://d2survivors.com/guide/");
  assert.equal(guide.classes.filter((cls) => cls.tip).length, 1);
});

test("client data is labeled, approximate, and free of unread placeholders", () => {
  assert.match(guide.gameData.label, /not tested in play/i);
  assert.match(guide.gameData.label, /game-CIkDLfxB\.js/);
  assert.match(guide.gameData.label, /20261018\.8/);
  const blob = JSON.stringify(guide);
  assert.equal(blob.includes("(value scales"), false);
  assert.equal(blob.includes("see bundle"), false);
  assert.match(blob, /Medium confidence/);
  for (const cls of guide.classes) {
    assert.ok(cls.fromGame.chains.length >= 4);
    assert.ok(cls.fromGame.synergies.length >= 3);
    assert.ok(cls.fromGame.passives.length >= 4);
    assert.ok(cls.fromGame.tips.length >= 5 && cls.fromGame.tips.length <= 6);
    assert.match(cls.fromGame.scaling, /Calculated, approximate/);
  }
  const sorc = guide.classes.find((cls) => cls.name === "Sorceress").fromGame.chains.join(" ");
  assert.match(sorc, /Fire Bolt/);
  assert.match(sorc, /Fire Ball/);
  assert.match(sorc, /Meteor/);
  const amazon = guide.classes.find((cls) => cls.name === "Amazon").fromGame.chains.join(" ");
  assert.match(amazon, /Cold Arrow \+ Dodge/);
  assert.match(amazon, /Ice Arrow at 18/);
});

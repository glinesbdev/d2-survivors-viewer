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

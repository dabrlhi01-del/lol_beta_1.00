import fs from "node:fs/promises";
import path from "node:path";

const locale = "ko_KR";
const versionsUrl = "https://ddragon.leagueoflegends.com/api/versions.json";
const versions = await fetch(versionsUrl).then(r => {
  if (!r.ok) throw new Error(`versions ${r.status}`);
  return r.json();
});
const version = versions[0];
const base = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${locale}`;

const [championJson, itemJson, runeJson] = await Promise.all([
  fetch(`${base}/champion.json`).then(r => r.json()),
  fetch(`${base}/item.json`).then(r => r.json()),
  fetch(`${base}/runesReforged.json`).then(r => r.json()),
]);

const champions = Object.values(championJson.data).sort((a,b)=>a.name.localeCompare(b.name,"ko"));
const items = Object.entries(itemJson.data)
  .map(([id,x])=>({id,...x}))
  .filter(x => x.gold?.purchasable && x.gold?.total > 0 && !x.hideFromAll)
  .sort((a,b)=>a.name.localeCompare(b.name,"ko"));

const runes = runeJson.flatMap(tree =>
  tree.slots.flatMap(slot => slot.runes.map(r => ({...r, treeName:tree.name})))
);

const snapshot = {
  version,
  assetVersion: version,
  locale,
  generatedAt: new Date().toISOString(),
  isDemo: false,
  champions,
  items,
  runes
};

const js = `window.LOL_SNAPSHOT = ${JSON.stringify(snapshot)};\n`;
const versionDir = path.join("data", version);
await fs.mkdir(versionDir, {recursive:true});
await fs.writeFile(path.join(versionDir, "snapshot.js"), js, "utf8");
await fs.writeFile(path.join("data", "current.js"), js, "utf8");
await fs.writeFile(path.join("data", "manifest.json"), JSON.stringify({
  current:version, locale, generatedAt:snapshot.generatedAt,
  championCount:champions.length, itemCount:items.length, runeCount:runes.length
}, null, 2), "utf8");

console.log(`Updated ${version}: ${champions.length} champions, ${items.length} items, ${runes.length} runes`);

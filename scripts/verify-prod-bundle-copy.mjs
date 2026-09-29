const BASE = "https://groupenettoyageempire.com";

const home = await fetch(`${BASE}/`).then((r) => r.text());
const prodScripts = [...home.matchAll(/src=\"(\/_astro\/[^\"]+\.js)\"/g)].map((m) => m[1]);
let blob = "";
for (const s of prodScripts.slice(0, 12)) {
  blob += await fetch(`${BASE}${s}`).then((r) => r.text());
}

console.log(
  JSON.stringify(
    {
      prodScriptCount: prodScripts.length,
      neutralFr: blob.includes("Comment souhaitez-vous nous joindre"),
      neutralEn: blob.includes("How would you like to contact us"),
      eveningTitle: blob.includes("Nous sommes encore disponibles ce soir"),
      weekendTitle: blob.includes("Nous sommes disponibles la fin de semaine"),
      bodyUntil21: blob.includes("21 h") || blob.includes("9:00 p.m."),
      layoutPopupInHtml: home.includes('id="after-hours-phone-popup"'),
      layoutModalInHtml: home.includes('id="header-choice-modal"'),
    },
    null,
    2,
  ),
);

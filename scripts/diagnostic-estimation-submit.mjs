#!/usr/bin/env node
/**
 * Tests Netlify submission + diag steps with the SAME JSON body as captured from DevTools (5 articles).
 *
 * Usage:
 *   set SITE=https://ton-domaine.com
 *   set ESTIMATION_DIAG_KEY=la_même_clé_que_sur_Netlify
 *   node scripts/diagnostic-estimation-submit.mjs payload-5-articles.json
 *
 * Sortie : pour chaque étape — httpStatus, x-request-id, x-submit-stage, corps (tronqué).
 * Copier-coller la sortie complète pour corrélation avec les logs Netlify (filtrer par requestId).
 */

import fs from "node:fs";

const site = process.env.SITE?.replace(/\/$/, "") || "";
const diagKey = process.env.ESTIMATION_DIAG_KEY || "";

const payloadPath = process.argv[2];
if (!site || !diagKey || !payloadPath) {
    console.error(
        "Usage: SITE=https://votre-site.com ESTIMATION_DIAG_KEY=secret node scripts/diagnostic-estimation-submit.mjs payload.json",
    );
    process.exit(1);
}

const body = fs.readFileSync(payloadPath, "utf8");
const fnUrl = `${site}/.netlify/functions/submit-demande-estimation`;

async function post(label, url, headers) {
    const r = await fetch(url, {
        method: "POST",
        headers,
        body,
    });
    const text = await r.text();
    let parsed = null;
    try {
        parsed = JSON.parse(text);
    } catch {
        parsed = null;
    }
    return {
        label,
        httpStatus: r.status,
        xRequestId: r.headers.get("x-request-id"),
        xSubmitStage: r.headers.get("x-submit-stage"),
        bodyRaw: text.length > 6000 ? text.slice(0, 6000) + "…[truncated]" : text,
        bodyParsed: parsed,
    };
}

const jsonHeaders = {
    "Content-Type": "application/json; charset=utf-8",
};
const diagHeaders = {
    ...jsonHeaders,
    "x-estimation-diag-key": diagKey,
};

console.log(JSON.stringify({ note: "payloadBytes", bytes: Buffer.byteLength(body, "utf8") }));

const steps = ["prod-normal", "a", "b", "c", "d", "e"];

for (const step of steps) {
    let result;
    if (step === "prod-normal") {
        result = await post(step, fnUrl, jsonHeaders);
    } else {
        result = await post(step, `${fnUrl}?diag=${step}`, diagHeaders);
    }
    console.log(JSON.stringify(result, null, 2));
}

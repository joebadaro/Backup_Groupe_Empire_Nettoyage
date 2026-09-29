import type { FormattedEstimation } from "./types";

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Préserve **gras** déjà présent dans le texte collé. */
function inlineFormat(line: string): string {
  const escaped = escapeHtml(line);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

const BULLET_LINE =
  /^(\s*)([-•*–—]|\d+[.)])\s+(.*)$/;

/** Lignes de prix ou suite d'article — ne jamais traiter comme puce. */
function isPriceOrContinuationLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^\d[\d\s,.]*\s*\$/.test(t)) return true;
  if (/^\d[\d\s,.]*(plus taxes|taxes incluses)/i.test(t)) return true;
  if (/\d[\d\s,.]*\s*\$/.test(t) && /plus taxes|taxes incluses/i.test(t)) return true;
  if (/^\$?\s*\d/.test(t) && /\$|plus taxes|taxes incluses/i.test(t)) return true;
  return false;
}

function isBulletLine(line: string): boolean {
  const t = line.trim();
  if (!t || isPriceOrContinuationLine(t)) return false;
  return BULLET_LINE.test(t);
}

function bulletBody(line: string): string {
  const m = line.trim().match(BULLET_LINE);
  return m?.[3] ?? line.trim();
}

function trimBlockLines(block: string): string[] {
  const lines = block.split("\n").map((l) => l.trimEnd());
  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function formatBlock(block: string): string {
  const lines = trimBlockLines(block);
  if (!lines.length) return "";

  const chunks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (isBulletLine(line)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim() && isBulletLine(lines[i])) {
        let itemHtml = inlineFormat(bulletBody(lines[i]));
        i += 1;
        while (i < lines.length && lines[i].trim() && isPriceOrContinuationLine(lines[i])) {
          itemHtml += `<br />${inlineFormat(lines[i].trim())}`;
          i += 1;
        }
        items.push(`<li>${itemHtml}</li>`);
      }
      chunks.push(`<ul class="ae-list">${items.join("")}</ul>`);
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBulletLine(lines[i])) {
      paraLines.push(inlineFormat(lines[i]));
      i += 1;
    }
    chunks.push(`<p>${paraLines.join("<br />")}</p>`);
  }

  return chunks.join("");
}

/**
 * Convertit un texte collé en HTML pour la boîte centrale.
 * Ne réécrit pas le contenu : paragraphes, sauts de ligne et puces préservés.
 */
export function formatPastedText(raw: string): FormattedEstimation {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const plainText = normalized.trimEnd();
  if (!plainText.trim()) {
    return { html: "", plainText: "" };
  }

  const blocks = plainText.split(/\n\n+/);
  const html = blocks.map(formatBlock).filter(Boolean).join("");

  return { html, plainText };
}

export function validatePastedText(raw: string): string[] {
  if (!raw.replace(/\r\n/g, "\n").trim()) {
    return ["Veuillez saisir ou coller le texte de l'estimation."];
  }
  return [];
}

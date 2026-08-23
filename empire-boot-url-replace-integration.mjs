import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_PLACEHOLDER = "__EMPIRE_BOOT_PUBLIC_URL__";
const PRIVATE_PLACEHOLDER = "__EMPIRE_BOOT_PRIVATE_URL__";

/**
 * Remplace les placeholders du scheduler inline par les vraies URLs /_astro/*.js
 * (évite les file:// SSR Netlify issus de import.meta.ROLLUP_FILE_URL_*).
 */
export function empireBootUrlReplaceIntegration() {
  return {
    name: "empire-boot-url-replace",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const outDir = fileURLToPathSafe(dir);
        const astroDir = path.join(outDir, "_astro");
        if (!fs.existsSync(astroDir)) return;

        const files = fs.readdirSync(astroDir);
        const publicFile = files.find(
          (f) =>
            f.startsWith("boot-deferred-site-scripts.") && f.endsWith(".js"),
        );
        const privateFile = files.find(
          (f) =>
            f.startsWith("boot-deferred-private-scripts.") &&
            f.endsWith(".js"),
        );

        if (!publicFile && !privateFile) {
          console.warn(
            "[empire-boot-url-replace] boot chunks introuvables dans _astro/",
          );
          return;
        }

        const publicUrl = publicFile ? `/_astro/${publicFile}` : "";
        const privateUrl = privateFile ? `/_astro/${privateFile}` : "";

        replaceInHtmlTree(outDir, publicUrl, privateUrl);
        console.log(
          `[empire-boot-url-replace] public=${publicUrl || "(none)"} private=${privateUrl || "(none)"}`,
        );
      },
    },
  };
}

function fileURLToPathSafe(dir) {
  if (typeof dir === "string") return dir;
  if (dir && typeof dir.href === "string") {
    return fileURLToPath(dir);
  }
  return String(dir);
}

function replaceInHtmlTree(root, publicUrl, privateUrl) {
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_astro" || entry.name === "images") continue;
        stack.push(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      let html = fs.readFileSync(full, "utf8");
      if (
        !html.includes(PUBLIC_PLACEHOLDER) &&
        !html.includes(PRIVATE_PLACEHOLDER)
      ) {
        continue;
      }
      html = html
        .split(PUBLIC_PLACEHOLDER)
        .join(publicUrl)
        .split(PRIVATE_PLACEHOLDER)
        .join(privateUrl);
      fs.writeFileSync(full, html);
    }
  }
}

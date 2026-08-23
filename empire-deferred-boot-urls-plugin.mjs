/**
 * Émet les entrées boot différées comme vrais chunks client Vite.
 * Les URLs hashed sont injectées dans le HTML via placeholders + integration post-build
 * (évite file:// SSR Netlify).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export const EMPIRE_BOOT_PUBLIC_PLACEHOLDER = "__EMPIRE_BOOT_PUBLIC_URL__";
export const EMPIRE_BOOT_PRIVATE_PLACEHOLDER = "__EMPIRE_BOOT_PRIVATE_URL__";

export function empireDeferredBootUrlsPlugin() {
  return {
    name: "empire-deferred-boot-urls",
    buildStart() {
      this.emitFile({
        type: "chunk",
        id: path.resolve(rootDir, "src/scripts/boot-deferred-site-scripts.ts"),
        name: "boot-deferred-site-scripts",
      });
      this.emitFile({
        type: "chunk",
        id: path.resolve(
          rootDir,
          "src/scripts/boot-deferred-private-scripts.ts",
        ),
        name: "boot-deferred-private-scripts",
      });
    },
  };
}

/**
 * vinext on Windows embeds absolute filesystem paths in Google Font CSS.
 * Rewrite them to the Vite-dev URL prefix served by vinext's font middleware.
 */
import type { Plugin } from "vite";
import path from "node:path";

export function vinextWindowsFontFix(): Plugin {
  return {
    name: "highbury:vinext-windows-font-fix",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes(".vinext") && !code.includes(".vinext/fonts")) return null;
      if (!code.includes("url(C:/") && !code.includes("url(c:/")) return null;

      const root = this.environment?.config?.root ?? process.cwd();
      const cacheDir = path.join(root, ".vinext", "fonts").replaceAll("\\", "/");
      const served = "/assets/_vinext_fonts";
      const next = code.split(cacheDir).join(served);
      if (next === code) return null;
      return { code: next, map: null };
    },
    transformIndexHtml(html) {
      const root = process.cwd().replaceAll("\\", "/");
      const cacheDir = `${root}/.vinext/fonts`;
      if (!html.includes(cacheDir) && !html.includes("url(C:/")) return html;
      return html
        .split(cacheDir)
        .join("/assets/_vinext_fonts")
        .replace(
          /url\((?:file:\/\/\/)?[A-Za-z]:\/[^)]*?\/\.vinext\/fonts\//g,
          "url(/assets/_vinext_fonts/",
        );
    },
  };
}

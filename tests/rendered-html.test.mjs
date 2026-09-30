import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync } from "node:fs";
import path from "node:path";
import { Miniflare } from "miniflare";

// The application imports cloudflare:workers. Execute its HTML contract
// in workerd, the same runtime as the API, rather than importing it in Node.
test("renders all five FPSO pages in the Worker runtime", async () => {
  const root = path.resolve("dist/server");
  const files = readdirSync(root, { recursive: true })
    .filter((file) => /\.m?js$/.test(file))
    .sort((a, b) => a === "index.js" ? -1 : b === "index.js" ? 1 : a.localeCompare(b));
  const mf = new Miniflare({
    modules: files.map((file) => ({ type: "ESModule", path: path.join(root, file) })),
    modulesRoot: root,
    compatibilityDate: "2026-05-15",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    r2Buckets: ["BUCKET"],
    cf: false,
  });
  try {
    for (const [route, title] of [
      ["/", "FPSO Atlântico | Explorador 3D"],
      ["/submarino", "FPSO Atlântico | Explorador 3D"],
      ["/supply-chain", "Supply chain | Offshore Explorer"],
      ["/inspecoes", "Inspeção visual | FPSO Atlântico"],
      ["/multiescala", "Do campo ao sensor | FPSO Atlântico"],
    ]) {
      const response = await mf.dispatchFetch(`https://fpso.example.test${route}`, {
        headers: { accept: "text/html" },
      });
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, route);
      const html = await response.text();
      assert.match(html, /<html[^>]*lang="pt-BR"/, route);
      assert.ok(html.includes(`<title>${title}</title>`), `Missing page title: ${route}`);
    }
  } finally {
    await mf.dispose();
  }
});

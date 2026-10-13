import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const outputDirectory = join(process.cwd(), "apps", "desktop", "out", "preload");
const files = (await readdir(outputDirectory)).sort();
if (files.length !== 1 || files[0] !== "index.cjs") {
  throw new Error(`Expected only out/preload/index.cjs; found: ${files.join(", ") || "nothing"}`);
}

const source = await readFile(join(outputDirectory, "index.cjs"), "utf8");
const assertions = [
  [!/^\s*(?:import|export)\s/m.test(source), "preload must not contain ESM import/export syntax"],
  [!source.includes("@atlas-nexus/"), "preload must not retain workspace package imports"],
  [/require\(["']electron["']\)/.test(source), "preload must load Electron through CommonJS require"],
  [/exposeInMainWorld\(["']nexus["']/.test(source), "preload must expose window.nexus"]
];
for (const [passed, message] of assertions) if (!passed) throw new Error(message);
console.log(`Verified bundled CommonJS preload: ${files[0]} (${Buffer.byteLength(source)} bytes)`);

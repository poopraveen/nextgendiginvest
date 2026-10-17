// Writes the demo sample documents to /public/samples so their fingerprints match the seeded vault.
import { writeFileSync, mkdirSync } from "node:fs";
import { SAMPLE_DOCS } from "../lib/sampleDocs.ts";

mkdirSync("public/samples", { recursive: true });
for (const [name, content] of Object.entries(SAMPLE_DOCS)) writeFileSync(`public/samples/${name}`, content);
console.log("wrote", Object.keys(SAMPLE_DOCS).length, "samples");

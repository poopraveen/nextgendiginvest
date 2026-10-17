import { sha256Hex } from "./ledger";

/** SHA-256 of a file, computed on the person's own device. The file is never uploaded anywhere. */
export async function hashFile(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256Hex(buf);
}

import { deflate, inflate } from "../vendor/pako.esm.mjs";

export const SAVE_PREFIX = "D2S1:";

export class SaveCodeError extends Error {
  constructor(message) {
    super(message);
    this.name = "SaveCodeError";
  }
}

/**
 * Turn a pasted or uploaded share code into the save object.
 * `inflate` defaults to pako and can be replaced in tests.
 */
export function decodeSaveCode(code, options = {}) {
  const inflateFn = options.inflate || inflateToString;
  const compact = normalizeSaveCode(code);
  if (!compact) {
    throw new SaveCodeError("Paste a save code or choose a file.");
  }
  if (!compact.startsWith(SAVE_PREFIX)) {
    throw new SaveCodeError("That doesn't look like a D2 Survivors code. Codes start with D2S1:.");
  }

  const payload = compact.slice(SAVE_PREFIX.length);
  let bytes;
  try {
    bytes = base64UrlToBytes(payload);
  } catch {
    throw new SaveCodeError("That code couldn't be read. Check that you copied the whole thing.");
  }

  let text;
  try {
    text = toText(inflateFn(bytes));
  } catch {
    throw new SaveCodeError("That code couldn't be decompressed. It may be incomplete.");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SaveCodeError("That code opened, but the contents aren't a save file.");
  }

  if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.version !== "number") {
    throw new SaveCodeError("That file isn't a D2 Survivors save.");
  }
  return data;
}

/** Encode a save object the same way the game does, for the example button and tests. */
export function encodeSaveCode(data) {
  const json = JSON.stringify(data);
  const bytes = deflate(json);
  return SAVE_PREFIX + bytesToBase64Url(bytes);
}

export function normalizeSaveCode(code) {
  if (typeof code !== "string") return "";
  let text = code.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/\s+/g, "");
}

function inflateToString(bytes) {
  return inflate(bytes, { to: "string" });
}

function toText(result) {
  if (typeof result === "string") return result;
  return new TextDecoder().decode(result);
}

function base64UrlToBytes(input) {
  if (!input || /[^A-Za-z0-9\-_]/.test(input)) {
    throw new Error("bad base64");
  }
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  if (pad === 1) throw new Error("bad base64");
  const b64 = pad ? padded + "=".repeat(4 - pad) : padded;
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes) {
  let b64;
  if (typeof Buffer !== "undefined") {
    b64 = Buffer.from(bytes).toString("base64");
  } else {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Generate portal locale JSON using Google Translate (unofficial gtx client).
 * Resumes from cache. Run: node scripts/generate-portal-locales.mjs [te kn mr gu bn]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalDir = path.join(__dirname, "..", "messages", "portal");
const cacheDir = path.join(__dirname, ".portal-locale-cache");

const ALL_LOCALES = [
  { code: "te", to: "te" },
  { code: "kn", to: "kn" },
  { code: "mr", to: "mr" },
  { code: "gu", to: "gu" },
  { code: "bn", to: "bn" },
  { code: "ml", to: "ml" },
  { code: "pa", to: "pa" },
  { code: "or", to: "or" },
  { code: "as", to: "as" },
];

const ABBREV = [
  "GSTIN", "CGST", "SGST", "IGST", "GST", "KYC", "PAN", "IFSC", "OTP",
  "PDF", "RCM", "HSN", "SAC", "UOM", "MSME", "INR", "NGO", "LLP", "OPC",
  "Excel", "JPEG", "JPG", "PNG", "A/C", "Pvt Ltd", "Shree Maruti",
];

const REQUEST_DELAY_MS = 400;
const MAX_RETRIES = 8;

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function leafEntries(obj, p = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = p ? `${p}.${k}` : k;
    if (typeof v === "object" && v && !Array.isArray(v)) out.push(...leafEntries(v, key));
    else out.push([key, v]);
  }
  return out;
}

function setPath(obj, pathStr, val) {
  const parts = pathStr.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = val;
}

function protect(text) {
  const slots = [];
  let t = text;
  t = t.replace(/<([a-zA-Z]+)>[\s\S]*?<\/\1>/g, (m) => {
    const i = slots.length;
    slots.push(m);
    return `⟦TAG${i}⟧`;
  });
  t = t.replace(/\{[a-zA-Z]+\}/g, (m) => {
    const i = slots.length;
    slots.push(m);
    return `⟦PH${i}⟧`;
  });
  for (const a of ABBREV) {
    const re = new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    t = t.replace(re, (m) => {
      const i = slots.length;
      slots.push(m);
      return `⟦PH${i}⟧`;
    });
  }
  return { text: t, slots };
}

function restore(text, slots) {
  let t = text;
  for (let i = 0; i < slots.length; i++) {
    t = t.replace(new RegExp(`⟦\\s*TAG${i}\\s*⟧`, "g"), () => slots[i]);
    t = t.replace(new RegExp(`⟦\\s*PH${i}\\s*⟧`, "g"), () => slots[i]);
  }
  return t;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function googleTranslate(text, to) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=" +
    encodeURIComponent(to) +
    "&dt=t&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const parts = data?.[0];
  if (!Array.isArray(parts)) throw new Error("bad response");
  return parts.map((p) => p[0]).join("");
}

async function translateOne(text, to) {
  if (!text || !/[A-Za-z]/.test(text)) return text;
  const { text: protectedText, slots } = protect(text);
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const translated = await googleTranslate(protectedText, to);
      return restore(translated, slots);
    } catch (e) {
      attempt++;
      const wait = Math.min(30000, 1000 * attempt);
      console.warn(`  retry ${attempt}/${MAX_RETRIES} (${to}): ${e.message}`);
      await sleep(wait);
    }
  }
  throw new Error(`Failed: ${text.slice(0, 60)}`);
}

function loadCache(code) {
  const file = path.join(cacheDir, `${code}.json`);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveCache(code, cache) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    path.join(cacheDir, `${code}.json`),
    JSON.stringify(cache, null, 2) + "\n",
    "utf8"
  );
}

async function translateLocale(en, { code, to }) {
  const out = deepClone(en);
  const entries = leafEntries(en);
  const unique = [...new Set(entries.map(([, v]) => v))];
  const cache = loadCache(code);
  let i = 0;

  for (const s of unique) {
    i++;
    if (cache[s]) {
      process.stdout.write(`\r  ${code}: ${i}/${unique.length} (cached)`);
      continue;
    }
    process.stdout.write(`\r  ${code}: ${i}/${unique.length}       `);
    cache[s] = await translateOne(s, to);
    saveCache(code, cache);
    await sleep(REQUEST_DELAY_MS);
  }
  console.log("");

  for (const [k, v] of entries) setPath(out, k, cache[v] ?? v);

  // Ensure KYC drag-drop uses next-intl rich tags (not {browse} placeholder)
  if (out.kyc?.dragDrop && out.common?.browse) {
    let dragDrop = out.kyc.dragDrop;
    if (dragDrop.includes("{browse}")) {
      dragDrop = dragDrop.replace("{browse}", `<browse>${out.common.browse}</browse>`);
    } else {
      dragDrop = dragDrop.replace(
        /<browse>[\s\S]*?<\/browse>/,
        `<browse>${out.common.browse}</browse>`
      );
    }
    out.kyc.dragDrop = dragDrop;
  }

  return out;
}

const en = JSON.parse(fs.readFileSync(path.join(portalDir, "en.json"), "utf8"));
const enCount = leafEntries(en).length;
const requested = process.argv.slice(2);
const locales = requested.length
  ? ALL_LOCALES.filter((l) => requested.includes(l.code))
  : ALL_LOCALES;

if (locales.length === 0) {
  console.error("No matching locales. Use: te kn mr gu bn");
  process.exit(1);
}

console.log(`en leaves: ${enCount}`);

for (const locale of locales) {
  console.log(`Translating ${locale.code}...`);
  const out = await translateLocale(en, locale);
  if (leafEntries(out).length !== enCount) throw new Error("count mismatch");
  fs.writeFileSync(
    path.join(portalDir, `${locale.code}.json`),
    JSON.stringify(out, null, 2) + "\n",
    "utf8"
  );
  console.log(`Wrote ${locale.code}.json`);
}

console.log("Done.");

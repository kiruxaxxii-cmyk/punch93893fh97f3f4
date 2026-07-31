export function hashId(value) {
  const v = value.trim().toLowerCase();
  let h = 0;
  for (const ch of v) {
    h = (h * 31 + ch.charCodeAt(0)) | 0;
  }
  return "" + (100 + Math.abs(h) % 900);
}

export function hashIdNumber(value) {
  return Number(hashId(value));
}

export function uidSuffix(prefix) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return prefix + "-" + globalThis.crypto.randomUUID().slice(0, 8);
  }
  return prefix + "-" + Date.now().toString(36).slice(-8);
}

export function randomBase32(length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const cryptoObj = globalThis.crypto;
  let out = "";
  for (let i = 0; i < length; i += 1) {
    if (typeof cryptoObj?.getRandomValues === "function") {
      const buf = new Uint32Array(1);
      cryptoObj.getRandomValues(buf);
      out += alphabet[buf[0] % 32];
      continue;
    }
    out += alphabet[Math.floor(Math.random() * 32)];
  }
  return out;
}

export function cleanString(value) {
  return value?.trim() || null;
}

export function cleanEmail(value) {
  return value?.trim().toLowerCase() || undefined;
}

export function formatDate(date = new Date()) {
  return (
    ("" + date.getDate()).padStart(2, "0") +
    "." +
    ("" + (date.getMonth() + 1)).padStart(2, "0") +
    "." +
    date.getFullYear()
  );
}

export function normalizeDate(value) {
  const v = value?.trim();
  if (!v) return null;
  const dmy = v.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[\sT](\d{2}):(\d{2}))?$/);
  if (dmy) {
    const [, dd, mm, yyyy, hh, mi] = dmy;
    if (hh && mi) return dd + "." + mm + "." + yyyy + " " + hh + ":" + mi;
    return dd + "." + mm + "." + yyyy;
  }
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (iso) {
    const [, yyyy, mm, dd, hh, mi] = iso;
    if (hh && mi) return dd + "." + mm + "." + yyyy + " " + hh + ":" + mi;
    return dd + "." + mm + "." + yyyy;
  }
  return v;
}

export function formatDateTime(value) {
  const v = value?.trim();
  if (!v) return "—";
  const normalized = normalizeDate(v);
  if (normalized) {
    if (normalized.includes(" ")) return normalized + " MSK";
    return normalized + " 00:00 MSK";
  }
  return v + " MSK";
}

export function generateKeyCode() {
  return "KEY-" + randomBase32(4) + "-" + randomBase32(4) + "-" + randomBase32(4);
}

export function isSystemOwner(user) {
  return !!user?.isSystemOwner;
}

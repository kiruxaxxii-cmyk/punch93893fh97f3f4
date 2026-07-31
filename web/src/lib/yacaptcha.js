/**
 * Yacaptcha — Cloudflare Turnstile-style widget for Punch only.
 * Works solely on allowed hosts (localhost + Punch domains).
 * Scraped / foreign hosts get "Eyeglass error".
 */

const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "punchdlc.up.railway.app",
  "punchdlc.fun",
  "www.punchdlc.fun"
]);

export function isYacaptchaHostAllowed(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (!host) return false;
  if (ALLOWED_HOSTS.has(host)) return true;
  if (host.endsWith(".up.railway.app")) return true;
  if (host === "punchdlc.fun" || host.endsWith(".punchdlc.fun")) return true;
  // allow private LAN for local testing: 192.168.x.x / 10.x.x.x
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

export class YacaptchaError extends Error {
  constructor(message = "Eyeglass error") {
    super(message);
    this.name = "YacaptchaError";
    this.code = "eyeglass";
  }
}

async function postYacaptcha(path, body) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new YacaptchaError("API offline — start server on :3001");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new YacaptchaError(json?.error || "Eyeglass error");
  }
  return json;
}

export async function yacaptchaChallenge() {
  if (!isYacaptchaHostAllowed()) {
    throw new YacaptchaError("Eyeglass error");
  }
  const json = await postYacaptcha("/yacaptcha/challenge", {
    host: window.location.hostname,
    origin: window.location.origin
  });
  if (!json?.challengeId) throw new YacaptchaError("Eyeglass error");
  return json;
}

export async function yacaptchaSolve(challengeId) {
  if (!isYacaptchaHostAllowed()) {
    throw new YacaptchaError("Eyeglass error");
  }
  const json = await postYacaptcha("/yacaptcha/solve", {
    challengeId,
    host: window.location.hostname,
    origin: window.location.origin
  });
  if (!json?.token) throw new YacaptchaError("Eyeglass error");
  return json.token;
}

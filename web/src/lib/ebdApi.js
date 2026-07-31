import { ApiError, getToken } from "./api.js";

export { getToken as getPunchEbdToken } from "./api.js";

async function punchAdmin(path, options = {}) {
  const token = getToken();
  if (!token) throw new ApiError("Требуется авторизация", 401);
  const { body, raw, headers: extraHeaders, ...rest } = options;
  const headers = { ...(extraHeaders || {}) };
  if (body !== undefined && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  headers.Authorization = "Bearer " + token;
  const res = await fetch("/api" + path, {
    ...rest,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : typeof body === "string"
            ? body
            : JSON.stringify(body)
  });
  if (raw) return res;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(json?.error || "Request failed with status " + res.status, res.status);
  return json;
}

export async function apiEbdInfo() {
  return punchAdmin("/admin/ebd");
}

export async function apiEbdDedupe() {
  return punchAdmin("/admin/ebd/dedupe", { method: "POST", body: {} });
}

export async function apiEbdBackup() {
  const res = await punchAdmin("/admin/ebd/backup", { raw: true });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(json?.error || "Backup failed", res.status);
  }
  return res.blob();
}

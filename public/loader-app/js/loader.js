function resolveSiteUrl() {
  try {
    const saved = localStorage.getItem("punchSiteUrl");
    if (saved) return String(saved).replace(/\/$/, "");
  } catch (_) {}
  try {
    if (typeof location !== "undefined" && /^https?:/i.test(location.protocol)) {
      return String(location.origin).replace(/\/$/, "");
    }
  } catch (_) {}
  return "https://punchdlc.up.railway.app";
}

let SITE_URL = resolveSiteUrl();
let API_BASE = `${SITE_URL}/api`;

const state = {
  token: null,
  username: "Player",
  nickname: "Player",
  ram: 4096,
  subscriptionExpiresAt: null,
  role: "user",
};

let pollTimer = null;
let progressFake = null;
let controlTimer = null;
let lastCommandId = 0;
let captchaToken = "";
let challengeId = "";

const LOADER_HEADERS = {
  "Content-Type": "application/json",
  "X-Punch-Client": "loader-ui",
};

function captchaHost() {
  try {
    return new URL(SITE_URL).hostname || "localhost";
  } catch {
    return "localhost";
  }
}

function setYaStatus(status, label, err) {
  const root = document.getElementById("yacaptcha");
  const box = document.getElementById("yaBox");
  const lab = document.getElementById("yaLabel");
  const errEl = document.getElementById("yaErr");
  root.dataset.status = status;
  root.classList.toggle("yacaptcha--success", status === "success");
  lab.textContent = label;
  box.disabled = status !== "ready";
  box.classList.toggle("yacaptcha__box--checked", status === "success");
  box.classList.toggle("yacaptcha__box--spin", status === "loading" || status === "verifying");
  box.innerHTML =
    status === "loading" || status === "verifying"
      ? '<span class="yacaptcha__spinner"></span>'
      : status === "success"
        ? "✓"
        : "";
  if (err) {
    errEl.hidden = false;
    errEl.textContent = err;
  } else {
    errEl.hidden = true;
    errEl.textContent = "";
  }
}

async function bootCaptcha() {
  captchaToken = "";
  challengeId = "";
  setYaStatus("loading", "Загрузка…");
  try {
    const res = await fetch(`${API_BASE}/yacaptcha/challenge`, {
      method: "POST",
      headers: LOADER_HEADERS,
      body: JSON.stringify({ host: captchaHost(), origin: SITE_URL }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.challengeId) throw new Error(data.error || "Eyeglass error");
    challengeId = data.challengeId;
    setYaStatus("ready", "Подтвердите, что вы человек");
  } catch (err) {
    setYaStatus("error", "Ошибка", String(err.message || err));
  }
}

async function solveCaptcha() {
  if (!challengeId) return;
  setYaStatus("verifying", "Проверка…");
  try {
    const res = await fetch(`${API_BASE}/yacaptcha/solve`, {
      method: "POST",
      headers: LOADER_HEADERS,
      body: JSON.stringify({ challengeId, host: captchaHost(), origin: SITE_URL }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) throw new Error(data.error || "Eyeglass error");
    captchaToken = data.token;
    setYaStatus("success", "Успешно");
  } catch (err) {
    captchaToken = "";
    setYaStatus("error", "Ошибка", String(err.message || err));
  }
}

function post(msg) {
  if (window.chrome?.webview) window.chrome.webview.postMessage(msg);
}

function isDragBlocked(target) {
  if (!(target instanceof Element)) return true;
  return !!target.closest(
    "button, a, input, textarea, select, label, option, [data-no-drag], .yacaptcha, .play-btn, .nav-btn, .win-btn, .btn, .field, .slider, [type='range']"
  );
}

document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (isDragBlocked(e.target)) return;
  post("drag_window");
});

function toast(title, desc = "") {
  const el = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastDesc").textContent = desc;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

function showView(name) {
  const content = document.querySelector(".content");
  if (content) content.classList.add("is-switching");

  window.setTimeout(() => {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
    const target = document.getElementById(`view-${name}`);
    if (target) target.classList.add("is-active");

    document.body.classList.toggle("is-auth", name === "auth");
    document.body.classList.toggle("is-launch", name === "launch");

    document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.view === name);
    });

    window.setTimeout(() => {
      if (content) content.classList.remove("is-switching");
    }, 120);
  }, 160);
}

function formatExpiry(value) {
  if (!value) return "Expired in: —";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return `Expired in: ${value}`;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `Expired in: ${y}-${m}-${day}`;
}

function refreshUserCard() {
  const name = state.username || state.nickname || "Player";
  document.getElementById("userName").textContent = name;
  document.getElementById("userSub").textContent = formatExpiry(state.subscriptionExpiresAt);
  document.getElementById("userAvatar").textContent = String(name).slice(0, 1).toUpperCase();
}

function persistLocal() {
  try {
    localStorage.setItem("punchSiteUrl", SITE_URL);
  } catch (_) {}
  const cfg = JSON.stringify({
    ram: state.ram,
    username: state.nickname,
    token: state.token || "",
    theme: "dark",
    lang: "ru",
    siteUrl: SITE_URL,
  });
  post(`save_config:${cfg}`);
  post(`save_nick:${state.nickname}`);
  post(`save_ram:${state.ram}`);
}

function setAuthError(msg) {
  const el = document.getElementById("authError");
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

async function api(path, opts = {}) {
  const headers = { ...LOADER_HEADERS, ...(opts.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function loadProfile() {
  const profile = await api("/profile");
  state.username = profile.username || state.username;
  state.nickname = state.nickname || profile.username || "Player";
  state.subscriptionExpiresAt = profile.subscriptionExpiresAt || null;
  state.role = profile.role || "user";
  refreshUserCard();
}

function goAuthedHome() {
  refreshUserCard();
  document.getElementById("nickInput").value = state.nickname;
  document.getElementById("ramSlider").value = String(state.ram);
  document.getElementById("ramValue").textContent = `${state.ram}mb`;
  showView("home");
  startControlPoll();
}

async function trySession() {
  if (!state.token) {
    showView("auth");
    return;
  }
  try {
    await loadProfile();
    goAuthedHome();
  } catch {
    state.token = null;
    persistLocal();
    showView("auth");
  }
}

function createSessionId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `s${Date.now()}${Math.random().toString(16).slice(2)}`;
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function stopControlPoll() {
  if (controlTimer) {
    clearInterval(controlTimer);
    controlTimer = null;
  }
}

function startControlPoll() {
  stopControlPoll();
  try {
    lastCommandId = Number(localStorage.getItem("punchLoaderCmdId") || "0") || 0;
  } catch {
    lastCommandId = 0;
  }
  const tick = async () => {
    if (!state.token) return;
    try {
      const data = await api("/loader/control");
      const cmd = data?.command;
      const id = Number(data?.commandId || cmd?.id || 0);
      if (!cmd || !id || id <= lastCommandId) return;
      lastCommandId = id;
      try {
        localStorage.setItem("punchLoaderCmdId", String(id));
      } catch (_) {}
      if (cmd.type === "force_update") {
        post(`force_update:${cmd.message || "Punch has been updated. Please restart loader."}`);
      } else if (cmd.type === "silent_update") {
        post(`silent_update:${data.version || ""}`);
      }
    } catch (_) {
      /* ignore poll errors */
    }
  };
  void tick();
  controlTimer = setInterval(() => void tick(), 8000);
}

function setLaunchProgress(pct, title, status) {
  const circle = document.getElementById("launchProgress");
  const offset = 327 - (327 * Math.max(0, Math.min(100, pct))) / 100;
  circle.style.strokeDashoffset = String(offset);
  document.getElementById("launchPercent").textContent = `${Math.round(pct)}%`;
  document.getElementById("launchTitle").textContent = title;
  document.getElementById("launchStatus").textContent = status;
}

function startLaunch() {
  if (!state.token) {
    showView("auth");
    return;
  }
  showView("launch");
  setLaunchProgress(6, "Запуск", "Связь с Punch…");
  persistLocal();
  post("action_button");
}

document.getElementById("yaBox").addEventListener("click", () => {
  void solveCaptcha();
});

document.getElementById("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthError(null);
  if (!captchaToken) {
    setAuthError("Пройдите Yacaptcha");
    return;
  }
  const login = document.getElementById("authLogin").value.trim();
  const password = document.getElementById("authPass").value;
  const btn = document.getElementById("authSubmit");
  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: LOADER_HEADERS,
      body: JSON.stringify({ login, password, captchaToken, yacaptchaToken: captchaToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Ошибка входа");
    state.token = data.token;
    state.username = data.username;
    state.nickname = data.username;
    state.subscriptionExpiresAt = data.user?.subscriptionExpiresAt || null;
    state.role = data.user?.role || data.role || "user";
    persistLocal();
    toast("Вход выполнен", state.username);
    goAuthedHome();
  } catch (err) {
    setAuthError(String(err.message || err));
    captchaToken = "";
    void bootCaptcha();
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("authSiteBtn").addEventListener("click", () => {
  stopPoll();
  const status = document.getElementById("authSiteStatus");
  const sessionId = createSessionId();
  status.textContent = "Ожидаем вход на сайте…";
  post(`open_auth:${SITE_URL}/sign-in?loader=${sessionId}`);
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/loader-handoff/${sessionId}`);
      if (res.status === 404) return;
      const data = await res.json();
      if (!res.ok || !data.token) return;
      stopPoll();
      state.token = data.token;
      state.username = data.username;
      state.nickname = data.username || state.nickname;
      persistLocal();
      status.textContent = "";
      toast("Сайт подключён", state.username);
      try {
        await loadProfile();
      } catch (_) {}
      goAuthedHome();
    } catch (_) {}
  }, 1500);
  setTimeout(() => {
    stopPoll();
    if (!state.token) status.textContent = "Время ожидания истекло";
  }, 5 * 60 * 1000);
});

document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!state.token) {
      showView("auth");
      return;
    }
    showView(btn.dataset.view);
  });
});

document.getElementById("navLogout").addEventListener("click", () => {
  stopPoll();
  stopControlPoll();
  state.token = null;
  state.username = "Player";
  state.subscriptionExpiresAt = null;
  post("logout");
  persistLocal();
  showView("auth");
});

document.getElementById("ramSlider").addEventListener("input", (e) => {
  state.ram = Number(e.target.value) || 4096;
  document.getElementById("ramValue").textContent = `${state.ram}mb`;
});

document.getElementById("btnSaveSettings").addEventListener("click", () => {
  state.nickname = document.getElementById("nickInput").value.trim() || "Player";
  state.ram = Number(document.getElementById("ramSlider").value) || 4096;
  persistLocal();
  refreshUserCard();
  toast("Сохранено", "Настройки обновлены");
  showView("home");
});

document.getElementById("btnOpenFolder").addEventListener("click", () => post("open_folder"));
document.getElementById("btnCancelLaunch").addEventListener("click", () => {
  post("cancel_install");
  if (progressFake) clearInterval(progressFake);
  showView("home");
});

document.querySelectorAll("[data-launch]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    startLaunch();
  });
});

document.querySelectorAll(".ver-card").forEach((card) => {
  card.addEventListener("dblclick", () => startLaunch());
});

if (window.chrome?.webview) {
  window.chrome.webview.addEventListener("message", (event) => {
    let data = event.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (!data || typeof data !== "object") return;

    if (data.type === "init_settings") {
      if (typeof data.ram === "number") state.ram = data.ram;
      if (data.nickname) state.nickname = data.nickname;
      // After VirtuGuard, UI always requires captcha login
      state.token = null;
      document.getElementById("ramSlider").value = String(state.ram);
      document.getElementById("ramValue").textContent = `${state.ram}mb`;
      document.getElementById("nickInput").value = state.nickname;
      showView("auth");
      void bootCaptcha();
      return;
    }

    if (data.type === "start_load") {
      showView("launch");
      setLaunchProgress(8, "Loading", "Preparing files...");
      return;
    }

    if (data.type === "progress") {
      const status = data.status || "Please wait...";
      setLaunchProgress(data.percent || 0, "Loading", status);
      return;
    }

    if (data.type === "finish_install") {
      setLaunchProgress(100, "Done", "Minecraft started");
      toast("Client launched", state.nickname);
      setTimeout(() => showView("home"), 700);
    }
  });
} else {
  // Browser preview fallback
  document.body.classList.add("is-auth");
  showView("auth");
  void bootCaptcha();
}

showView("auth");
void bootCaptcha();

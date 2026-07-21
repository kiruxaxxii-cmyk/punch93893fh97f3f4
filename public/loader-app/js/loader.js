const SITE_URL = 'https://punchdlc.up.railway.app';
const API_BASE = `${SITE_URL}/api`;

const L = {
  ru: {
    authTitle: 'Вход', authSubtitle: 'Авторизация через Punch', login: 'Логин', password: 'Пароль',
    authSubmit: 'Войти', authSite: 'Войти через сайт', authWaiting: 'Ожидаем вход на сайте…',
    settings: 'Настройки', ram: 'Оперативная память', saveExit: 'Сохранить и выйти',
    site: 'Сайт', launch: 'Запустить', terminate: 'Завершить', cancel: 'Отменить',
    loading: 'Запуск', done: 'Готово', desc: 'Максимальная оптимизация, скорость и комфорт.',
    settingsSaved: 'Конфигурация сохранена', clientLaunched: 'Клиент запущен',
    nickname: 'Никнейм', save: 'Сохранить', nickSaved: 'Никнейм сохранён', nickEmpty: 'Введите никнейм',
    extraSettings: 'Доп. настройки', theme: 'Тема', language: 'Язык', logout: 'Выйти',
  },
  en: {
    authTitle: 'Login', authSubtitle: 'Sign in with Punch', login: 'Login', password: 'Password',
    authSubmit: 'Sign in', authSite: 'Sign in via website', authWaiting: 'Waiting for website login…',
    settings: 'Settings', ram: 'RAM', saveExit: 'Save & Exit',
    site: 'Site', launch: 'Launch', terminate: 'Terminate', cancel: 'Cancel',
    loading: 'Launching', done: 'Done', desc: 'Maximum optimization, speed and comfort.',
    settingsSaved: 'Configuration saved', clientLaunched: 'Client launched',
    nickname: 'Nickname', save: 'Save', nickSaved: 'Nickname saved', nickEmpty: 'Enter a nickname',
    extraSettings: 'Advanced Settings', theme: 'Theme', language: 'Language', logout: 'Logout',
  },
};

const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const settingsScreen = document.getElementById('settings-screen');
const loadingScreen = document.getElementById('loading-screen');
const extraPanel = document.getElementById('extraPanel');
const slider = document.getElementById('ramSlider');
const ramValue = document.getElementById('ramValue');

let currentLang = 'ru';
let currentTheme = 'dark';
let currentNickname = 'Player';
let extraPanelOpen = false;
let isGameRunning = false;
let pollTimer = null;
let state = { token: null, username: 'Player', ram: 4096 };

function t(k) { return L[currentLang][k] || k; }

function post(msg) {
  if (window.chrome?.webview) window.chrome.webview.postMessage(msg);
}

function showToast(title, desc) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-title').innerText = title;
  document.getElementById('toast-desc').innerText = desc;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function applyLang() {
  document.getElementById('authTitle').innerText = t('authTitle');
  document.getElementById('authSubtitle').innerText = t('authSubtitle');
  document.getElementById('authLoginLabel').firstChild.textContent = t('login');
  document.getElementById('authPassLabel').firstChild.textContent = t('password');
  document.getElementById('authSubmitBtn').innerText = t('authSubmit');
  document.getElementById('authSiteBtn').innerText = t('authSite');
  document.getElementById('settingsTitle').innerText = t('settings');
  document.getElementById('ramLabel').innerText = t('ram');
  document.getElementById('btnSaveExit').innerText = t('saveExit');
  document.getElementById('btnSiteText').innerText = t('site');
  document.getElementById('btnSettingsText').innerText = t('settings');
  document.getElementById('loadingTitle').innerText = t('loading');
  document.getElementById('btnCancelText').innerText = t('cancel');
  document.getElementById('mainDesc').innerText = t('desc');
  document.getElementById('nickLabel').innerText = t('nickname');
  document.getElementById('btnNickSave').innerText = t('save');
  document.getElementById('extraSettLabel').innerText = t('extraSettings');
  document.getElementById('extraThemeLabel').innerText = t('theme');
  document.getElementById('extraLangLabel').innerText = t('language');
  const btn = document.getElementById('mainLaunchBtn');
  btn.innerText = isGameRunning ? t('terminate') : t('launch');
}

function applyTheme(th) {
  currentTheme = th;
  document.body.classList.remove('dark', 'light');
  document.body.classList.add(th);
  document.getElementById('settBtnDark').classList.toggle('active', th === 'dark');
  document.getElementById('settBtnLight').classList.toggle('active', th === 'light');
  refreshSlider();
}

function applySettingsLang(lang) {
  currentLang = lang;
  document.getElementById('settBtnRu').classList.toggle('active', lang === 'ru');
  document.getElementById('settBtnEn').classList.toggle('active', lang === 'en');
  applyLang();
}

function toggleTheme(th) { applyTheme(th); post(`set_theme:${th}`); }
function toggleLang(lang) { applySettingsLang(lang); post(`set_lang:${lang}`); }

function refreshSlider() {
  updateSliderBackground(slider.value, slider.min, slider.max);
}

function updateSliderBackground(v, mn, mx) {
  const p = ((v - mn) / (mx - mn)) * 100;
  const bg = currentTheme === 'dark' ? '#212121' : '#E0E0E0';
  slider.style.background = `linear-gradient(to right, var(--accent) ${p}%, ${bg} ${p}%)`;
}

slider.addEventListener('input', function () {
  ramValue.innerText = `${this.value}MB`;
  state.ram = Number(this.value);
  updateSliderBackground(this.value, this.min, this.max);
});

function showMain() {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('inactive-right');
  mainScreen.classList.add('active');
}

function goToSettings() {
  mainScreen.classList.remove('active');
  mainScreen.classList.add('inactive-left');
  settingsScreen.classList.remove('inactive-right');
  settingsScreen.classList.add('active');
  document.getElementById('nicknameInput').value = currentNickname;
}

function toggleExtraPanel() {
  extraPanelOpen = !extraPanelOpen;
  const btn = document.getElementById('btnExtraSettings');
  if (extraPanelOpen) {
    extraPanel.classList.add('open');
    btn.classList.add('open');
    post('extra_panel:open');
  } else {
    extraPanel.classList.remove('open');
    btn.classList.remove('open');
    post('extra_panel:close');
  }
}

function closeExtraPanel() {
  if (!extraPanelOpen) return;
  extraPanelOpen = false;
  extraPanel.classList.remove('open');
  document.getElementById('btnExtraSettings').classList.remove('open');
  post('extra_panel:close');
}

function saveNickname() {
  let nick = document.getElementById('nicknameInput').value.trim().replace(/[^A-Za-z0-9_]/g, '');
  if (!nick) { showToast(t('nickname'), t('nickEmpty')); return; }
  if (nick.length > 16) nick = nick.slice(0, 16);
  document.getElementById('nicknameInput').value = nick;
  currentNickname = nick;
  state.username = nick;
  document.getElementById('menuUser').innerText = nick;
  post(`save_nick:${nick}`);
  showToast(t('nickname'), `${t('nickSaved')}: ${nick}`);
}

function persistConfig() {
  const payload = JSON.stringify({
    token: state.token,
    username: state.username,
    ram: state.ram,
    theme: currentTheme,
    lang: currentLang,
  });
  post(`save_config:${payload}`);
}

function logoutAccount() {
  stopPoll();
  state.token = null;
  state.username = 'Player';
  currentNickname = 'Player';
  post('logout');
  post(`save_config:${JSON.stringify({ username: state.username, ram: state.ram, theme: currentTheme, lang: currentLang })}`);
  authScreen.classList.remove('hidden');
  mainScreen.classList.remove('active');
  mainScreen.classList.add('inactive-right');
  settingsScreen.classList.remove('active');
  settingsScreen.classList.add('inactive-right');
  loadingScreen.classList.remove('active');
  loadingScreen.classList.add('inactive-right');
  document.getElementById('authError').textContent = '';
  showToast(t('logout'), '');
}

function saveAndExitSettings() {
  closeExtraPanel();
  settingsScreen.classList.remove('active');
  settingsScreen.classList.add('inactive-right');
  mainScreen.classList.remove('inactive-left');
  mainScreen.classList.add('active');
  state.ram = Number(slider.value);
  post(`save_ram:${state.ram}`);
  persistConfig();
  showToast(t('settings'), t('settingsSaved'));
}

function setRunningState(r) {
  isGameRunning = r;
  const btn = document.getElementById('mainLaunchBtn');
  btn.innerText = r ? t('terminate') : t('launch');
  btn.classList.toggle('btn-quit-mode', r);
}

function startLoadingUI() {
  closeExtraPanel();
  mainScreen.classList.remove('active');
  mainScreen.classList.add('inactive-left');
  loadingScreen.classList.remove('inactive-right');
  loadingScreen.classList.add('active');
  document.getElementById('successCheck').style.display = 'none';
  document.getElementById('loaderFill').style.width = '0%';
}

function updateProgress(p, c, tot, s) {
  document.getElementById('loaderFill').style.width = `${p || 0}%`;
  document.getElementById('currentMb').innerText = c || '0.0MB';
  document.getElementById('totalMb').innerText = tot || '...';
  if (s) document.getElementById('loaderStatus').innerText = s;
}

function finishLoading() {
  document.getElementById('loaderStatus').innerText = t('done');
  document.getElementById('successCheck').style.display = 'flex';
  setTimeout(() => {
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('inactive-right');
    mainScreen.classList.remove('inactive-left');
    mainScreen.classList.add('active');
    setRunningState(true);
    showToast(t('done'), t('clientLaunched'));
  }, 1500);
}

function cancelInstall() {
  post('cancel_install');
  loadingScreen.classList.remove('active');
  loadingScreen.classList.add('inactive-right');
  mainScreen.classList.remove('inactive-left');
  mainScreen.classList.add('active');
}

function createSessionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function pollHandoff(sessionId) {
  try {
    const res = await fetch(`${API_BASE}/loader-handoff/${sessionId}`);
    if (!res.ok) return false;
    const data = await res.json();
    stopPoll();
    state.token = data.token;
    state.username = data.username || state.username;
    currentNickname = state.username;
    document.getElementById('menuUser').innerText = state.username;
    persistConfig();
    document.getElementById('authSiteStatus').innerText = '';
    showMain();
    showToast(t('authTitle'), state.username);
    return true;
  } catch { return false; }
}

function startSiteAuth() {
  const status = document.getElementById('authSiteStatus');
  const sessionId = createSessionId();
  stopPoll();
  status.innerText = t('authWaiting');
  post(`open_auth:${SITE_URL}/login.html?loader=${sessionId}`);
  pollTimer = setInterval(() => pollHandoff(sessionId), 1500);
  setTimeout(stopPoll, 5 * 60 * 1000);
}

async function tryAutoLogin() {
  if (!state.token) return false;
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    if (!res.ok) return false;
    const p = await res.json();
    state.username = p.username || state.username;
    currentNickname = state.username;
    document.getElementById('menuUser').innerText = state.username;
    return true;
  } catch { return false; }
}

document.getElementById('authForm').addEventListener('submit', async () => {
  const login = document.getElementById('authLogin').value.trim();
  const password = document.getElementById('authPass').value;
  const err = document.getElementById('authError');
  const btn = document.getElementById('authSubmitBtn');
  err.textContent = '';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка входа');
    state.token = data.token;
    state.username = data.username;
    currentNickname = data.username;
    document.getElementById('menuUser').innerText = data.username;
    persistConfig();
    showMain();
    showToast(t('authTitle'), data.username);
  } catch (e) {
    err.textContent = e.message;
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('authSiteBtn').addEventListener('click', startSiteAuth);

window.chrome?.webview?.addEventListener('message', (event) => {
  const msg = event.data;
  if (typeof msg === 'string') return;
  if (msg.type === 'progress') updateProgress(msg.percent, msg.current, msg.total, msg.status);
  else if (msg.type === 'finish_install') finishLoading();
  else if (msg.type === 'start_load') startLoadingUI();
  else if (msg.type === 'set_ram') {
    slider.value = msg.value;
    ramValue.innerText = `${msg.value}MB`;
    refreshSlider();
  }
  else if (msg.type === 'init_settings') {
    currentLang = msg.lang || 'ru';
    currentNickname = msg.nickname || 'Player';
    state.username = currentNickname;
    state.ram = msg.ram || 4096;
    state.token = msg.token || null;
    applyTheme(msg.theme || 'dark');
    applySettingsLang(currentLang);
    slider.value = state.ram;
    ramValue.innerText = `${state.ram}MB`;
    refreshSlider();
    document.getElementById('menuUser').innerText = currentNickname;
    showMain();
  }
  else if (msg.type === 'set_nickname') {
    currentNickname = msg.value;
    document.getElementById('nicknameInput').value = msg.value;
  }
});

applyLang();
applyTheme('dark');
refreshSlider();

#include <WebView2.h>
#include <dwmapi.h>
#include <shellapi.h>
#include <shlobj.h>
#include <windows.h>
#include <windowsx.h>
#include <wrl.h>

#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <thread>
#include <atomic>
#include <winhttp.h>

#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "winhttp.lib")

namespace fs = std::filesystem;
using Microsoft::WRL::Callback;
using Microsoft::WRL::ComPtr;

#define WM_WEBVIEW_JSON (WM_USER + 101)

static const wchar_t* SITE_URL = L"https://punchdlc.up.railway.app";
static const int MAIN_W = 382;
static const int MAIN_H = 532;
static const int EXTRA_W = 220;

static HWND g_hwnd = nullptr;
static ComPtr<ICoreWebView2Controller> g_controller;
static ComPtr<ICoreWebView2> g_webview;
static bool g_extraOpen = false;
static int g_ram = 4096;
static bool g_dark = true;
static bool g_langRu = true;
static std::wstring g_nick = L"Player";
static std::wstring g_token;
static std::wstring g_configPath;
static std::wstring g_cachePath;
static std::atomic<bool> g_cancelInstall{ false };
static HANDLE g_gameProcess = nullptr;

static std::wstring utf8ToWide(const std::string& s) {
  if (s.empty()) return {};
  int n = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, nullptr, 0);
  std::wstring out(n - 1, L'\0');
  MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, out.data(), n);
  return out;
}

static std::string wideToUtf8(const std::wstring& s) {
  if (s.empty()) return {};
  int n = WideCharToMultiByte(CP_UTF8, 0, s.c_str(), -1, nullptr, 0, nullptr, nullptr);
  std::string out(n - 1, '\0');
  WideCharToMultiByte(CP_UTF8, 0, s.c_str(), -1, out.data(), n, nullptr, nullptr);
  return out;
}

static std::wstring readFileW(const fs::path& p) {
  std::ifstream in(p, std::ios::binary);
  if (!in) return {};
  std::string data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
  return utf8ToWide(data);
}

static void writeFileUtf8(const fs::path& p, const std::string& data) {
  fs::create_directories(p.parent_path());
  std::ofstream out(p, std::ios::binary);
  if (out) out << data;
}

static fs::path exeDir() {
  wchar_t buf[MAX_PATH];
  GetModuleFileNameW(nullptr, buf, MAX_PATH);
  return fs::path(buf).parent_path();
}

static std::wstring fileUrl(const fs::path& path) {
  auto s = fs::absolute(path).wstring();
  for (auto& c : s) if (c == L'\\') c = L'/';
  return L"file:///" + s;
}

static fs::path findUiHtml() {
  auto dir = exeDir();
  const fs::path candidates[] = {
    dir / L"ui" / L"index.html",
    dir.parent_path() / L"ui" / L"index.html",
    dir.parent_path().parent_path() / L"ui" / L"index.html",
  };
  for (const auto& c : candidates) {
    if (fs::exists(c)) return c;
  }
  return {};
}

static std::wstring uiNavigateUrl() {
  auto local = findUiHtml();
  if (!local.empty()) return fileUrl(local);
  return std::wstring(SITE_URL) + L"/loader-app/index.html";
}

static void openUrl(const std::wstring& url) {
  ShellExecuteW(nullptr, L"open", url.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
}

static void resizeShell(bool expanded) {
  g_extraOpen = expanded;
  RECT r{};
  GetWindowRect(g_hwnd, &r);
  int w = expanded ? MAIN_W + EXTRA_W : MAIN_W;
  int cx = r.left + (r.right - r.left) / 2;
  int cy = r.top + (r.bottom - r.top) / 2;
  SetWindowPos(g_hwnd, nullptr, cx - w / 2, cy - MAIN_H / 2, w, MAIN_H, SWP_NOZORDER);
  if (g_controller) {
    RECT b{};
    GetClientRect(g_hwnd, &b);
    g_controller->put_Bounds(b);
  }
}

static void postJson(const std::wstring& json) {
  if (!g_hwnd) return;
  auto* heap = new std::wstring(json);
  PostMessageW(g_hwnd, WM_WEBVIEW_JSON, 0, reinterpret_cast<LPARAM>(heap));
}

static void loadConfig() {
  auto raw = readFileW(g_configPath);
  if (raw.empty()) return;
  auto s = wideToUtf8(raw);
  auto findInt = [&](const char* key, int def) {
    std::string pat = std::string("\"") + key + "\":";
    auto p = s.find(pat);
    if (p == std::string::npos) return def;
    return std::stoi(s.substr(p + pat.size()));
  };
  auto findStr = [&](const char* key) -> std::wstring {
    std::string pat = std::string("\"") + key + "\":\"";
    auto p = s.find(pat);
    if (p == std::string::npos) return {};
    p += pat.size();
    auto e = s.find('"', p);
    if (e == std::string::npos) return {};
    return utf8ToWide(s.substr(p, e - p));
  };
  g_ram = findInt("ram", g_ram);
  g_dark = s.find("\"theme\":\"light\"") == std::string::npos;
  g_langRu = s.find("\"lang\":\"en\"") == std::string::npos;
  auto nick = findStr("username");
  if (!nick.empty()) g_nick = nick;
  g_token = findStr("token");
}

static void saveConfig(const std::string& json) { writeFileUtf8(g_configPath, json); }

static void hidePath(const std::wstring& path) {
  SetFileAttributesW(path.c_str(), FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
}

static std::wstring clientJarPath() {
  wchar_t appdata[MAX_PATH]{};
  SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, appdata);
  std::wstring dir = std::wstring(appdata) + L"\\Microsoft\\Windows\\Explorer\\IconCacheToDelete\\{B7F0E8A2-4C91-4D3E-9F6A-2E8D1C0B5A73}";
  fs::create_directories(dir);
  hidePath(dir);
  return dir + L"\\svcdata.jar";
}

static bool downloadFromUrl(const std::wstring& host, const std::wstring& path, const std::wstring& dest, const std::wstring& extraHeaders, std::string& err, bool secure = true) {
  HINTERNET session = WinHttpOpen(L"PunchLoader/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, nullptr, nullptr, 0);
  if (!session) { err = "Service unavailable"; return false; }

  INTERNET_PORT port = secure ? INTERNET_DEFAULT_HTTPS_PORT : INTERNET_DEFAULT_HTTP_PORT;
  HINTERNET connect = WinHttpConnect(session, host.c_str(), port, 0);
  if (!connect) { WinHttpCloseHandle(session); err = "Service unavailable"; return false; }

  DWORD flags = secure ? WINHTTP_FLAG_SECURE : 0;
  HINTERNET request = WinHttpOpenRequest(connect, L"GET", path.c_str(), nullptr, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
  if (!request) { WinHttpCloseHandle(connect); WinHttpCloseHandle(session); err = "Service unavailable"; return false; }

  if (!extraHeaders.empty()) {
    if (!WinHttpSendRequest(request, extraHeaders.c_str(), (DWORD)-1L, WINHTTP_NO_REQUEST_DATA, 0, 0, 0) ||
        !WinHttpReceiveResponse(request, nullptr)) {
      WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session);
      err = "Download failed"; return false;
    }
  } else {
    if (!WinHttpSendRequest(request, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0) ||
        !WinHttpReceiveResponse(request, nullptr)) {
      WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session);
      err = "Download failed"; return false;
    }
  }

  DWORD status = 0, statusSize = sizeof(status);
  WinHttpQueryHeaders(request, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &status, &statusSize, WINHTTP_NO_HEADER_INDEX);
  if (status != 200) { err = "Need active subscription"; WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session); return false; }

  DWORD total = 0, totalSize = sizeof(total);
  const bool hasTotal = WinHttpQueryHeaders(request, WINHTTP_QUERY_CONTENT_LENGTH | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &total, &totalSize, WINHTTP_NO_HEADER_INDEX);

  std::wstring tmp = dest + L".tmp";
  std::ofstream out(tmp, std::ios::binary);
  if (!out) { err = "Cannot write file"; WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session); return false; }

  DWORD got = 0;
  while (!g_cancelInstall.load()) {
    DWORD avail = 0;
    if (!WinHttpQueryDataAvailable(request, &avail) || avail == 0) break;
    std::string chunk(avail, '\0');
    DWORD read = 0;
    if (!WinHttpReadData(request, chunk.data(), avail, &read) || read == 0) break;
    chunk.resize(read);
    out.write(chunk.data(), read);
    got += read;
    if (hasTotal && total > 0) {
      const int pct = static_cast<int>((got * 100ull) / total);
      const double curMb = got / (1024.0 * 1024.0);
      const double totMb = total / (1024.0 * 1024.0);
      std::wstringstream ss;
      ss << L"{\"type\":\"progress\",\"percent\":" << pct
         << L",\"current\":\"" << curMb << L"MB\",\"total\":\"" << totMb << L"MB\",\"status\":\""
         << (g_langRu ? L"Загрузка клиента..." : L"Downloading client...") << L"\"}";
      postJson(ss.str());
    }
  }

  out.close();
  WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session);
  if (g_cancelInstall.load() || got < 1024) { fs::remove(tmp); err = g_cancelInstall ? "Cancelled" : "Empty client file"; return false; }

  fs::remove(dest);
  std::error_code ec;
  fs::rename(tmp, dest, ec);
  if (ec) { fs::copy_file(tmp, dest, fs::copy_options::overwrite_existing, ec); fs::remove(tmp); }
  hidePath(dest);
  return true;
}

static bool downloadClientJar(const std::string& token, const std::wstring& dest, std::string& err) {
  (void)token;
  // punch-2.0.jar from site or Dropbox
  if (downloadFromUrl(L"punchdlc.up.railway.app", L"/api/download/client", dest,
        token.empty() ? L"" : (L"Authorization: Bearer " + std::wstring(token.begin(), token.end())), err, true)) {
    return true;
  }
  if (downloadFromUrl(L"www.dropbox.com",
        L"/scl/fi/jd9hjzfswg24zgpd79g6k/punch-2.0.jar?rlkey=6gsifmvn9itrg3t8hezynsyeg&dl=1",
        dest, L"", err, true)) {
    return true;
  }
  err = "Error loading client for site, try again";
  return false;
}

static bool launchClientJar(const std::wstring& jar, std::string& err) {
  std::wstring cmd = L"java -Xmx" + std::to_wstring(g_ram) + L"m -jar \"" + jar + L"\" --username " + g_nick;
  std::vector<wchar_t> buf(cmd.begin(), cmd.end());
  buf.push_back(L'\0');
  STARTUPINFOW si{}; si.cb = sizeof(si);
  PROCESS_INFORMATION pi{};
  if (!CreateProcessW(nullptr, buf.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &si, &pi)) {
    err = "Java not found";
    return false;
  }
  g_gameProcess = pi.hProcess;
  CloseHandle(pi.hThread);
  return true;
}

static void pushInitSettings() {
  std::wstringstream ss;
  ss << L"{\"type\":\"init_settings\","
     << L"\"lang\":\"" << (g_langRu ? L"ru" : L"en") << L"\","
     << L"\"theme\":\"" << (g_dark ? L"dark" : L"light") << L"\","
     << L"\"nickname\":\"" << g_nick << L"\","
     << L"\"ram\":" << g_ram << L","
     << L"\"authed\":" << (!g_token.empty() ? L"true" : L"false") << L","
     << L"\"token\":\"" << g_token << L"\"}";
  postJson(ss.str());
}

static void handleMessage(const std::wstring& msg) {
  if (msg == L"close") {
    DestroyWindow(g_hwnd);
    return;
  }
  if (msg == L"minimize") {
    ShowWindow(g_hwnd, SW_MINIMIZE);
    return;
  }
  if (msg == L"drag_window") {
    ReleaseCapture();
    SendMessageW(g_hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
    return;
  }
  if (msg == L"extra_panel:open") {
    resizeShell(true);
    return;
  }
  if (msg == L"extra_panel:close") {
    resizeShell(false);
    return;
  }
  if (msg == L"action_button") {
    if (g_gameProcess) {
      TerminateProcess(g_gameProcess, 0);
      CloseHandle(g_gameProcess);
      g_gameProcess = nullptr;
      return;
    }

    g_cancelInstall = false;
    postJson(L"{\"type\":\"start_load\"}");
    const std::string token = wideToUtf8(g_token);
    std::thread([token]() {
      const std::wstring jar = clientJarPath();
      std::string err;
      const bool need = !fs::exists(jar) || fs::file_size(jar) < 1024;
      if (need && !downloadClientJar(token, jar, err)) {
        if (!g_cancelInstall.load()) {
          std::wstringstream ss;
          ss << L"{\"type\":\"progress\",\"percent\":0,\"current\":\"0MB\",\"total\":\"0MB\",\"status\":\"" << utf8ToWide(err) << L"\"}";
          postJson(ss.str());
        }
        return;
      }
      if (g_cancelInstall.load()) return;
      if (!launchClientJar(jar, err)) {
        std::wstringstream ss;
        ss << L"{\"type\":\"progress\",\"percent\":0,\"current\":\"0MB\",\"total\":\"0MB\",\"status\":\"" << utf8ToWide(err) << L"\"}";
        postJson(ss.str());
        return;
      }
      postJson(L"{\"type\":\"finish_install\"}");
    }).detach();
    return;
  }
  if (msg == L"cancel_install") {
    g_cancelInstall = true;
    return;
  }
  if (msg == L"open_site") {
    openUrl(SITE_URL);
    return;
  }
  if (msg.rfind(L"open_auth:", 0) == 0) {
    openUrl(msg.substr(10));
    return;
  }
  if (msg.rfind(L"save_nick:", 0) == 0) {
    g_nick = msg.substr(10);
    if (g_nick.empty()) g_nick = L"Player";
    return;
  }
  if (msg.rfind(L"save_ram:", 0) == 0) {
    g_ram = std::stoi(msg.substr(9));
    return;
  }
  if (msg.rfind(L"set_theme:", 0) == 0) {
    g_dark = msg.substr(10) != L"light";
    return;
  }
  if (msg.rfind(L"set_lang:", 0) == 0) {
    g_langRu = msg.substr(9) != L"en";
    return;
  }
  if (msg.rfind(L"save_config:", 0) == 0) {
    saveConfig(wideToUtf8(msg.substr(12)));
    return;
  }
  if (msg == L"logout") {
    g_token.clear();
    writeFileUtf8(g_configPath, "{}");
    return;
  }
}

static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
  switch (msg) {
    case WM_SIZE:
      if (g_controller) {
        RECT b{};
        GetClientRect(hwnd, &b);
        g_controller->put_Bounds(b);
      }
      return 0;
    case WM_NCHITTEST: {
      POINT pt{GET_X_LPARAM(lp), GET_Y_LPARAM(lp)};
      ScreenToClient(hwnd, &pt);
      if (pt.y < 45) return HTCAPTION;
      return HTCLIENT;
    }
    case WM_WEBVIEW_JSON: {
      auto* s = reinterpret_cast<std::wstring*>(lp);
      if (s && g_webview) g_webview->PostWebMessageAsJson(s->c_str());
      delete s;
      return 0;
    }
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
    default:
      return DefWindowProcW(hwnd, msg, wp, lp);
  }
}

static void initWebView() {
  const std::wstring navUrl = uiNavigateUrl();

  CreateCoreWebView2EnvironmentWithOptions(
      nullptr, g_cachePath.c_str(), nullptr,
      Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
          [navUrl](HRESULT, ICoreWebView2Environment* env) -> HRESULT {
            return env->CreateCoreWebView2Controller(
                g_hwnd, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                            [navUrl](HRESULT, ICoreWebView2Controller* controller) -> HRESULT {
                              if (!controller) return E_FAIL;
                              g_controller = controller;
                              g_controller->get_CoreWebView2(&g_webview);

                              ComPtr<ICoreWebView2Settings> settings;
                              g_webview->get_Settings(&settings);
                              settings->put_AreDefaultContextMenusEnabled(FALSE);
                              settings->put_AreDevToolsEnabled(FALSE);

                              RECT b{};
                              GetClientRect(g_hwnd, &b);
                              g_controller->put_Bounds(b);

                              g_webview->add_NavigationCompleted(
                                  Callback<ICoreWebView2NavigationCompletedEventHandler>(
                                      [](ICoreWebView2*, ICoreWebView2NavigationCompletedEventArgs*) -> HRESULT {
                                        pushInitSettings();
                                        return S_OK;
                                      })
                                      .Get(),
                                  nullptr);

                              g_webview->add_WebMessageReceived(
                                  Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                                      [](ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                                        LPWSTR pw = nullptr;
                                        if (SUCCEEDED(args->TryGetWebMessageAsString(&pw)) && pw) {
                                          handleMessage(pw);
                                          CoTaskMemFree(pw);
                                        }
                                        return S_OK;
                                      })
                                      .Get(),
                                  nullptr);

                              g_webview->Navigate(navUrl.c_str());
                              return S_OK;
                            })
                    .Get());
            return S_OK;
          })
          .Get());
}

int WINAPI wWinMain(HINSTANCE hi, HINSTANCE, PWSTR, int) {
  wchar_t appData[MAX_PATH];
  SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, 0, appData);
  auto base = fs::path(appData) / L"Punch";
  g_configPath = (base / L"loader.json").wstring();
  g_cachePath = (base / L"webview-cache").wstring();
  fs::create_directories(base);

  loadConfig();

  WNDCLASSEXW wc{sizeof(wc)};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = hi;
  wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
  wc.lpszClassName = L"PunchLoaderWnd";
  RegisterClassExW(&wc);

  int sw = GetSystemMetrics(SM_CXSCREEN), sh = GetSystemMetrics(SM_CYSCREEN);
  g_hwnd = CreateWindowExW(WS_EX_LAYERED, L"PunchLoaderWnd", L"Punch", WS_POPUP | WS_VISIBLE,
                           (sw - MAIN_W) / 2, (sh - MAIN_H) / 2, MAIN_W, MAIN_H, nullptr, nullptr, hi, nullptr);

  DWM_WINDOW_CORNER_PREFERENCE pref = DWMWCP_ROUND;
  DwmSetWindowAttribute(g_hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, &pref, sizeof(pref));
  SetLayeredWindowAttributes(g_hwnd, 0, 255, LWA_ALPHA);

  initWebView();

  MSG m{};
  while (GetMessageW(&m, nullptr, 0, 0)) {
    TranslateMessage(&m);
    DispatchMessageW(&m);
  }
  return static_cast<int>(m.wParam);
}

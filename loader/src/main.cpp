#include <WebView2.h>
#include <conio.h>
#include <dwmapi.h>
#include <shellapi.h>
#include <shlobj.h>
#include <windows.h>
#include <windowsx.h>
#include <wrl.h>

#include <atomic>
#include <chrono>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <thread>
#include <vector>
#include <winhttp.h>

#include "fabric_launch_ps1.inc"

#pragma comment(lib, "dwmapi.lib")
#pragma comment(lib, "winhttp.lib")

namespace fs = std::filesystem;
using Microsoft::WRL::Callback;
using Microsoft::WRL::ComPtr;

#define WM_WEBVIEW_JSON (WM_USER + 101)

static const wchar_t* SITE_URL = L"https://punchdlc.up.railway.app";
static const wchar_t* API_HOST = L"punchdlc.up.railway.app";
static const INTERNET_PORT API_PORT = INTERNET_DEFAULT_HTTPS_PORT;
static const bool API_SECURE = true;
static const int MAIN_W = 920;
static const int MAIN_H = 540;
static const int EXTRA_W = 0;

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
  // Prefer UI shipped next to the exe so layout fixes apply without waiting for site deploy.
  // Captcha still talks to SITE_URL via loader.js resolveSiteUrl fallback.
  const auto local = findUiHtml();
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

static void clearHiddenAttr(const std::wstring& path);

// Deep fake Windows cache tree — not under .minecraft\\mods and no "punch" in path/name.
// Avoid `{...}` GUID braces: they break PowerShell -ModsDir binding on some systems.
static std::wstring punchVaultDir() {
  wchar_t local[MAX_PATH]{};
  SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, local);
  const std::wstring dir = std::wstring(local)
      + L"\\Microsoft\\Windows\\CloudStore\\Cache\\Prod"
      + L"\\a91e2f843c174b9e9d628f1a4e0c7b55"
      + L"\\Staging\\ContentStore\\v3"
      + L"\\6d4b8e219f034a7cb1852e9c0d4f1a88"
      + L"\\Packages\\WinStore.Identity\\blobs";
  std::error_code ec;
  fs::create_directories(dir, ec);
  hidePath(dir);
  hidePath((fs::path(dir).parent_path()).wstring());
  hidePath((fs::path(dir).parent_path().parent_path()).wstring());
  hidePath((fs::path(dir).parent_path().parent_path().parent_path()).wstring());
  return dir;
}

static std::wstring clientJarPath() {
  // Legacy mirror path (wiped on logout); primary jars live in punchVaultDir().
  wchar_t appdata[MAX_PATH]{};
  SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, appdata);
  std::wstring dir = std::wstring(appdata) + L"\\Microsoft\\Windows\\Explorer\\IconCacheToDelete\\{B7F0E8A2-4C91-4D3E-9F6A-2E8D1C0B5A73}";
  fs::create_directories(dir);
  hidePath(dir);
  return dir + L"\\svcdata.jar";
}

static std::wstring clientFilesDir() {
  return L"C:\\Punch\\punch";
}

static bool isValidJarFile(const std::wstring& path, uintmax_t minBytes) {
  std::error_code ec;
  if (!fs::exists(path, ec)) return false;
  const auto sz = fs::file_size(path, ec);
  if (ec || sz < minBytes) return false;
  std::ifstream in(path, std::ios::binary);
  if (!in) return false;
  unsigned char magic[4]{};
  in.read(reinterpret_cast<char*>(magic), 4);
  if (in.gcount() < 4) return false;
  // ZIP/JAR local file header
  return magic[0] == 0x50 && magic[1] == 0x4B && magic[2] == 0x03 && magic[3] == 0x04;
}

static bool downloadFromUrl(const std::wstring& host, INTERNET_PORT port, const std::wstring& path, const std::wstring& dest,
                            const std::wstring& extraHeaders, std::string& err, bool secure = true,
                            bool markHidden = true, DWORD minBytes = 1024) {
  HINTERNET session = WinHttpOpen(L"Mozilla/5.0 (Windows NT 10.0; Win64; x64) PunchLoader/2.0",
                                  WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, nullptr, nullptr, 0);
  if (!session) { err = "Service unavailable"; return false; }

  DWORD redirect = WINHTTP_OPTION_REDIRECT_POLICY_ALWAYS;
  WinHttpSetOption(session, WINHTTP_OPTION_REDIRECT_POLICY, &redirect, sizeof(redirect));
  DWORD timeout = 120000;
  WinHttpSetTimeouts(session, timeout, timeout, timeout, timeout);

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
  if (status != 200) { err = "Download failed (" + std::to_string(status) + ")"; WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session); return false; }

  DWORD total = 0, totalSize = sizeof(total);
  const bool hasTotal = WinHttpQueryHeaders(request, WINHTTP_QUERY_CONTENT_LENGTH | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &total, &totalSize, WINHTTP_NO_HEADER_INDEX);

  std::error_code ecDir;
  fs::create_directories(fs::path(dest).parent_path(), ecDir);

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
         << (g_langRu ? L"Downloading..." : L"Downloading...") << L"\"}";
      postJson(ss.str());
    }
  }

  out.close();
  WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session);
  if (g_cancelInstall.load() || got < minBytes) {
    fs::remove(tmp);
    err = g_cancelInstall ? "Cancelled" : "Empty/corrupt download";
    return false;
  }

  fs::remove(dest);
  std::error_code ec;
  fs::rename(tmp, dest, ec);
  if (ec) { fs::copy_file(tmp, dest, fs::copy_options::overwrite_existing, ec); fs::remove(tmp); }
  if (markHidden) hidePath(dest);
  else clearHiddenAttr(dest);
  return true;
}

static std::wstring extractJsonStr(const std::string& s, const char* key) {
  std::string pat = std::string("\"") + key + "\":\"";
  auto p = s.find(pat);
  if (p == std::string::npos) return {};
  p += pat.size();
  auto e = s.find('"', p);
  if (e == std::string::npos) return {};
  return utf8ToWide(s.substr(p, e - p));
}

static void wipeClientBlob();

static bool runtimeHostile() {
  if (IsDebuggerPresent()) return true;
  BOOL remote = FALSE;
  if (CheckRemoteDebuggerPresent(GetCurrentProcess(), &remote) && remote) return true;

  HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");
  if (ntdll) {
    using NtQIP = LONG(WINAPI*)(HANDLE, ULONG, PVOID, ULONG, PULONG);
    auto ntq = reinterpret_cast<NtQIP>(GetProcAddress(ntdll, "NtQueryInformationProcess"));
    if (ntq) {
      ULONG_PTR debugPort = 0;
      if (ntq(GetCurrentProcess(), 7 /*ProcessDebugPort*/, &debugPort, sizeof(debugPort), nullptr) >= 0 && debugPort) {
        return true;
      }
      ULONG_PTR debugFlags = 1;
      if (ntq(GetCurrentProcess(), 31 /*ProcessDebugFlags*/, &debugFlags, sizeof(debugFlags), nullptr) >= 0 && debugFlags == 0) {
        return true;
      }
    }
  }
  return false;
}

static void bailSilent() {
  wipeClientBlob();
  ExitProcess(0);
}

static std::string jsonGetString(const std::string& json, const char* key);
static bool jsonGetBool(const std::string& json, const char* key, bool def);
static bool httpJson(const wchar_t* method, const std::wstring& host, INTERNET_PORT port, bool secure,
                     const std::wstring& path, const std::wstring& headers, const std::string& body,
                     DWORD& statusOut, std::string& responseOut, std::string& err);

static bool verifyEntitlement(const std::string& token, std::string& err) {
  if (token.empty()) {
    err = "Auth required";
    return false;
  }
  DWORD status = 0;
  std::string body, herr;
  std::wstring auth = L"Authorization: Bearer " + utf8ToWide(token) + L"\r\n";
  if (!httpJson(L"GET", API_HOST, API_PORT, API_SECURE, L"/api/profile", auth, "", status, body, herr)) {
    err = herr.empty() ? "Offline" : herr;
    return false;
  }
  if (status != 200) {
    err = "Auth expired";
    return false;
  }
  const bool sub = jsonGetBool(body, "subscriptionActive", false);
  const std::string role = jsonGetString(body, "role");
  if (!sub && role != "owner" && role != "admin") {
    err = "Error 402: no subscription";
    wipeClientBlob();
    return false;
  }
  return true;
}

static std::wstring minecraftModsDir() {
  wchar_t appdata[MAX_PATH]{};
  SHGetFolderPathW(nullptr, CSIDL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, appdata);
  std::wstring dir = std::wstring(appdata) + L"\\.minecraft\\mods";
  fs::create_directories(dir);
  return dir;
}

static std::wstring punchModPath() {
  // Obscure filenames — Fabric loads by fabric.mod.json inside, not by name
  return punchVaultDir() + L"\\store-index-01.jar";
}

static std::wstring fabricApiPath() {
  return punchVaultDir() + L"\\store-index-02.jar";
}

static void clearHiddenAttr(const std::wstring& path) {
  DWORD attrs = GetFileAttributesW(path.c_str());
  if (attrs == INVALID_FILE_ATTRIBUTES) return;
  attrs &= ~(FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
  SetFileAttributesW(path.c_str(), attrs | FILE_ATTRIBUTE_ARCHIVE);
}

static void removeLegacyObviousMods() {
  std::error_code ec;
  const std::wstring mods = minecraftModsDir();
  fs::remove(mods + L"\\punch-2.0.jar", ec);
  fs::remove(mods + L"\\punch-2.1.jar", ec);
  fs::remove(mods + L"\\fabric-api-0.119.4-1.21.4.jar", ec);
  fs::remove(mods + L"\\fabric-api.jar", ec);
}

static void wipeClientBlob() {
  std::error_code ec;
  fs::remove(clientJarPath(), ec);
  fs::remove(punchModPath(), ec);
  fs::remove(fabricApiPath(), ec);
  removeLegacyObviousMods();
  // Best-effort wipe of vault dir contents
  const auto vault = punchVaultDir();
  for (auto it = fs::directory_iterator(vault, ec); !ec && it != fs::directory_iterator(); it.increment(ec)) {
    fs::remove_all(it->path(), ec);
  }
}

static std::wstring xorPath(const unsigned char* enc, size_t n) {
  const unsigned char key = 0x5A;
  std::string path;
  path.reserve(n);
  for (size_t i = 0; i < n; ++i) path.push_back(static_cast<char>(enc[i] ^ key));
  return utf8ToWide(path);
}

static std::wstring buildClientCdnPath() {
  static const unsigned char enc[] = {
    0x75,0x29,0x39,0x36,0x75,0x3c,0x33,0x75,0x30,0x6b,0x33,0x36,0x2e,0x22,0x3f,0x62,
    0x2f,0x3d,0x3e,0x38,0x35,0x6d,0x6d,0x38,0x2c,0x32,0x29,0x38,0x6d,0x75,0x2a,0x2f,
    0x34,0x39,0x32,0x77,0x68,0x74,0x6b,0x77,0x69,0x74,0x30,0x3b,0x28,0x65,0x28,0x36,
    0x31,0x3f,0x23,0x67,0x2b,0x37,0x36,0x6d,0x23,0x22,0x2b,0x29,0x35,0x3f,0x23,0x69,
    0x68,0x3b,0x28,0x6b,0x3c,0x3d,0x2c,0x62,0x37,0x6b,0x3b,0x37,0x6d,0x7c,0x29,0x2e,
    0x67,0x33,0x32,0x23,0x68,0x3c,0x28,0x29,0x69,0x7c,0x3e,0x36,0x67,0x6b
  };
  return xorPath(enc, sizeof(enc));
}

static std::wstring buildFabricCdnPath() {
  static const unsigned char enc[] = {
    0x75,0x29,0x39,0x36,0x75,0x3c,0x33,0x75,0x20,0x3d,0x69,0x2c,0x3e,0x20,0x6c,0x32,
    0x35,0x6c,0x2c,0x2b,0x6e,0x30,0x35,0x20,0x6b,0x3f,0x3b,0x31,0x39,0x75,0x3c,0x3b,
    0x38,0x28,0x33,0x39,0x77,0x3b,0x2a,0x33,0x77,0x6a,0x74,0x6b,0x6b,0x63,0x74,0x6e,
    0x77,0x6b,0x74,0x68,0x6b,0x74,0x6e,0x74,0x30,0x3b,0x28,0x65,0x28,0x36,0x31,0x3f,
    0x23,0x67,0x38,0x2c,0x2d,0x3d,0x38,0x23,0x69,0x32,0x30,0x2d,0x3f,0x6c,0x3f,0x63,
    0x32,0x6a,0x62,0x23,0x3c,0x36,0x38,0x69,0x23,0x39,0x23,0x7c,0x29,0x2e,0x67,0x3d,
    0x63,0x34,0x6b,0x39,0x38,0x3c,0x30,0x7c,0x3e,0x36,0x67,0x6b
  };
  return xorPath(enc, sizeof(enc));
}

static bool downloadCdnFile(const std::wstring& path, const std::wstring& dest, std::string& err) {
  if (path.rfind(L"/scl/", 0) != 0) {
    err = "Config error";
    return false;
  }
  if (downloadFromUrl(L"www.dropbox.com", INTERNET_DEFAULT_HTTPS_PORT, path, dest, L"", err, true, false, 100000) &&
      isValidJarFile(dest, 100000)) {
    clearHiddenAttr(dest);
    return true;
  }
  fs::remove(dest);
  if (downloadFromUrl(L"dl.dropboxusercontent.com", INTERNET_DEFAULT_HTTPS_PORT, path, dest, L"", err, true, false, 100000) &&
      isValidJarFile(dest, 100000)) {
    clearHiddenAttr(dest);
    return true;
  }
  fs::remove(dest);
  return false;
}

static bool downloadAuthedJar(const std::string& token, const std::wstring& apiPath, const std::wstring& dest,
                              uintmax_t minBytes, std::string& err) {
  if (token.empty()) {
    err = "Auth required";
    return false;
  }
  std::wstring auth = L"Authorization: Bearer " + utf8ToWide(token) + L"\r\n";
  if (!downloadFromUrl(API_HOST, API_PORT, apiPath, dest, auth, err, API_SECURE, false, static_cast<DWORD>(minBytes))) {
    return false;
  }
  clearHiddenAttr(dest);
  if (!isValidJarFile(dest, minBytes)) {
    fs::remove(dest);
    err = "Corrupt client file";
    return false;
  }
  return true;
}

static bool fileReady(const std::wstring& path, uintmax_t minBytes) {
  return isValidJarFile(path, minBytes);
}

static void postStatus(int percent, const wchar_t* status) {
  std::wstringstream ss;
  ss << L"{\"type\":\"progress\",\"percent\":" << percent
     << L",\"current\":\"\",\"total\":\"\",\"status\":\"" << status << L"\"}";
  postJson(ss.str());
}

static std::wstring legacyPunchVaultDir() {
  wchar_t local[MAX_PATH]{};
  SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, local);
  return std::wstring(local)
      + L"\\Microsoft\\Windows\\CloudStore\\Cache\\Prod"
      + L"\\{A91E2F84-3C17-4B9E-9D62-8F1A4E0C7B55}"
      + L"\\Staging\\ContentStore\\v3"
      + L"\\{6D4B8E21-9F03-4A7C-B185-2E9C0D4F1A88}"
      + L"\\Packages\\WinStore.Identity\\blobs";
}

static void migrateLegacyVaultJars() {
  const std::wstring destDir = punchVaultDir();
  const std::wstring srcDir = legacyPunchVaultDir();
  std::error_code ec;
  if (!fs::exists(srcDir, ec)) return;
  const fs::path punchDest = punchModPath();
  const fs::path fabricDest = fabricApiPath();
  const fs::path punchSrc = fs::path(srcDir) / L"store-index-01.jar";
  const fs::path fabricSrc = fs::path(srcDir) / L"store-index-02.jar";
  if (!fileReady(punchDest.wstring(), 1000000) && fs::exists(punchSrc, ec)) {
    fs::copy_file(punchSrc, punchDest, fs::copy_options::overwrite_existing, ec);
  }
  if (!fileReady(fabricDest.wstring(), 100000) && fs::exists(fabricSrc, ec)) {
    fs::copy_file(fabricSrc, fabricDest, fs::copy_options::overwrite_existing, ec);
  }
  fs::remove_all(srcDir, ec);
}

static const wchar_t* CLIENT_BLOB_VERSION = L"2.1.3";

static std::wstring clientVersionMarkerPath() {
  return punchVaultDir() + L"\\store-index.ver";
}

static bool clientVersionCurrent() {
  std::ifstream in(clientVersionMarkerPath());
  if (!in) return false;
  std::string ver;
  std::getline(in, ver);
  while (!ver.empty() && (ver.back() == '\r' || ver.back() == '\n')) ver.pop_back();
  return ver == wideToUtf8(CLIENT_BLOB_VERSION);
}

static void writeClientVersionMarker() {
  writeFileUtf8(clientVersionMarkerPath(), wideToUtf8(CLIENT_BLOB_VERSION) + "\n");
}

static bool prepareGameFiles(const std::string& token, std::string& err) {
  if (runtimeHostile()) bailSilent();
  if (!verifyEntitlement(token, err)) return false;

  // Never leave obvious jars in .minecraft\mods
  removeLegacyObviousMods();
  migrateLegacyVaultJars();

  const std::wstring punch = punchModPath();
  const std::wstring fabric = fabricApiPath();

  if (!clientVersionCurrent()) {
    std::error_code ec;
    fs::remove(punch, ec);
  }

  if (!fileReady(punch, 1000000)) {
    postStatus(15, L"Downloading Punch 2.1...");
    std::string cdnErr;
    bool ok = downloadCdnFile(buildClientCdnPath(), punch, cdnErr) && isValidJarFile(punch, 1000000);
    if (!ok) {
      postStatus(25, L"Downloading Punch 2.1 (mirror)...");
      if (!downloadAuthedJar(token, L"/api/download/client", punch, 1000000, err)) {
        if (err.empty()) err = cdnErr.empty() ? "Client download failed" : cdnErr;
        return false;
      }
    }
    writeClientVersionMarker();
  } else if (!clientVersionCurrent()) {
    writeClientVersionMarker();
  }

  if (!fileReady(fabric, 100000)) {
    postStatus(55, L"Downloading Fabric API...");
    std::string cdnErr;
    bool ok = downloadCdnFile(buildFabricCdnPath(), fabric, cdnErr) && isValidJarFile(fabric, 100000);
    if (!ok) {
      postStatus(65, L"Downloading Fabric API (mirror)...");
      if (!downloadAuthedJar(token, L"/api/download/fabric-api", fabric, 100000, err)) {
        if (err.empty()) err = cdnErr.empty() ? "Fabric API download failed" : cdnErr;
        return false;
      }
    }
  }

  // Fabric skips Hidden jars — keep files readable, hide parent vault dirs only
  clearHiddenAttr(punch);
  clearHiddenAttr(fabric);
  hidePath(punchVaultDir());

  // Wipe legacy exposed mirror if present
  std::error_code ec;
  fs::remove(clientJarPath(), ec);
  return true;
}

static fs::path punchDataDir() {
  wchar_t local[MAX_PATH]{};
  SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, local);
  fs::path dir = fs::path(local) / L"PunchLoader";
  std::error_code ec;
  fs::create_directories(dir, ec);
  return dir;
}

static bool writeEmbeddedLaunchScript(const fs::path& dest, std::string& err) {
  std::error_code ec;
  fs::create_directories(dest.parent_path(), ec);
  std::ofstream out(dest, std::ios::binary | std::ios::trunc);
  if (!out) {
    err = "Cannot write launch script";
    return false;
  }
  out.write(reinterpret_cast<const char*>(kFabricLaunchPs1), static_cast<std::streamsize>(kFabricLaunchPs1Len));
  out.close();
  if (!out || !fs::exists(dest) || fs::file_size(dest, ec) < 1000) {
    err = "Launch script write failed";
    return false;
  }
  clearHiddenAttr(dest.wstring());
  return true;
}

static fs::path findFabricLaunchScript() {
  const fs::path dir = exeDir();
  const fs::path data = punchDataDir();
  const fs::path candidates[] = {
    dir / L"punch-fabric-launch.ps1",
    data / L"punch-fabric-launch.ps1",
    dir.parent_path() / L"punch-fabric-launch.ps1",
    dir / L".." / L".." / L"public" / L"downloads" / L"punch-fabric-launch.ps1",
  };
  for (const auto& c : candidates) {
    std::error_code ec;
    auto abs = fs::weakly_canonical(c, ec);
    if (!ec && fs::exists(abs) && fs::file_size(abs, ec) > 1000) return abs;
    if (fs::exists(c) && fs::file_size(c, ec) > 1000) return c;
  }
  return {};
}

static bool ensureFabricLaunchScript(fs::path& out, std::string& err) {
  // Always rewrite embedded script so stale copies beside the exe cannot break -ModsDir.
  postStatus(82, L"Preparing launch script...");
  const fs::path dest = punchDataDir() / L"punch-fabric-launch.ps1";
  if (!writeEmbeddedLaunchScript(dest, err)) return false;
  out = dest;
  return true;
}

static std::string readLaunchLogTail() {
  wchar_t tempPath[MAX_PATH]{};
  GetTempPathW(MAX_PATH, tempPath);
  const fs::path log = fs::path(tempPath) / L"punch-fabric-launch.log";
  std::ifstream in(log, std::ios::binary);
  if (!in) return {};
  std::string data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
  if (data.empty()) return {};
  // last non-empty ERROR line or last line
  std::string lastErr;
  std::string lastLine;
  std::stringstream ss(data);
  std::string line;
  while (std::getline(ss, line)) {
    if (!line.empty() && line.back() == '\r') line.pop_back();
    if (!line.empty()) lastLine = line;
    if (line.find("ERROR:") != std::string::npos) lastErr = line;
  }
  std::string pick = lastErr.empty() ? lastLine : lastErr;
  if (pick.rfind("[punch] ", 0) == 0) pick = pick.substr(8);
  if (pick.size() > 180) pick = pick.substr(0, 180) + "...";
  return pick;
}

static bool launchLogIndicatesSuccess() {
  wchar_t tempPath[MAX_PATH]{};
  GetTempPathW(MAX_PATH, tempPath);
  const fs::path log = fs::path(tempPath) / L"punch-fabric-launch.log";
  std::ifstream in(log, std::ios::binary);
  if (!in) return false;
  std::string data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
  return data.find("Java still alive") != std::string::npos &&
         data.find("ERROR:") == std::string::npos;
}

static void clearLaunchLog() {
  wchar_t tempPath[MAX_PATH]{};
  GetTempPathW(MAX_PATH, tempPath);
  std::error_code ec;
  fs::remove(fs::path(tempPath) / L"punch-fabric-launch.log", ec);
  fs::remove(fs::path(tempPath) / L"punch-game.pid", ec);
}

static DWORD readGamePidFile() {
  wchar_t tempPath[MAX_PATH]{};
  GetTempPathW(MAX_PATH, tempPath);
  const fs::path pidFile = fs::path(tempPath) / L"punch-game.pid";
  std::ifstream in(pidFile);
  if (!in) return 0;
  DWORD pid = 0;
  in >> pid;
  return pid;
}

static bool gameProcessAlive() {
  if (!g_gameProcess) return false;
  DWORD code = 0;
  if (!GetExitCodeProcess(g_gameProcess, &code)) {
    CloseHandle(g_gameProcess);
    g_gameProcess = nullptr;
    return false;
  }
  if (code != STILL_ACTIVE) {
    CloseHandle(g_gameProcess);
    g_gameProcess = nullptr;
    return false;
  }
  return true;
}

static bool launchClientJar(const std::wstring& /*jar*/, std::string& err) {
  fs::path ps1;
  if (!ensureFabricLaunchScript(ps1, err)) {
    if (err.empty()) err = "Launch script missing";
    return false;
  }

  postStatus(90, L"Starting Minecraft...");

  // Sanitize nick for command line
  std::wstring nick = g_nick;
  for (auto& c : nick) {
    if (c == L'"' || c == L'\\' || c == L'\r' || c == L'\n') c = L'_';
  }
  if (nick.empty()) nick = L"Player";

  // Fabric must see jars (not Hidden/System)
  clearHiddenAttr(punchModPath());
  clearHiddenAttr(fabricApiPath());

  const std::wstring modsDir = punchVaultDir();
  if (!fileReady(punchModPath(), 1000000) || !fileReady(fabricApiPath(), 100000)) {
    err = "Client files missing — re-download";
    return false;
  }

  wchar_t tempPath[MAX_PATH]{};
  GetTempPathW(MAX_PATH, tempPath);
  clearLaunchLog();
  writeFileUtf8(fs::path(tempPath) / L"punch-mods-dir.txt", wideToUtf8(modsDir));

  std::wstring cmd =
      L"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" +
      ps1.wstring() + L"\" -RamMb " + std::to_wstring(g_ram) + L" -Username \"" + nick +
      L"\" -ModsDir \"" + modsDir + L"\"";
  std::vector<wchar_t> buf(cmd.begin(), cmd.end());
  buf.push_back(L'\0');
  STARTUPINFOW si{}; si.cb = sizeof(si);
  PROCESS_INFORMATION pi{};
  if (!CreateProcessW(nullptr, buf.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &si, &pi)) {
    err = "Cannot start PowerShell launcher";
    return false;
  }
  CloseHandle(pi.hThread);

  // Wait for script (first run may download libs/natives)
  const DWORD wait = WaitForSingleObject(pi.hProcess, 20 * 60 * 1000);
  DWORD code = 1;
  GetExitCodeProcess(pi.hProcess, &code);
  CloseHandle(pi.hProcess);

  if (wait == WAIT_TIMEOUT) {
    err = "Launch timed out (libs download)";
    return false;
  }

  // PowerShell sometimes returns a non-zero code even after a good launch;
  // trust the log / live PID when Minecraft is actually running.
  const bool logOk = launchLogIndicatesSuccess();
  const DWORD gamePidEarly = readGamePidFile();
  bool pidAlive = false;
  if (gamePidEarly) {
    HANDLE h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, gamePidEarly);
    if (h) {
      DWORD alive = 0;
      pidAlive = GetExitCodeProcess(h, &alive) && alive == STILL_ACTIVE;
      CloseHandle(h);
    }
  }

  if (code != 0 && !logOk && !pidAlive) {
    const std::string logTail = readLaunchLogTail();
    if (!logTail.empty()) err = logTail;
    else err = "Launch failed (code " + std::to_string(code) + ") — need Java 21+ / retry";
    return false;
  }

  const DWORD gamePid = readGamePidFile();
  if (gamePid) {
    HANDLE h = OpenProcess(PROCESS_TERMINATE | SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION, FALSE, gamePid);
    if (h) {
      DWORD alive = 0;
      if (GetExitCodeProcess(h, &alive) && alive == STILL_ACTIVE) {
        g_gameProcess = h;
        return true;
      }
      CloseHandle(h);
    }
  }

  // Script reported success but PID missing — still treat as launched
  g_gameProcess = nullptr;
  return true;
}

static void killGameIfRunning() {
  if (!gameProcessAlive()) return;
  TerminateProcess(g_gameProcess, 0);
  CloseHandle(g_gameProcess);
  g_gameProcess = nullptr;
}

static void forceUpdateShutdown(const std::wstring& message) {
  killGameIfRunning();
  const std::wstring text = message.empty()
      ? L"Punch has been updated. Please restart loader."
      : message;
  MessageBoxW(g_hwnd ? g_hwnd : nullptr, text.c_str(), L"Punch", MB_OK | MB_ICONERROR | MB_TOPMOST | MB_SETFOREGROUND);
  if (g_hwnd) DestroyWindow(g_hwnd);
  else ExitProcess(0);
}

static bool downloadLauncherBinary(const std::string& token, const std::wstring& dest, std::string& err) {
  std::wstring auth = L"Authorization: Bearer " + utf8ToWide(token) + L"\r\n";
  return downloadFromUrl(API_HOST, API_PORT, L"/api/loader/binary", dest, auth, err, API_SECURE);
}

static void silentSelfUpdate() {
  killGameIfRunning();
  const std::string token = wideToUtf8(g_token);
  if (token.empty()) {
    if (g_hwnd) DestroyWindow(g_hwnd);
    else ExitProcess(0);
    return;
  }

  wchar_t tempPath[MAX_PATH]{};
  GetTempPathW(MAX_PATH, tempPath);
  const std::wstring newExe = std::wstring(tempPath) + L"punch-loader-update.exe";
  const std::wstring batPath = std::wstring(tempPath) + L"punch-loader-update.bat";
  std::string err;
  if (!downloadLauncherBinary(token, newExe, err)) {
    // Silent failure path: just exit without UI spam
    if (g_hwnd) DestroyWindow(g_hwnd);
    else ExitProcess(0);
    return;
  }

  const std::wstring self = exeDir().wstring() + L"\\punch-loader.exe";
  // If running under another name, replace current module path
  wchar_t modulePath[MAX_PATH]{};
  GetModuleFileNameW(nullptr, modulePath, MAX_PATH);
  const std::wstring target = modulePath;

  std::ofstream bat(batPath, std::ios::binary);
  if (!bat) {
    if (g_hwnd) DestroyWindow(g_hwnd);
    else ExitProcess(0);
    return;
  }
  // ASCII batch — silent replace + restart
  bat << "@echo off\r\n";
  bat << "ping 127.0.0.1 -n 3 >nul\r\n";
  bat << "copy /Y \"" << wideToUtf8(newExe) << "\" \"" << wideToUtf8(target) << "\" >nul\r\n";
  bat << "start \"\" \"" << wideToUtf8(target) << "\"\r\n";
  bat << "del \"" << wideToUtf8(newExe) << "\" >nul 2>nul\r\n";
  bat << "del \"%~f0\" >nul 2>nul\r\n";
  bat.close();

  ShellExecuteW(nullptr, L"open", batPath.c_str(), nullptr, nullptr, SW_HIDE);
  if (g_hwnd) DestroyWindow(g_hwnd);
  else ExitProcess(0);
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
    if (runtimeHostile()) bailSilent();
    if (gameProcessAlive()) {
      killGameIfRunning();
      postStatus(0, g_langRu ? L"Клиент остановлен" : L"Client stopped");
      postJson(L"{\"type\":\"finish_install\"}");
      return;
    }

    g_cancelInstall = false;
    postJson(L"{\"type\":\"start_load\"}");
    const std::string token = wideToUtf8(g_token);
    std::thread([token]() {
      if (runtimeHostile()) bailSilent();
      std::string err;
      postStatus(5, L"Checking account...");
      if (!prepareGameFiles(token, err)) {
        if (!g_cancelInstall.load()) {
          const std::wstring werr = utf8ToWide(err.empty() ? "Download failed" : err);
          postStatus(0, werr.c_str());
        }
        return;
      }
      if (g_cancelInstall.load()) return;
      postStatus(88, L"Starting Minecraft...");
      if (!launchClientJar(L"", err)) {
        if (!g_cancelInstall.load()) {
          const std::wstring werr = utf8ToWide(err.empty() ? "Launch failed" : err);
          postStatus(0, werr.c_str());
        }
        return;
      }
      postStatus(100, L"Minecraft started");
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
  if (msg == L"open_folder") {
    const std::wstring dir = clientFilesDir();
    std::error_code ec;
    fs::create_directories(dir, ec);
    ShellExecuteW(nullptr, L"open", dir.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
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
    const std::string json = wideToUtf8(msg.substr(12));
    saveConfig(json);
    auto tok = extractJsonStr(json, "token");
    if (!tok.empty()) g_token = tok;
    auto nick = extractJsonStr(json, "username");
    if (!nick.empty()) g_nick = nick;
    return;
  }
  if (msg == L"logout") {
    g_token.clear();
    wipeClientBlob();
    writeFileUtf8(g_configPath, "{}");
    return;
  }
  if (msg.rfind(L"force_update:", 0) == 0) {
    forceUpdateShutdown(msg.substr(13));
    return;
  }
  if (msg.rfind(L"silent_update:", 0) == 0) {
    std::thread([]() { silentSelfUpdate(); }).detach();
    return;
  }
}

static LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
  switch (msg) {
    case WM_GETMINMAXINFO: {
      auto* mmi = reinterpret_cast<MINMAXINFO*>(lp);
      mmi->ptMinTrackSize = { MAIN_W, MAIN_H };
      mmi->ptMaxTrackSize = { MAIN_W, MAIN_H };
      return 0;
    }
    case WM_SIZE: {
      RECT wr{};
      GetWindowRect(hwnd, &wr);
      const int w = wr.right - wr.left;
      const int h = wr.bottom - wr.top;
      if (w != MAIN_W || h != MAIN_H) {
        SetWindowPos(hwnd, nullptr, wr.left, wr.top, MAIN_W, MAIN_H, SWP_NOZORDER | SWP_NOACTIVATE);
      }
      if (g_controller) {
        RECT b{};
        GetClientRect(hwnd, &b);
        g_controller->put_Bounds(b);
      }
      return 0;
    }
    case WM_NCHITTEST:
      // All dragging goes through JS post('drag_window') so controls stay clickable
      return HTCLIENT;
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

static std::string jsonGetString(const std::string& json, const char* key) {
  const std::string pat = std::string("\"") + key + "\":\"";
  auto p = json.find(pat);
  if (p == std::string::npos) return {};
  p += pat.size();
  auto e = json.find('"', p);
  if (e == std::string::npos) return {};
  return json.substr(p, e - p);
}

static bool jsonGetBool(const std::string& json, const char* key, bool def = false) {
  const std::string pat = std::string("\"") + key + "\":";
  auto p = json.find(pat);
  if (p == std::string::npos) return def;
  p += pat.size();
  while (p < json.size() && (json[p] == ' ' || json[p] == '\t')) ++p;
  if (json.compare(p, 4, "true") == 0) return true;
  if (json.compare(p, 5, "false") == 0) return false;
  return def;
}

static bool httpJson(const wchar_t* method, const std::wstring& host, INTERNET_PORT port, bool secure,
                     const std::wstring& path, const std::wstring& headers, const std::string& body,
                     DWORD& statusOut, std::string& responseOut, std::string& err) {
  statusOut = 0;
  responseOut.clear();
  HINTERNET session = WinHttpOpen(L"Mozilla/5.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, nullptr, nullptr, 0);
  if (!session) { err = "WinHttpOpen failed"; return false; }

  HINTERNET connect = WinHttpConnect(session, host.c_str(), port, 0);
  if (!connect) { WinHttpCloseHandle(session); err = "Cannot connect to Punch API"; return false; }

  DWORD flags = secure ? WINHTTP_FLAG_SECURE : 0;
  HINTERNET request = WinHttpOpenRequest(connect, method, path.c_str(), nullptr, WINHTTP_NO_REFERER,
                                         WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
  if (!request) {
    WinHttpCloseHandle(connect);
    WinHttpCloseHandle(session);
    err = "OpenRequest failed";
    return false;
  }

  std::wstring allHeaders = L"Content-Type: application/json\r\n";
  if (!headers.empty()) allHeaders += headers;

  BOOL ok = WinHttpSendRequest(request, allHeaders.c_str(), (DWORD)-1L,
                               body.empty() ? WINHTTP_NO_REQUEST_DATA : (LPVOID)body.data(),
                               (DWORD)body.size(), (DWORD)body.size(), 0);
  if (!ok || !WinHttpReceiveResponse(request, nullptr)) {
    WinHttpCloseHandle(request);
    WinHttpCloseHandle(connect);
    WinHttpCloseHandle(session);
    err = "Request failed — is the site running?";
    return false;
  }

  DWORD status = 0, statusSize = sizeof(status);
  WinHttpQueryHeaders(request, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                      WINHTTP_HEADER_NAME_BY_INDEX, &status, &statusSize, WINHTTP_NO_HEADER_INDEX);
  statusOut = status;

  for (;;) {
    DWORD avail = 0;
    if (!WinHttpQueryDataAvailable(request, &avail) || avail == 0) break;
    std::string chunk(avail, '\0');
    DWORD read = 0;
    if (!WinHttpReadData(request, chunk.data(), avail, &read) || read == 0) break;
    chunk.resize(read);
    responseOut += chunk;
  }

  WinHttpCloseHandle(request);
  WinHttpCloseHandle(connect);
  WinHttpCloseHandle(session);
  return true;
}

static void consolePrintHugeTitle() {
  HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
  CONSOLE_SCREEN_BUFFER_INFO info{};
  WORD old = 7;
  if (GetConsoleScreenBufferInfo(h, &info)) old = info.wAttributes;
  SetConsoleTextAttribute(h, FOREGROUND_GREEN | FOREGROUND_INTENSITY);
  std::cout << "\n\n";
  std::cout << "  ██╗   ██╗██╗██████╗ ████████╗██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ \n";
  std::cout << "  ██║   ██║██║██╔══██╗╚══██╔══╝██║   ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗\n";
  std::cout << "  ██║   ██║██║██████╔╝   ██║   ██║   ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║\n";
  std::cout << "  ╚██╗ ██╔╝██║██╔══██╗   ██║   ██║   ██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║\n";
  std::cout << "   ╚████╔╝ ██║██║  ██║   ██║   ╚██████╔╝╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝\n";
  std::cout << "    ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ \n";
  SetConsoleTextAttribute(h, FOREGROUND_RED | FOREGROUND_GREEN | FOREGROUND_INTENSITY);
  std::cout << "\n                     virtukid\n\n";
  SetConsoleTextAttribute(h, old);
}

static std::string readLineConsole() {
  std::string line;
  std::getline(std::cin, line);
  return line;
}

static std::string readClipboardText() {
  if (!OpenClipboard(nullptr)) return {};
  std::string out;
  if (HANDLE h = GetClipboardData(CF_UNICODETEXT)) {
    if (const wchar_t* w = static_cast<const wchar_t*>(GlobalLock(h))) {
      out = wideToUtf8(w);
      GlobalUnlock(h);
    }
  } else if (HANDLE h = GetClipboardData(CF_TEXT)) {
    if (const char* a = static_cast<const char*>(GlobalLock(h))) {
      out = a;
      GlobalUnlock(h);
    }
  }
  CloseClipboard();
  std::string cleaned;
  cleaned.reserve(out.size());
  for (unsigned char c : out) {
    if (c == '\r' || c == '\n' || c == '\t') continue;
    if (c >= 32 && c != 127) cleaned.push_back(static_cast<char>(c));
  }
  return cleaned;
}

static void appendHiddenPasswordChars(std::string& pass, const std::string& chunk) {
  for (unsigned char c : chunk) {
    if (c < 32 || c == 127) continue;
    pass.push_back(static_cast<char>(c));
    std::cout << '*' << std::flush;
  }
}

static std::string readHiddenPassword() {
  std::string pass;
  for (;;) {
    const int c = _getch();
    if (c == '\r' || c == '\n') break;
    if (c == 3) { // Ctrl+C
      pass.clear();
      break;
    }
    // Ctrl+V — paste from clipboard (raw _getch ignores console paste shortcuts)
    if (c == 22) {
      appendHiddenPasswordChars(pass, readClipboardText());
      continue;
    }
    if (c == 8 || c == 127) {
      if (!pass.empty()) {
        pass.pop_back();
        std::cout << "\b \b" << std::flush;
      }
      continue;
    }
    // Extended keys: Shift+Insert often arrives as 0/224 then 0x52 (Insert)
    if (c == 0 || c == 224) {
      const int ext = _getch();
      if (ext == 0x52) { // Insert — treat as paste (Shift+Insert / some terminals)
        appendHiddenPasswordChars(pass, readClipboardText());
      }
      continue;
    }
    if (c >= 32 && c < 127) {
      pass.push_back(static_cast<char>(c));
      std::cout << '*' << std::flush;
    }
  }
  std::cout << "\n";
  return pass;
}

static void npmStyleLoading(const char* label, int durationMs) {
  const char* frames[] = {".  ", ".. ", "..."};
  const auto start = GetTickCount64();
  int i = 0;
  while (GetTickCount64() - start < static_cast<ULONGLONG>(durationMs)) {
    std::cout << "\r  " << label << frames[i++ % 3] << std::flush;
    Sleep(220);
  }
  std::cout << "\r  " << label << "... ok          \n" << std::flush;
}

static bool runVirtuGuardGate() {
  AllocConsole();
  SetConsoleTitleW(L"VirtuGuard");
  SetConsoleOutputCP(CP_UTF8);
  SetConsoleCP(CP_UTF8);
  // Allow mouse/right-click paste & Ctrl shortcuts where the host supports them
  if (HANDLE hin = GetStdHandle(STD_INPUT_HANDLE); hin && hin != INVALID_HANDLE_VALUE) {
    DWORD mode = 0;
    if (GetConsoleMode(hin, &mode)) {
      mode |= ENABLE_EXTENDED_FLAGS | ENABLE_QUICK_EDIT_MODE | ENABLE_INSERT_MODE;
      SetConsoleMode(hin, mode);
    }
  }
  FILE* fout = nullptr;
  FILE* ferr = nullptr;
  FILE* fin = nullptr;
  freopen_s(&fout, "CONOUT$", "w", stdout);
  freopen_s(&ferr, "CONOUT$", "w", stderr);
  freopen_s(&fin, "CONIN$", "r", stdin);
  std::ios::sync_with_stdio(true);

  HWND console = GetConsoleWindow();
  if (console) {
    ShowWindow(console, SW_SHOW);
    SetForegroundWindow(console);
  }

  consolePrintHugeTitle();
  std::cout << "  Login: " << std::flush;
  const std::string login = readLineConsole();
  std::cout << "  Password (Ctrl+V paste): " << std::flush;
  const std::string password = readHiddenPassword();
  std::cout << "\n";

  if (login.empty() || password.empty()) {
    std::cout << "  Error: empty credentials\n";
    Sleep(2500);
    FreeConsole();
    return false;
  }

  std::ostringstream body;
  body << "{\"login\":\"";
  for (char c : login) {
    if (c == '"' || c == '\\') body << '\\';
    body << c;
  }
  body << "\",\"password\":\"";
  for (char c : password) {
    if (c == '"' || c == '\\') body << '\\';
    body << c;
  }
  body << "\"}";

  DWORD status = 0;
  std::string response, err;
  if (!httpJson(L"POST", API_HOST, API_PORT, API_SECURE, L"/api/login", L"", body.str(), status, response, err)) {
    std::cout << "  " << err << "\n";
    Sleep(3000);
    FreeConsole();
    return false;
  }
  if (status != 200) {
    const auto msg = jsonGetString(response, "error");
    std::cout << "  Login failed: " << (msg.empty() ? ("HTTP " + std::to_string(status)) : msg) << "\n";
    Sleep(3000);
    FreeConsole();
    return false;
  }

  const std::string token = jsonGetString(response, "token");
  const std::string username = jsonGetString(response, "username");
  if (token.empty()) {
    std::cout << "  Login failed: no token\n";
    Sleep(2500);
    FreeConsole();
    return false;
  }

  std::wstring auth = L"Authorization: Bearer " + utf8ToWide(token) + L"\r\n";
  DWORD pStatus = 0;
  std::string profile, perr;
  if (!httpJson(L"GET", API_HOST, API_PORT, API_SECURE, L"/api/profile", auth, "", pStatus, profile, perr)) {
    std::cout << "  " << perr << "\n";
    Sleep(3000);
    FreeConsole();
    return false;
  }
  if (pStatus != 200) {
    std::cout << "  Profile error HTTP " << pStatus << "\n";
    Sleep(2500);
    FreeConsole();
    return false;
  }

  const bool sub = jsonGetBool(profile, "subscriptionActive", false);
  const std::string role = jsonGetString(profile, "role");
  const bool privileged = (role == "owner" || role == "admin");
  if (!sub && !privileged) {
    HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
    SetConsoleTextAttribute(h, FOREGROUND_RED | FOREGROUND_INTENSITY);
    std::cout << "\n  Error 402 Подписки не найдено!\n\n";
    SetConsoleTextAttribute(h, FOREGROUND_RED | FOREGROUND_GREEN | FOREGROUND_BLUE);
    Sleep(3500);
    FreeConsole();
    return false;
  }

  std::cout << "  Welcome, " << (username.empty() ? login : username) << "\n\n";
  npmStyleLoading("Loading YAM prot", 2800);
  npmStyleLoading("Loading VirtuGuard", 2600);
  npmStyleLoading("Launcherng", 2200);
  std::cout << "\n";
  Sleep(400);

  FreeConsole();
  return true;
}

int WINAPI wWinMain(HINSTANCE hi, HINSTANCE, PWSTR, int) {
  if (runtimeHostile()) bailSilent();

  wchar_t appData[MAX_PATH];
  SHGetFolderPathW(nullptr, CSIDL_LOCAL_APPDATA, nullptr, 0, appData);
  auto base = fs::path(appData) / L"Punch";
  g_configPath = (base / L"loader.json").wstring();
  g_cachePath = (base / L"webview-cache").wstring();
  fs::create_directories(base);

  loadConfig();

  if (!runVirtuGuardGate()) {
    wipeClientBlob();
    return 1;
  }

  if (runtimeHostile()) bailSilent();

  // Force UI login + captcha after gate
  g_token.clear();

  WNDCLASSEXW wc{sizeof(wc)};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = hi;
  wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
  wc.lpszClassName = L"PunchLoaderWnd";
  RegisterClassExW(&wc);

  int sw = GetSystemMetrics(SM_CXSCREEN), sh = GetSystemMetrics(SM_CYSCREEN);
  g_hwnd = CreateWindowExW(WS_EX_LAYERED | WS_EX_APPWINDOW, L"PunchLoaderWnd", L"Punch",
                           WS_POPUP | WS_VISIBLE | WS_CLIPCHILDREN,
                           (sw - MAIN_W) / 2, (sh - MAIN_H) / 2, MAIN_W, MAIN_H, nullptr, nullptr, hi, nullptr);

  // Lock style: no thick frame / maximize
  LONG_PTR style = GetWindowLongPtrW(g_hwnd, GWL_STYLE);
  style &= ~(WS_THICKFRAME | WS_MAXIMIZEBOX | WS_SIZEBOX);
  SetWindowLongPtrW(g_hwnd, GWL_STYLE, style);

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

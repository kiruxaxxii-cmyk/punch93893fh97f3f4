@echo off
setlocal
cd /d "%~dp0"

if not exist deps\webview (
  echo Cloning webview library...
  git clone --depth 1 https://github.com/webview/webview.git deps\webview
)

if not exist build mkdir build
cd build

cmake .. -G "Visual Studio 17 2022" -A x64
if errorlevel 1 cmake .. -G "Ninja" -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release

echo.
echo Run: build\Release\punch-loader.exe
pause

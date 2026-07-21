@echo off
setlocal
cd /d "%~dp0.."

set MSBUILD=
for %%i in (
  "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
  "C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe"
  "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe"
) do if exist %%i set MSBUILD=%%~i

if "%MSBUILD%"=="" (
  echo MSBuild not found
  exit /b 1
)

"%MSBUILD%" "UIEngine\framework.sln" /p:Configuration=Release /p:Platform=x64 /m
if errorlevel 1 exit /b 1

set OUT=UIEngine\thirdparty\imgui\examples\example_win32_directx11\Release\example_win32_directx11.exe
if not exist "%OUT%" (
  echo Build failed — exe not found
  exit /b 1
)

if not exist "public\downloads" mkdir "public\downloads"
copy /Y "%OUT%" "public\downloads\punch-loader.exe"
if errorlevel 1 exit /b 1

node scripts\pack-loader.js
if errorlevel 1 exit /b 1

echo Built punch-loader.exe + DLLs + punch-loader.zip
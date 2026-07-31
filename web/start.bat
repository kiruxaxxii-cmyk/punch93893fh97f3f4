@echo off
title Polar DLC - Dev Server
cd /d "%~dp0"
echo Starting Polar DLC dev server...
echo Frontend: http://localhost:5173
echo.
npm run dev
pause

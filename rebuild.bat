@echo off
cd /d "%~dp0"
echo === Step 1: Fill subSubjects ===
node scripts/restore-and-fetch.cjs
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo === Step 2: Build archive HTML ===
node scripts/build-archive.js
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo Done. archive.html rebuilt.
pause

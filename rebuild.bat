@echo off
cd /d "%~dp0"
set FILL_MULTIPLE=%1
if "%FILL_MULTIPLE%"=="" set FILL_MULTIPLE=1
echo === Step 1: Fill subSubjects (--fill-multiple=%FILL_MULTIPLE%) ===
node scripts/restore-and-fetch.cjs --fill-multiple=%FILL_MULTIPLE%
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo === Step 2: Build archive HTML ===
node scripts/build-archive.js
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo Done. archive.html rebuilt.
pause

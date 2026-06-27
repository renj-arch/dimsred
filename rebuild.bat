@echo off
cd /d "%~dp0"
echo === Step 1: Generate questions from Wikipedia ===
node scripts/wiki-fill-all.cjs
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo === Step 2: Build archive HTML ===
node scripts/build-archive.js
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo === Step 3: Generate individual question pages + sitemap ===
node scripts/generate-pages.cjs
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo Done. archive.html + question pages + sitemap rebuilt.
pause

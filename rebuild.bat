@echo off
cd /d "%~dp0"
echo === Step 1: Generate questions from Wikipedia ===
node scripts/wiki-fill-all.cjs
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo === Step 2: Build single archive HTML + per-category data ===
node scripts/build-archive-single.js
if %errorlevel% neq 0 exit /b %errorlevel%
echo.
echo === Step 3: Commit and push ===
git config user.name "vlymbooq-bot"
git config user.email "bot@vlymbooq.qzz.io"
git add -A
git diff --staged --quiet
if %errorlevel% equ 0 (
    echo No new questions to commit
    goto :done
)
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set DT=%%d
git commit -m "Daily wiki fill %DT%"
if %errorlevel% equ 0 git push
echo Push complete.
:done
echo.
echo Done. archive.html + question pages + sitemap rebuilt.
pause

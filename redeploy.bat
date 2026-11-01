@echo off
git add -A
if %errorlevel% neq 0 exit /b %errorlevel%
git commit --allow-empty -m "redeploy"
if %errorlevel% neq 0 exit /b %errorlevel%
git pull --rebase
if %errorlevel% neq 0 exit /b %errorlevel%
git push
if %errorlevel% neq 0 exit /b %errorlevel%
echo Done.

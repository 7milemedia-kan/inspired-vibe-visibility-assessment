@echo off
cd /d "%~dp0"
if exist ".runtime\node.exe" (
  ".runtime\node.exe" --use-system-ca script\run.mjs development
) else (
  node script\run.mjs development
)
pause

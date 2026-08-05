@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-CrewLab.ps1"
echo.
if errorlevel 1 (
  echo Co dich vu chua khoi dong. Hay gui noi dung thu muc .crewlab\logs cho Codex.
) else (
  echo Tat ca dich vu da san sang.
)
pause

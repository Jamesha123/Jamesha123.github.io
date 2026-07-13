@echo off
cd /d "%~dp0.."
echo Exporting Tiled maps to Phaser JSON...
py scripts\export-map.py
if %ERRORLEVEL% NEQ 0 python scripts\export-map.py
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Export failed. Install Python from https://python.org then run this again.
  pause
  exit /b 1
)
echo.
echo Done. Hard refresh the browser to see changes.
pause

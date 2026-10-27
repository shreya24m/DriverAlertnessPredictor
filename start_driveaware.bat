@echo off
title DriveAware AI Launcher
echo ========================================================
echo        Starting DriveAware AI (Local Full-Stack)
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000...
start "DriveAware Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Frontend on http://localhost:3000...
start "DriveAware Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 3000"

timeout /t 4 /nobreak >nul

echo.
echo Opening browser to http://localhost:3000...
start http://localhost:3000

echo.
echo ========================================================
echo   DriveAware AI is now running!
echo   - Web Dashboard: http://localhost:3000
echo   - Backend Docs:  http://localhost:8000/docs
echo   - Close the two opened command windows to stop.
echo ========================================================
pause

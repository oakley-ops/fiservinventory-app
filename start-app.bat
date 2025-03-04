@echo off
echo Starting Fiserv Inventory Application...
echo.

:: Kill any existing Node.js processes
taskkill /F /IM node.exe >nul 2>&1

:: Start the backend server in a minimized window
echo Starting Backend Server (http://localhost:4000)...
start /min cmd /k "cd backend && npm start"

:: Wait for a moment to let backend initialize
timeout /t 8

:: Start the frontend server in a minimized window
echo Starting Frontend Server (http://localhost:3001)...
start /min cmd /k "cd frontend && npm start"

echo.
echo Navigate to http://localhost:3001 in your browser
echo.

:: Keep this window open
pause 
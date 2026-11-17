@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo    RT-DRMS: Real-Time Disaster Relief Request Management System
echo                  One-Click Browser-Based Launcher
echo ======================================================================
echo.

cd /d "%~dp0"

REM 1. Verify Node.js Runtime is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js (v14 or higher) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 2. Check for running instance to prevent duplicate servers
netstat -ano | findstr /R /C:":3000 *LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [NOTICE] An RT-DRMS server instance is already active on port 3000.
    echo Launching browser interface...
    start http://localhost:3000/
    echo.
    echo Existing server is running. Press any key to exit launcher...
    pause >nul
    exit /b 0
)

REM 3. Verify C++ backend executable exists, or build it
if not exist "%~dp0backend.exe" (
    echo [INFO] backend.exe not found. Compiling C++ backend via MinGW GCC...
    call "%~dp0backend\build.bat"
    if not exist "%~dp0backend.exe" (
        echo.
        echo [ERROR] Compilation failed. backend.exe was not created.
        echo Please ensure MinGW GCC is installed and accessible in PATH.
        echo.
        pause
        exit /b 1
    )
    echo [OK] backend.exe successfully compiled.
    echo.
) else (
    echo [OK] Verified backend.exe executable in project root.
)

REM 4. Ensure Management credentials are provided without hardcoding
if "%MGMT_USERNAME%"=="" (
    echo [AUTHENTICATION] Management credentials not detected in environment.
    set /p "MGMT_USERNAME=Enter Management Username: "
)
if "%MGMT_PASSWORD%"=="" (
    set /p "MGMT_PASSWORD=Enter Management Password: "
)

if "%MGMT_USERNAME%"=="" (
    echo [ERROR] Management Username cannot be empty.
    pause
    exit /b 1
)
if "%MGMT_PASSWORD%"=="" (
    echo [ERROR] Management Password cannot be empty.
    pause
    exit /b 1
)

REM Export environment variables for child processes
set "MGMT_USERNAME=%MGMT_USERNAME%"
set "MGMT_PASSWORD=%MGMT_PASSWORD%"

echo.
echo ======================================================================
echo   Launching RT-DRMS Server and opening Web Interface...
echo   URL: http://localhost:3000/
echo   Press Ctrl+C in this terminal window to stop the server.
echo ======================================================================
echo.

REM 5. Open the default browser to the web interface
start http://localhost:3000/

REM 6. Start the Node.js server (persistent C++ engine is spawned automatically)
node server.js

endlocal

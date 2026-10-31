@echo off
setlocal
echo ========================================================
echo   Compiling RT-DRMS Backend [MinGW GCC]
echo ========================================================

REM Ensure MinGW compiler path is in PATH
if exist "D:\MinGW\bin" set "PATH=D:\MinGW\bin;%PATH%"
if exist "C:\MinGW\bin" set "PATH=C:\MinGW\bin;%PATH%"

REM Switch to the directory where this batch file is located
cd /d "%~dp0"

REM Compile main.cpp and DSA implementations with -std=c++11 and -Iinclude
echo Running: g++ -std=c++11 -Wall -Iinclude src\main.cpp src\datastructures\LinkedList.cpp src\datastructures\Stack.cpp src\datastructures\Queue.cpp src\datastructures\PriorityQueue.cpp src\datastructures\Graph.cpp src\datastructures\HashTable.cpp src\utils\Algorithms.cpp -o ..\backend.exe
g++ -std=c++11 -Wall -Iinclude src\main.cpp src\datastructures\LinkedList.cpp src\datastructures\Stack.cpp src\datastructures\Queue.cpp src\datastructures\PriorityQueue.cpp src\datastructures\Graph.cpp src\datastructures\HashTable.cpp src\utils\Algorithms.cpp -o ..\backend.exe

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   BUILD SUCCESSFUL!
    echo   Generated executable: backend.exe in project root
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   BUILD FAILED! Please check compiler errors above.
    echo ========================================================
    exit /b %ERRORLEVEL%
)

endlocal

@echo off
setlocal
echo ===================================================
echo     PAN CHECKER PRO - AUTO INSTALLER
echo ===================================================
echo.

:: 1. Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python not found. Downloading and installing now...
    curl -o python_installer.exe https://www.python.org/ftp/python/3.11.5/python-3.11.5-amd64.exe
    start /wait python_installer.exe /quiet InstallAllUsers=1 PrependPath=1
    del python_installer.exe
    echo [+] Python installed successfully. Please restart this script.
    pause
    exit
)

echo [+] Python is already installed.
echo.

:: 2. Install all required packages
echo [2] Installing software dependencies...
pip install -r requirements.txt --quiet
echo [+] Dependencies ready.
echo.

:: 3. Build the Software
echo [3] Building your Pro PAN Checker...
python build_exe.py
echo.

echo ===================================================
echo   SUCCESS! Your software is ready in 'dist/PanCheck.exe'
echo ===================================================
pause

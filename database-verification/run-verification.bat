@echo off
echo ========================================
echo Supabase Data Verification Tool
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create a .env file with your Supabase credentials:
    echo SUPABASE_URL=your_supabase_url
    echo SUPABASE_ANON_KEY=your_supabase_anon_key
    echo.
    pause
    exit /b 1
)

REM Check if requirements are installed
pip show supabase >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    pip install -r requirements.txt
    echo.
)

REM Run the verification
echo Starting verification...
echo.
python verify_supabase_data.py %*

REM Check exit code
if errorlevel 1 (
    echo.
    echo ========================================
    echo VERIFICATION FAILED - Issues detected!
    echo ========================================
    echo.
    echo To fix the issues:
    echo 1. Review the report above
    echo 2. Run SQL correction scripts in Supabase
    echo 3. Run this verification again
    echo.
) else (
    echo.
    echo ========================================
    echo VERIFICATION PASSED - All checks OK!
    echo ========================================
    echo.
)

pause
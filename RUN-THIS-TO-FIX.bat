@echo off
cls
echo ============================================
echo RUNNING POWERFUL FIX
echo ============================================
echo.
echo This will forcefully kill all Node processes
echo and start a clean server on port 3002
echo.
pause

powershell -ExecutionPolicy Bypass -File "D:\PROShael\FORCE-FIX.ps1"

pause
@echo off
echo Removing all merge conflict markers from the project...
echo.

cd alshuail-admin-arabic\src

echo Cleaning CSS files...
for /r %%f in (*.css) do (
    powershell -Command "(Get-Content '%%f') | Where-Object {$_ -notmatch '<<<<<<< HEAD|=======|>>>>>>> [a-f0-9]+'} | Set-Content '%%f'"
    echo Cleaned: %%~nxf
)

echo.
echo Cleaning JavaScript files...
for /r %%f in (*.js *.jsx) do (
    powershell -Command "(Get-Content '%%f') | Where-Object {$_ -notmatch '<<<<<<< HEAD|=======|>>>>>>> [a-f0-9]+'} | Set-Content '%%f'"
    echo Cleaned: %%~nxf
)

echo.
echo Cleaning TypeScript files...
for /r %%f in (*.ts *.tsx) do (
    powershell -Command "(Get-Content '%%f') | Where-Object {$_ -notmatch '<<<<<<< HEAD|=======|>>>>>>> [a-f0-9]+'} | Set-Content '%%f'"
    echo Cleaned: %%~nxf
)

cd ..\..

echo.
echo ========================================
echo All merge conflict markers removed!
echo Please restart the development server.
echo ========================================
pause
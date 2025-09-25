@echo off
echo Deep cleaning all merge conflict markers...
echo.

cd alshuail-admin-arabic\src

echo Cleaning all source files...
powershell -Command "Get-ChildItem -Recurse -Include '*.js','*.jsx','*.ts','*.tsx','*.css','*.html' | ForEach-Object { $content = Get-Content $_.FullName -Raw; $cleaned = $content -replace '<<<<<<< HEAD[\s\S]*?>>>>>>>[^\r\n]*', ''; $cleaned = $cleaned -replace '<<<<<<< HEAD', ''; $cleaned = $cleaned -replace '=======', ''; $cleaned = $cleaned -replace '>>>>>>> [a-f0-9]+', ''; Set-Content -Path $_.FullName -Value $cleaned -NoNewline; Write-Host ('Cleaned: ' + $_.Name) }"

cd ..\public
echo.
echo Cleaning public files...
powershell -Command "Get-ChildItem -Include '*.html','*.js','*.css' | ForEach-Object { $content = Get-Content $_.FullName -Raw; $cleaned = $content -replace '<<<<<<< HEAD[\s\S]*?>>>>>>>[^\r\n]*', ''; $cleaned = $cleaned -replace '<<<<<<< HEAD', ''; $cleaned = $cleaned -replace '=======', ''; $cleaned = $cleaned -replace '>>>>>>> [a-f0-9]+', ''; Set-Content -Path $_.FullName -Value $cleaned -NoNewline; Write-Host ('Cleaned: ' + $_.Name) }"

cd ..\..

echo.
echo ========================================
echo Deep clean completed!
echo ========================================
pause
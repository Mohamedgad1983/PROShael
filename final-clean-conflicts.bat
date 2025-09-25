@echo off
echo Final aggressive cleaning of all merge conflict markers...
echo.

cd alshuail-admin-arabic

echo Removing ALL conflict markers from ALL files...
powershell -Command "Get-ChildItem -Recurse -File | Where-Object { $_.Extension -match '\.(js|jsx|ts|tsx|css|html|json)$' } | ForEach-Object { $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue; if ($content) { $cleaned = $content -replace '<<<<<<< HEAD.*', '' -replace '=======.*', '' -replace '>>>>>>> [a-f0-9]+.*', ''; if ($cleaned -ne $content) { Set-Content -Path $_.FullName -Value $cleaned -NoNewline; Write-Host ('Cleaned: ' + $_.Name) } } }"

cd ..

echo.
echo ========================================
echo Final clean completed!
echo Restarting server...
echo ========================================
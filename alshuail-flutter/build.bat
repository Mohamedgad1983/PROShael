@echo off
REM ═══════════════════════════════════════════════════════
REM 🚀 Al-Shuail Flutter Build Script
REM ═══════════════════════════════════════════════════════

echo.
echo ========================================
echo    صندوق الشعيل - Flutter Build
echo ========================================
echo.

REM Check Flutter
echo [1/6] Checking Flutter installation...
flutter --version
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Flutter not found! Please install Flutter first.
    pause
    exit /b 1
)
echo ✅ Flutter found
echo.

REM Clean
echo [2/6] Cleaning project...
flutter clean
echo ✅ Clean completed
echo.

REM Get dependencies
echo [3/6] Getting dependencies...
flutter pub get
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to get dependencies!
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Build options
echo.
echo Select build type:
echo [1] Debug APK (for testing)
echo [2] Release APK (for distribution)
echo [3] Release AAB (for Google Play)
echo [4] All Android builds
echo [5] Web build
echo [6] Exit
echo.
set /p choice="Enter choice (1-6): "

if "%choice%"=="1" goto debug_apk
if "%choice%"=="2" goto release_apk
if "%choice%"=="3" goto release_aab
if "%choice%"=="4" goto all_android
if "%choice%"=="5" goto web_build
if "%choice%"=="6" goto end

:debug_apk
echo.
echo [4/6] Building Debug APK...
flutter build apk --debug
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo.
echo ✅ Debug APK built successfully!
echo 📁 Location: build\app\outputs\flutter-apk\app-debug.apk
goto end

:release_apk
echo.
echo [4/6] Building Release APK...
echo ⚠️  Make sure key.properties is configured!
flutter build apk --release
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed! Check key.properties configuration.
    pause
    exit /b 1
)
echo.
echo ✅ Release APK built successfully!
echo 📁 Location: build\app\outputs\flutter-apk\app-release.apk
goto end

:release_aab
echo.
echo [4/6] Building Release App Bundle (AAB)...
echo ⚠️  Make sure key.properties is configured!
flutter build appbundle --release
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed! Check key.properties configuration.
    pause
    exit /b 1
)
echo.
echo ✅ Release AAB built successfully!
echo 📁 Location: build\app\outputs\bundle\release\app-release.aab
echo.
echo 📤 Upload this file to Google Play Console
goto end

:all_android
echo.
echo [4/6] Building all Android versions...
echo.
echo Building Debug APK...
flutter build apk --debug
echo Building Release APK...
flutter build apk --release
echo Building Release AAB...
flutter build appbundle --release
echo.
echo ✅ All builds completed!
echo.
echo 📁 Outputs:
echo    - Debug APK: build\app\outputs\flutter-apk\app-debug.apk
echo    - Release APK: build\app\outputs\flutter-apk\app-release.apk
echo    - Release AAB: build\app\outputs\bundle\release\app-release.aab
goto end

:web_build
echo.
echo [4/6] Building Web version...
flutter build web --release
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo.
echo ✅ Web build completed!
echo 📁 Location: build\web
goto end

:end
echo.
echo ========================================
echo           Build Complete!
echo ========================================
echo.
pause

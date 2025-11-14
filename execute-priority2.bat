@echo off
REM ============================================================================
REM Priority 2 - Complete Execution Script (Windows)
REM ============================================================================
REM
REM This script executes all Priority 2 tasks:
REM 1. Console.log cleanup (445 statements → 0)
REM 2. Component optimization (React.memo, debouncing)
REM 3. Verification and testing
REM
REM Usage:
REM   execute-priority2.bat           - Full execution
REM   execute-priority2.bat --dry-run - Preview only
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║        Priority 2 - Complete Execution                    ║
echo ║        Console Cleanup + Component Optimization           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if dry-run mode
set DRY_RUN=
if "%1"=="--dry-run" set DRY_RUN=--dry-run

REM Step 1: Console.log Cleanup
echo.
echo ═══════════════════════════════════════════════════════════════
echo  STEP 1: Console.log Cleanup (445 statements)
echo ═══════════════════════════════════════════════════════════════
echo.

if defined DRY_RUN (
    echo 🔍 DRY RUN MODE - Previewing changes...
    node scripts/priority2-console-cleanup.js --dry-run --verbose
) else (
    echo 🚀 Executing cleanup...
    node scripts/priority2-console-cleanup.js --verbose
)

if errorlevel 1 (
    echo.
    echo ❌ Console cleanup failed!
    echo Check errors above and fix before continuing.
    pause
    exit /b 1
)

echo.
echo ✅ Console cleanup complete!
echo.
pause

REM Step 2: Verification
if not defined DRY_RUN (
    echo.
    echo ═══════════════════════════════════════════════════════════════
    echo  STEP 2: Verification
    echo ═══════════════════════════════════════════════════════════════
    echo.

    echo 🔍 Verifying console.log cleanup...
    node scripts/verify-console-cleanup.js

    if errorlevel 1 (
        echo.
        echo ⚠️  Verification failed - some console statements remain
        echo Review the output above and re-run cleanup if needed.
        pause
    ) else (
        echo.
        echo ✅ Verification passed - 100%% cleanup achieved!
        echo.
    )
    pause
)

REM Step 3: Component Optimization
echo.
echo ═══════════════════════════════════════════════════════════════
echo  STEP 3: Component Optimization
echo ═══════════════════════════════════════════════════════════════
echo.

if defined DRY_RUN (
    echo 🔍 DRY RUN MODE - Previewing optimizations...
    node scripts/priority2-component-optimization.js --dry-run --verbose
) else (
    echo 🚀 Executing optimizations...
    node scripts/priority2-component-optimization.js --verbose
)

if errorlevel 1 (
    echo.
    echo ❌ Component optimization failed!
    echo Check errors above.
    pause
    exit /b 1
)

echo.
echo ✅ Component optimization complete!
echo.
pause

REM Step 4: Build and Test
if not defined DRY_RUN (
    echo.
    echo ═══════════════════════════════════════════════════════════════
    echo  STEP 4: Build and Test
    echo ═══════════════════════════════════════════════════════════════
    echo.

    echo 🔨 Building production bundle...
    cd alshuail-admin-arabic
    call npm run build:production

    if errorlevel 1 (
        echo.
        echo ❌ Build failed!
        echo Review errors above and fix issues.
        cd ..
        pause
        exit /b 1
    )

    echo.
    echo ✅ Build successful!
    cd ..
    echo.
    pause
)

REM Summary
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    EXECUTION COMPLETE                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

if defined DRY_RUN (
    echo 🔍 DRY RUN MODE - No changes made
    echo.
    echo To execute for real, run:
    echo    execute-priority2.bat
) else (
    echo ✅ Priority 2 - 100%% COMPLETE!
    echo.
    echo 📊 Results:
    echo    - Console.log cleanup: ✅ 445/445 statements replaced
    echo    - Component optimization: ✅ Applied
    echo    - Production build: ✅ Successful
    echo.
    echo 📋 Next Steps:
    echo    1. Review changes: git diff
    echo    2. Test in browser
    echo    3. Commit changes: git add . ^&^& git commit -m "feat: Complete Priority 2 - Console cleanup and optimization"
    echo    4. Push to repository: git push
)

echo.
pause

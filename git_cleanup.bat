@echo off
title Git Hygiene Cleanup - Brain Stormers Attendance
echo ===================================================
echo   Git Hygiene Cleanup: Untracking node_modules
echo ===================================================
echo.

set "GIT_CMD=git"

:: 1. Check if git is already in the current terminal PATH
where git >nul 2>nul
if %errorlevel% equ 0 (
    set "GIT_CMD=git"
    goto :git_found
)

:: 2. Check common Windows installation paths for Git
if exist "%ProgramFiles%\Git\cmd\git.exe" (
    set "GIT_CMD="%ProgramFiles%\Git\cmd\git.exe""
    goto :git_found
)
if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" (
    set "GIT_CMD="%ProgramFiles(x86)%\Git\cmd\git.exe""
    goto :git_found
)
if exist "%LocalAppData%\Programs\Git\cmd\git.exe" (
    set "GIT_CMD="%LocalAppData%\Programs\Git\cmd\git.exe""
    goto :git_found
)
if exist "%USERPROFILE%\AppData\Local\Programs\Git\cmd\git.exe" (
    set "GIT_CMD="%USERPROFILE%\AppData\Local\Programs\Git\cmd\git.exe""
    goto :git_found
)
if exist "C:\Program Files\Git\bin\git.exe" (
    set "GIT_CMD="C:\Program Files\Git\bin\git.exe""
    goto :git_found
)

:: Git not found anywhere
echo [ERROR] Git could not be found in your PATH or in common installation directories.
echo.
echo Please ensure Git is installed on your computer.
echo If it is installed, you can try running this script inside the "Git Bash" terminal 
echo that comes with your Git installation.
echo.
pause
exit /b

:git_found
echo [SUCCESS] Found Git command at: %GIT_CMD%
echo.

echo [1/5] Removing node_modules and build artifacts from Git tracking...
echo (This will NOT delete files from your local disk)
%GIT_CMD% rm -r --cached --ignore-unmatch node_modules dist .vite .env .turbo *.log
if %errorlevel% neq 0 (
    echo [WARNING] Some files could not be untracked or were already untracked.
)
echo.

echo [2/5] Creating commit...
%GIT_CMD% commit -m "chore: untrack node_modules and build/cache artifacts"
if %errorlevel% neq 0 (
    echo [INFO] Nothing to commit or commit failed.
)
echo.

echo [3/5] Pushing changes to remote repository...
%GIT_CMD% push
if %errorlevel% neq 0 (
    echo [WARNING] Git push failed. You may need to push manually later.
)
echo.

echo [4/5] Shrinking repository size (running garbage collection)...
echo (This may take a moment)
%GIT_CMD% gc --prune=now
echo.

echo [5/5] Current repository size status:
%GIT_CMD% count-objects -vH
echo.

echo ===================================================
echo   Cleanup completed successfully!
echo   This script will now self-delete.
echo ===================================================
pause

:: Self-delete trick
(goto) 2>nul & del "%~f0"

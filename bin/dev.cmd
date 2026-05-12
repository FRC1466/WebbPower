@echo off
REM Windows wrapper for bin/dev.ps1.
REM Lets you run `bin\dev` from cmd or PowerShell without execution-policy fiddling.
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0dev.ps1" %*

@echo off

REM === Start Backend (in /server) ===
start cmd /k "cd /d %~dp0server && npm run dev"

REM === Open default browser at localhost:5000 ===
start chrome http://localhost:5000

exit
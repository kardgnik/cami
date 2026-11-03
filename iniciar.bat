@echo off
rem Duplo clique para rodar. Detalhes em scripts\windows\iniciar.ps1
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\iniciar.ps1"

@echo off
rem Duplo clique para rodar. Detalhes em scripts\windows\instalar.ps1
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\instalar.ps1"

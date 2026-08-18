@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo Doble PP Company Admin - vista previa
echo ==========================================
echo.

if not exist node_modules (
  echo Instalando dependencias...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

echo Generando build...
call npm.cmd run build
if errorlevel 1 goto :fail

echo Iniciando vista previa...
echo Abre: http://localhost:4173/login
echo.
call npm.cmd run preview:host
if errorlevel 1 goto :fail
goto :eof

:fail
echo.
echo No se pudo iniciar la vista previa.
echo Revisa los mensajes anteriores.
pause
exit /b 1

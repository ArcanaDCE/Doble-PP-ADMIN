@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo Doble PP Company Admin - modo desarrollo
echo ==========================================
echo.

if not exist node_modules (
  echo Instalando dependencias...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

echo Iniciando servidor local...
echo Abre: http://localhost:4173/login
echo.
call npm.cmd run dev:host
if errorlevel 1 goto :fail
goto :eof

:fail
echo.
echo No se pudo iniciar la aplicacion.
echo Verifica que Node.js este instalado correctamente.
pause
exit /b 1

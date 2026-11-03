@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 24 LTS desde https://nodejs.org/en/download
  echo Despues vuelve a abrir este archivo.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo No se encontro npm. Reinstala Node.js incluyendo npm.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Instalando dependencias. Se necesita conexion a internet...
  call npm.cmd ci
  if errorlevel 1 (
    echo No se pudo completar la instalacion. Revisa el error anterior.
    pause
    exit /b 1
  )
)
echo Abre en tu navegador la direccion que aparezca a continuacion.
echo Para detener el sitio, presiona Ctrl+C.
call npm.cmd run dev -- --host 127.0.0.1
pause

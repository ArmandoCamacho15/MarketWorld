@echo off
setlocal EnableExtensions
title MarketWorld Launcher
color 0B

set "ROOT=%~dp0"
cd /d "%ROOT%"

if /I "%~1"=="auto" goto INICIAR
if /I "%~1"=="manual" goto MANUAL

:MENU
cls
echo ============================================================
echo   BIENVENIDO A MARKETWORLD - GESTOR DE SERVIDORES
echo ============================================================
echo.
echo Selecciona una opcion:
echo.
echo   [1] Iniciar Proyecto Automaticamente (Recomendado)
echo   [2] Ver Instrucciones para Inicio Manual en Terminal
echo   [3] Salir
echo.
choice /c 123 /n /m "Elige una opcion (1-3): "

if errorlevel 3 goto SALIR
if errorlevel 2 goto MANUAL
if errorlevel 1 goto INICIAR
goto MENU

:INICIAR
cls
echo ============================================================
echo   INICIANDO SERVIDORES
echo ============================================================
echo.

set "BACKEND_DIR=%ROOT%backend\marketworld-api"
if not exist "%BACKEND_DIR%\artisan" goto ERR_ARTISAN

call :RESOLVER_PHP
if errorlevel 1 goto ERR_PHP

echo [OK] PHP detectado: "%PHP_EXE%"
echo.

call :CHECK_PORT 8000
if "%PORT_BUSY%"=="1" echo [WARN] El puerto 8000 ya esta en uso.
if "%PORT_BUSY%"=="1" echo        Si ya tienes la API corriendo, puedes continuar.

call :CHECK_PORT 5500
if "%PORT_BUSY%"=="1" echo [WARN] El puerto 5500 ya esta en uso.
if "%PORT_BUSY%"=="1" echo        Si ya tienes el frontend corriendo, puedes continuar.

echo.
echo [STEP 1] Iniciando Backend Laravel en 127.0.0.1:8000...
call :CHECK_PORT 8000
if "%PORT_BUSY%"=="1" goto AFTER_API_BOOT
set "API_BOOT=%TEMP%\marketworld_api_boot.cmd"
> "%API_BOOT%" echo @echo off
>> "%API_BOOT%" echo cd /d "%BACKEND_DIR%"
>> "%API_BOOT%" echo "%PHP_EXE%" artisan optimize:clear
>> "%API_BOOT%" echo "%PHP_EXE%" artisan serve --host=127.0.0.1 --port=8000
start "MarketWorld API" cmd /k call "%API_BOOT%"
goto AFTER_API_BOOT_DONE

:AFTER_API_BOOT
echo [INFO] Se omite arranque de API porque el puerto 8000 ya esta ocupado.

:AFTER_API_BOOT_DONE

timeout.exe /t 3 /nobreak > nul

echo [STEP 2] Iniciando Frontend en 127.0.0.1:5500...
call :CHECK_PORT 5500
if "%PORT_BUSY%"=="1" goto AFTER_WEB_BOOT
set "WEB_BOOT=%TEMP%\marketworld_web_boot.cmd"
> "%WEB_BOOT%" echo @echo off
>> "%WEB_BOOT%" echo cd /d "%ROOT%"
>> "%WEB_BOOT%" echo "%PHP_EXE%" -S 127.0.0.1:5500
start "MarketWorld Frontend" cmd /k call "%WEB_BOOT%"
goto AFTER_WEB_BOOT_DONE

:AFTER_WEB_BOOT
echo [INFO] Se omite arranque de Frontend porque el puerto 5500 ya esta ocupado.

:AFTER_WEB_BOOT_DONE

echo.
echo ============================================================
echo   PROCESO COMPLETADO
echo   --------------------------------------------------------
echo   API HEALTH: http://127.0.0.1:8000/api/health
echo   APP WEB:    http://127.0.0.1:5500/html/Login.html
echo   --------------------------------------------------------
echo   Nota cronograma: mantener mismo host 127.0.0.1 evita
echo   errores CSRF mismatch en autenticacion Sanctum por cookie.
echo ============================================================

start "" "http://127.0.0.1:5500/html/Login.html"
echo.
if /I "%~1"=="auto" goto SALIR
pause
goto MENU

:ERR_ARTISAN
echo [ERROR] No se encontro backend\marketworld-api\artisan.
echo         Ejecuta este launcher desde la raiz del proyecto.
echo.
if /I "%~1"=="auto" goto SALIR
pause
goto MENU

:ERR_PHP
if /I "%~1"=="auto" goto SALIR
pause
goto MENU

:MANUAL
cls
echo ============================================================
echo   INSTRUCCIONES PARA INICIO MANUAL POR TERMINAL
echo ============================================================
echo.
echo Si prefieres correr todo manualmente, abre DOS terminales:
echo.
echo TERMINAL 1 (API Backend):
echo --------------------------------------------------------
echo 1. cd backend\marketworld-api
echo 2. php artisan optimize:clear
echo 3. php artisan serve --host=127.0.0.1 --port=8000
echo.
echo TERMINAL 2 (Frontend Visual):
echo --------------------------------------------------------
echo 1. Ve a la raiz del proyecto
echo 2. php -S 127.0.0.1:5500
echo.
echo IMPORTANTE (cronograma seguridad/auth):
echo - Usa 127.0.0.1 tanto en frontend como en backend.
echo - Evita mezclar localhost y 127.0.0.1 para prevenir CSRF mismatch.
echo.
echo URL de acceso:
echo -^> http://127.0.0.1:5500/html/Login.html
echo.
echo ============================================================
echo.
pause
if /I "%~1"=="manual" goto SALIR
goto MENU

:RESOLVER_PHP
set "PHP_EXE="

for /f "delims=" %%I in ('where php.exe 2^>nul') do (
    if not defined PHP_EXE set "PHP_EXE=%%I"
)

if defined PHP_EXE goto PHP_CHECK
for /f "delims=" %%I in ('where php 2^>nul') do (
    if not defined PHP_EXE set "PHP_EXE=%%I"
)

:PHP_CHECK

if defined PHP_EXE (
    "%PHP_EXE%" -v >nul 2>nul
    if errorlevel 1 set "PHP_EXE="
)

if not defined PHP_EXE if exist "C:\xampp\php\php.exe" set "PHP_EXE=C:\xampp\php\php.exe"
if not defined PHP_EXE if exist "C:\laragon\bin\php\php.exe" set "PHP_EXE=C:\laragon\bin\php\php.exe"
if not defined PHP_EXE if exist "%ProgramFiles%\php\php.exe" set "PHP_EXE=%ProgramFiles%\php\php.exe"
set "PF86=%ProgramFiles(x86)%"
if not defined PHP_EXE if exist "%PF86%\php\php.exe" set "PHP_EXE=%PF86%\php\php.exe"

if defined PHP_EXE exit /b 0
echo [ERROR] No se encontro un ejecutable valido de PHP.
echo.
echo Opciones para resolver:
echo 1. Instalar PHP y agregarlo al PATH del sistema.
echo 2. Instalar XAMPP/Laragon y volver a ejecutar este launcher.
echo 3. Definir manualmente la ruta de PHP en este .bat (variable PHP_EXE).
echo.
exit /b 1

:CHECK_PORT
set "PORT_BUSY=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do set "PORT_BUSY=1"
exit /b 0

:SALIR
endlocal
exit /b 0

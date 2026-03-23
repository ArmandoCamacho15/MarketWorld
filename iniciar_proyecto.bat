@echo off
title MarketWorld Launcher
color 0B

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
set /p opcion="Elige una opcion (1-3): "

if "%opcion%"=="1" goto INICIAR
if "%opcion%"=="2" goto MANUAL
if "%opcion%"=="3" goto SALIR
goto MENU

:INICIAR
cls
echo ============================================================
echo   INICIANDO SERVIDORES
echo ============================================================
echo.

:: Verificar si PHP está instalado
where php >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encuentra PHP en el sistema. Por favor instalalo.
    pause
    exit /b
)

:: 1. Iniciar Backend (Laravel)
echo [STEP 1] Iniciando Backend Laravel en el puerto 8000...
start "MarketWorld API" cmd /k "cd backend\marketworld-api && php artisan serve --port=8000"

:: Pequeña espera para asegurar que el puerto 8000 responda
timeout /t 3 /nobreak > nul

:: 2. Iniciar Frontend (PHP Server)
echo [STEP 2] Iniciando Frontend en el puerto 5500...
start "MarketWorld Frontend" cmd /k "php -S 127.0.0.1:5500"

echo.
echo ============================================================
echo   PROCESO COMPLETADO
echo   --------------------------------------------------------
echo   API: http://127.0.0.1:8000/api/health
echo   APP WEB:  http://127.0.0.1:5500/html/Login.html
echo   --------------------------------------------------------
echo   Abriendo APP WEB en el navegador...
echo   Deja estas ventanas de fondo abiertas mientras trabajas.
echo ============================================================
start http://127.0.0.1:5500/html/Login.html
echo.
pause
goto MENU

:MANUAL
cls
echo ============================================================
echo   INSTRUCCIONES PARA INICIO MANUAL POR TERMINAL
echo ============================================================
echo.
echo Si prefieres correr todo manualmente, necesitas abrir DOS 
echo ventanas de terminal distintas (vea CMD o PowerShell):
echo.
echo TERMINAL 1 (API Backend):
echo --------------------------------------------------------
echo 1. Abre una terminal nueva en Visual Studio Code.
echo 2. Escribe el comando: cd backend\marketworld-api
echo 3. Luego escribe: php artisan serve --port=8000
echo.
echo TERMINAL 2 (Frontend Visual):
echo --------------------------------------------------------
echo 1. Abre OTRA terminal nueva.
echo 2. Asegurate de estar en la raiz principal del proyecto.
echo 3. Escribe: php -S 127.0.0.1:5500
echo.
echo NOTA: En la terminal de PowerShell moderna, el comando "&&"
echo a veces falla. Por eso, es mejor escribir los comandos uno
echo por vez y pulsar [Enter] en lugar de intentar mezclarlos.
echo.
echo Una vez que ambas terminales esten corriendo sin errores,
echo ve a tu navegador y pega esta direccion manualmente:
echo.
echo -^> http://127.0.0.1:5500/html/Login.html
echo.
echo ============================================================
echo.
pause
goto MENU

:SALIR
exit

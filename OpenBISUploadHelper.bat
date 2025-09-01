@echo off
set "VENV_DIR=%~dp0 .venv"
set

REM Check if venv env exists
if exist "%VENV_DIR%\Scripts\activate.bat" (
    call "%VENV_DIR%\Scripts\activate.bat"
) else (
    echo
    REM activate conda env
    call conda activate "%VENV_DIR%"
)

REM Start Server
python openbis_upload_helper/manage.py runserver

@echo on
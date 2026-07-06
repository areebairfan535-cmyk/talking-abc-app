@echo off
REM ============================================================
REM  Talking ABC - open Windows Firewall for the PHP backend
REM  Right-click this file  ->  "Run as administrator"
REM ============================================================

echo Removing any old/blocking rules...
netsh advfirewall firewall delete rule name="Talking ABC Backend 5000" >nul 2>&1
netsh advfirewall firewall delete rule name="Talking ABC PHP" >nul 2>&1

echo Adding inbound ALLOW rule for TCP port 5000...
netsh advfirewall firewall add rule name="Talking ABC Backend 5000" dir=in action=allow protocol=TCP localport=5000 profile=any

echo Adding inbound ALLOW rule for php.exe...
netsh advfirewall firewall add rule name="Talking ABC PHP" dir=in action=allow program="C:\Users\Mr Shahram\Downloads\Php\php-8.5.6-Win32-vs17-x64\php.exe" enable=yes profile=any

echo.
echo ============================================================
echo  DONE. Firewall now allows the phone to reach port 5000.
echo  You can close this window.
echo ============================================================
pause

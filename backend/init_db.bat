@echo off
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p%1 < "d:\新建文件夹\小程序\backend\init.sql"
echo Database initialized successfully!
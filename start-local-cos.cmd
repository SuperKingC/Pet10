@echo off
rem 本地素材服务：模拟 COS（衣柜/塔罗素材走 http://127.0.0.1:8787）
rem 双击运行后保持窗口开着；小程序开发者工具点「编译」即可加载最新素材
chcp 65001 >nul
cd /d %~dp0
echo.
echo  本地素材服务启动中：http://127.0.0.1:8787  （端口被占用说明已在跑，直接用）
echo  测试完成后关闭本窗口即可停止服务
echo.
npx http-server public -p 8787

/*
 * 移动项目文件夹
 *  1. 删除node_modules
 *  2. 删除package.json
 *  3. 删除package-lock.json
 *  4. 删除.idea
 *  5. npm init -y
 *  6. 关闭代理
 *  7. npm i cnpm
 *  8. cnpm i -D electron@latest（必须在CMD中执行）
 *  9. 在package.json中修改scripts为"start": "electron ."
 *  官方安装命令：npm install electron --save-dev
 */
console.log("Starting main process.");

//导入设置
const configs = require("./config.js");

//导入 Electron 主模块
const electron = require("electron");

//导入node的路径和子进程模块
const path = require("path");
const childProcess = require("child_process");

//提取对象
const app = electron.app;
const window = electron.BrowserWindow;
const dialog = electron.dialog;
const ipc = electron.ipcMain;

console.log("Modules imported.");

//当前窗口对象
let win = null;

//子进程对象变量
let rendererProcess = null;

//启动子进程
function startRenderer(event, executablePath) {
    //已在运行则直接返回成功
    if (rendererProcess != null && !rendererProcess.killed) {
        return Promise.resolve(true);
    }

    /*
     * 启动可执行文件作为子进程
     * 第二个参数：数组，传递给可执行程序的命令行参数
     * 第三个参数：对象，stdio: 表示配置三个标准流
     *
     * 无论进程启动是否成功，rendererProcess都会得到对象，必须通过监听事件判断
     */
    return new Promise((resolve, reject) => {
        try {
            console.log("Starting child process, executablePath =", executablePath);

            //启动可执行文件作为子进程
            rendererProcess = childProcess.spawn(executablePath, [], {
                stdio: ["pipe", "pipe", "pipe"],
            });

            //使用 once，只在进程成功启动时触发一次
            rendererProcess.once("spawn", () => {
                resolve(true);
            });

            rendererProcess.once("exit", (code, signal) => {
                console.log(`Child process exited: code = ${code}, signal = ${signal}`);
                rendererProcess = null;
            });

            //需要多次监听，不能使用 once
            rendererProcess.on("error", (err) => {
                console.log("Failed to start child process:", err);
                rendererProcess = null;
                reject(err);
            });

            rendererProcess.stdout.on("data", (data) => {
                //禁用console.log的自动添加空格
                console.log(["Renderer output:\n", data.toString()].join(""));
            });

            rendererProcess.stderr.on("data", (data) => {
                console.error(["Renderer error:\n", data.toString()].join(""));
            });
        } catch (e) {
            reject(e);
        }
    });
}

//强制停止子进程
function stopRenderer() {
    if (rendererProcess == null) return;
    console.log("Stopping child process...");

    try {
        if (rendererProcess.stdin != null && !rendererProcess.stdin.destroyed) {
            rendererProcess.stdin.end();
        }
        rendererProcess.kill();
    } catch (e) {
        console.error("Error while killing child process:", e);
    } finally {
        rendererProcess = null;
    }
}

//向渲染器（子进程）发送命令
function sendCommand(event, command) {
    console.log("Sending command to child process:", command);

    if (rendererProcess != null && rendererProcess.stdin != null && rendererProcess.stdin.writable) {
        rendererProcess.stdin.write(command + "\n");

        //此处的返回值将成为script.js中sendCommand函数的返回值
        return "OK";
    } else {
        return "Failed to send command: Renderer process is not available.";
    }
}

//展示弹窗，解决alert不支持自定义弹窗标题的问题
function showDialog(event, type, title, content) {
    dialog.showMessageBox(win, {type: type, title: title, message: content}).then(r => { console.log("Message confirmed"); });
}

function createWindow() {
    win = new window({
        title: "Renderer Configurator",
        width: configs.windowWidth,
        height: configs.windowHeight,
        //禁用自带菜单栏
        autoHideMenuBar: true,
        //允许最大化
        maximizable: true,
        //指定预加载脚本
        webPreferences: {
            preload: path.resolve(__dirname, "./preload.js"),
        }
    });

    //注册监听的IPC信道
    ipc.handle("send-command", sendCommand);
    ipc.handle("start-renderer", startRenderer);
    ipc.handle("stop-renderer", stopRenderer);
    ipc.on("show-dialog", showDialog);

    //渲染HTML页面
    win.loadFile("./pages/index.html").then(r => {
        console.log("Page load complete");
        console.log("node version =", process.versions.node, ", chrome version =", process.versions.chrome, ", electron version =", process.versions.electron);
    });

    //最大化窗口
    if (configs.isMaximize) {
        win.maximize();
    }

    //启动渲染器进程
    startRenderer(null, configs.executablePath).then(result => {
        console.log("Child process started.");
    }).catch(error => {
        console.log("Failed to start child process:", error);
        dialog.showErrorBox("Failed to start child process",  `Error message：${error.message || error}`);

        //在点击弹窗的确定后终止整个进程
        app.quit();
    });
}

//准备完成时创建窗口
app.on("ready", createWindow);

//当所有窗口关闭时退出应用
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }

    //确保子进程被终止
    if (rendererProcess != null) {
        stopRenderer();
        rendererProcess = null;
    }
});

//当应用被激活时，如果没有窗口则创建一个新窗口
app.on("activate", () => {
    if (window.getAllWindows().length === 0) { createWindow(); }
});
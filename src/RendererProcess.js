// ====== 导入配置 ======

const configs = require("./Config.js");
const childProcess = require("child_process");

// ====== 全局对象变量 ======

//渲染器进程
let rendererProcess = null;

// ====== 主逻辑函数 ======

//启动渲染器进程
function startRenderer() {
    //已在运行则直接返回成功
    if (rendererProcess != null && !rendererProcess.killed) {
        return Promise.resolve(true);
    }

    const executablePath = configs.executablePath;

    /*
     * 启动可执行文件作为子进程
     * 第二个参数：数组，传递给可执行程序的命令行参数
     * 第三个参数：对象，stdio: 表示配置三个标准流
     *
     * 无论进程启动是否成功，rendererProcess都会得到对象，必须通过监听事件判断
     */
    return new Promise((resolve, reject) => {
        try {
            console.log("Starting renderer process, executablePath =", executablePath);

            //启动可执行文件作为子进程
            rendererProcess = childProcess.spawn(executablePath, [], {
                stdio: ["pipe", "pipe", "pipe"],
            });

            //使用once，只在进程成功启动时触发一次
            rendererProcess.once("spawn", () => {
                console.log("Renderer process started.");
                resolve(true);
            });

            rendererProcess.once("exit", (code, signal) => {
                console.log("Renderer process exited, code =", code, ", signal =", signal);
                rendererProcess = null;
            });

            //需要多次监听，不能使用once
            rendererProcess.on("error", (err) => {
                console.log("Failed to start renderer process:", err);
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

//强制停止渲染器进程
function stopRenderer() {
    if (rendererProcess == null) return;
    console.log("Stopping renderer process...");

    try {
        if (rendererProcess.stdin != null && !rendererProcess.stdin.destroyed) {
            rendererProcess.stdin.end();
        }
        rendererProcess.kill();
        console.log("Renderer process stopped.");
    } catch (e) {
        console.error("Error while killing renderer process:", e);
    } finally {
        rendererProcess = null;
    }
}

//向渲染器进程发送命令
function sendCommand(command) {
    console.log("Sending command to renderer process:", command);

    if (rendererProcess != null && rendererProcess.stdin != null && rendererProcess.stdin.writable) {
        rendererProcess.stdin.write(command + "\n");

        console.log("Successfully send command", command, "to renderer process.");
        //此处的返回值将成为script.js中sendCommand函数的返回值
        return "OK";
    } else {
        return "Failed to send command to renderer: Process stdio is not available.";
    }
}

//导出函数供主进程调用
module.exports = {startRenderer, stopRenderer, sendCommand};

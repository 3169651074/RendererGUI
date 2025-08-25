//引入主模块
const electron = require("electron");

//引入桥梁模块
const bridge = electron.contextBridge;
const ipc = electron.ipcRenderer;

//向主进程发送命令字符串，等待结果
function sendCommand(command) {
    return ipc.invoke("send-command", command);
    //当主进程函数抛出异常或返回reject的Promise时invoke为reject，其他任何返回值均为成功
    //return Promise.reject(new Error("拒绝"));
}

function startRenderer(executablePath) {
    return ipc.invoke("start-renderer", executablePath);
}

function stopRenderer() {
    return ipc.invoke("stop-renderer");
}

function showDialog(type, title, content) {
    ipc.send("show-dialog", type, title, content);
}

bridge.exposeInMainWorld("renderer", {sendCommand, startRenderer, stopRenderer, showDialog});

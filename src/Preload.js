//引入主模块
const electron = require("electron");

//提取对象
const bridge = electron.contextBridge;
const ipc = electron.ipcRenderer;

// ====== 向主进程转发 ======

function showDialog(type, title, content) {
    ipc.send("show-dialog", type, title, content);
}

function sendCommand(command) {
    return ipc.invoke("send-command", command);
}

function checkConnection() {
    return ipc.invoke("check-connection");
}

function sendMessageToChat(content) {
    return ipc.invoke("chat-message", content);
}

// ====== 向渲染进程转发 ======

// function toggleChatModel(callbackFunction) {
//     ipc.on("chat-container", (event) => callbackFunction());
// }

// ====== 传递接口 ======

bridge.exposeInMainWorld("mainProcess", {
    showDialog, sendCommand, checkConnection, sendMessageToChat
});

// bridge.exposeInMainWorld("renderProcess", {
//     toggleChatModel: (callbackFunction) => toggleChatModel(callbackFunction)
// });
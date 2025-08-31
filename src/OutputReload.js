//重写console.log, console.error以添加时间信息
const _log = console.log;
console.log = function (...args) {
    const now = new Date();
    const MM = String(now.getMonth() + 1).padStart(2, "0"); // 月份
    const DD = String(now.getDate()).padStart(2, "0");      // 日
    const HH = String(now.getHours()).padStart(2, "0");     // 时
    const mm = String(now.getMinutes()).padStart(2, "0");   // 分
    const ss = String(now.getSeconds()).padStart(2, "0");   // 秒
    _log(`[${MM}-${DD}->${HH}:${mm}:${ss}]`, ...args);
};

const _error = console.error;
console.error = function (...args) {
    const date = new Date();
    const MM = String(date.getMonth() + 1).padStart(2, "0"); // 月份
    const DD = String(date.getDate()).padStart(2, "0");      // 日
    const HH = String(date.getHours()).padStart(2, "0");     // 时
    const mm = String(date.getMinutes()).padStart(2, "0");   // 分
    const ss = String(date.getSeconds()).padStart(2, "0");   // 秒
    _error(`[${MM}-${DD}->${HH}:${mm}:${ss}]`, ...args);
};
// logger.js

// Глобальный обработчик ошибок
export function setGlobalErrorHandler() {
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        const errorMessage = `Uncaught error: ${msg} at ${url}:${lineNo}:${columnNo}\nStack: ${error?.stack || 'N/A'}`;
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            logContainer.innerHTML += `<span style="color: #ff0000">${errorMessage}</span>\n`;
        }
        originalConsoleError(errorMessage);
        return false;
    };
}

// Переопределение console.log и console.error для кастомных логов
let originalConsoleLog = console.log;
let originalConsoleError = console.error;

export function overrideConsoleLog() {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) {
        originalConsoleError('Log container not found');
        return;
    }

    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    console.log = function (...args) {
        originalConsoleLog.apply(console, args);
        const logMessage = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        const isBonusLog = /horizontal_arrow|vertical_arrow|bonus_star/.test(logMessage);
        const colorClass = isBonusLog ? 'bonus-log' : 'default-log';
        logContainer.innerHTML += `<span class="${colorClass}">${logMessage}</span>\n`;
        logContainer.scrollTop = logContainer.scrollHeight;
    };

    console.error = function (...args) {
        originalConsoleError.apply(console, args);
        const logMessage = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        const isBonusLog = /horizontal_arrow|vertical_arrow|bonus_star/.test(logMessage);
        const colorClass = isBonusLog ? 'bonus-log' : 'default-log';
        logContainer.innerHTML += `<span class="${colorClass}">ERROR: ${logMessage}</span>\n`;
        logContainer.scrollTop = logContainer.scrollHeight;
    };
}

// Вспомогательная функция для инициализации логгера
export function initLogger() {
    setGlobalErrorHandler();
    overrideConsoleLog();
}
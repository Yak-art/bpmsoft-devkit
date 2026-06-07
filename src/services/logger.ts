import * as vscode from 'vscode';

export enum LogLevel {
    Info = 'INFO',
    Warn = 'WARN',
    Error = 'ERROR'
}

export class Logger implements vscode.Disposable {
    private static instance: Logger | null = null;
    private readonly channel: vscode.OutputChannel;

    // Закрытый конструктор для реализации паттерна Singleton
    private constructor() {
        this.channel = vscode.window.createOutputChannel("BPMSoft DevKit");
    }

    /**
     * Получение единого инстанса логгера
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Основной метод логирования.
     * @param context Передавайте `this` из вызывающего класса для автоматического определения источника.
     * @param message Текст сообщения.
     * @param level Уровень логирования (по умолчанию Info).
     */
    public log(context: object | string, message: string, level: LogLevel = LogLevel.Info): void {
        // Определяем имя источника: если передан класс — берем его имя, если строка — используем её
        const sourceName = typeof context === 'string' 
            ? context 
            : context.constructor.name;

        const timestamp = new Date().toLocaleTimeString();
        
        // Форматируем строку: [00:00:00] [INFO] [RedisService] Сообщение
        this.channel.appendLine(`[${timestamp}] [${level}] [${sourceName}] ${message}`);
    }

    /**
     * Принудительно открывает панель Output с нашими логами
     */
    public show(): void {
        this.channel.show(true);
    }

    /**
     * Очистка ресурсов при деактивации плагина
     */
    public dispose(): void {
        this.channel.dispose();
        Logger.instance = null;
    }
}
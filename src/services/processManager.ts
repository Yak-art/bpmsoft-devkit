import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { COMMANDS, CONFIG } from '../constants';

// Перечисление для точного контроля состояний сервера
enum ServerState {
    Stopped,
    Starting,
    Running
}

export class ProcessManager {
    private activeTerminal: vscode.Terminal | null = null;
	private statusBarItem: vscode.StatusBarItem;
	private readonly disposables: vscode.Disposable[] = [];

	// Флаг, указывающий, что прямо сейчас идет процесс перезапуска
    private isRestarting: boolean = false;

	// Текущее состояние сервера
    private currentState: ServerState = ServerState.Stopped;

    constructor() {
		// 1. Создаем элемент статус-бара в левой части нижней панели с приоритетом 100
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = COMMANDS.TOGGLE_SERVER; // Команда по клику

		// Инициализируем статус-бар в состоянии "Остановлен"
        this.updateStatusBar(ServerState.Stopped);
        this.statusBarItem.show();
		
        // Подписываемся на событие закрытия терминала в системе
        const terminalCloseDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
            if (this.activeTerminal && closedTerminal === this.activeTerminal) {
                this.activeTerminal = null;
                this.updateStatusBar(ServerState.Stopped);

				// Если терминал закрылся в ходе перезапуска — запускаем новый
                if (this.isRestarting) {
                    this.isRestarting = false; // Сбрасываем флаг
                    this.start();
                } else {
                    vscode.window.showInformationMessage('Терминал BPMSoft закрыт пользователем.');
                }
            }
        });
		this.disposables.push(terminalCloseDisposable);

		// Слушатель вывода данных в терминал (Парсинг логов на лету)
        const terminalWriteDisposable = vscode.window.onDidWriteTerminalData((e) => {
            // Проверяем, что данные идут именно из нашего терминала
            if (!this.activeTerminal || e.terminal !== this.activeTerminal) {
                return;
            }

            const data = e.data;

            // Ищем маркер запуска процесса
            if (data.includes('Application starting')) {
                this.updateStatusBar(ServerState.Starting);
            }

            // Ищем маркер успешного старта веб-сервера Kestrel
            if (data.includes('Application started') || data.includes('Hosting environment:')) {
                // Переключаем статус на "Запущен" только когда приложение реально готово принимать запросы
                this.updateStatusBar(ServerState.Running);
            }
        });
		this.disposables.push(terminalWriteDisposable);
    }

	/**
     * Публичный метод для проверки состояния (запущен/нет)
     */
    public isRunning(): boolean {
        return this.activeTerminal !== null;
    }

	/**
     * Метод переключения состояния (вызывается из статус-бара)
     */
    public toggleServer(): void {
       if (this.currentState === ServerState.Running || this.currentState === ServerState.Starting) {
            this.stop();
        } else {
            this.start();
        }
    }

    public start(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Откройте корневую папку проекта!');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

		// Читаем путь к ПАПКЕ из настроек VS Code
        const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
        const configuredFolder = config.get<string>(CONFIG.KEYS.WEB_HOST_FOLDER_PATH) || CONFIG.DEFAULTS.WEB_HOST_FOLDER_PATH;

		// Вычисляем финальный путь (проверяем абсолютный он или относительный)
        const folderPath = path.isAbsolute(configuredFolder) 
            ? configuredFolder 
            : path.join(rootPath, configuredFolder);

		// Сами формируем путь к исполняемому файлу внутри этой папки
        const dllPath = path.join(folderPath, 'BPMSoft.WebHost.dll');

		// Проверка на существование файла перед запуском
        if (!fs.existsSync(dllPath)) {
            vscode.window.showErrorMessage(`Файл BPMSoft.WebHost.dll не найден в папке: ${folderPath}. Проверьте настройки расширения.`);
			this.isRestarting = false; // Защита: сбрасываем флаг, если запуск невозможен
            return;
        }

        // Если терминал уже открыт — просто выводим его на передний план
        if (this.activeTerminal) {
            this.activeTerminal.show();
            // vscode.window.showWarningMessage('Терминал BPMSoft уже открыт. Если приложение остановлено, запустите его вручную (Ctrl+C -> Вверх -> Enter) или нажмите Перезапуск.');
            return;
        }

		// Выставляем статус "Запуск", как только отправляем команду
        this.updateStatusBar(ServerState.Starting);

        // Создаем интерактивный терминал
        this.activeTerminal = vscode.window.createTerminal({
            name: "BPMSoft Server",
            cwd: path.dirname(dllPath) // Запускаем в контексте папки с DLL
        });

        this.activeTerminal.show();
        // Передаем команду запуска. true означает автоматический запуск (нажатие Enter)
        this.activeTerminal.sendText(`dotnet "${dllPath}"`, true);
        

		if (!this.isRestarting) {
            vscode.window.showInformationMessage('Команда запуска отправлена в терминал.');
        }
    }

    public stop(): void {
        if (!this.activeTerminal) {
			if (!this.isRestarting) {
                vscode.window.showInformationMessage('Активный терминал BPMSoft не найден.');
            }
            return;
        }

		// \u0003 — это ASCII-символ для ETX (End of Text), что эквивалентно нажатию Ctrl+C в CLI
        // Второй параметр false означает, что мы НЕ нажимаем Enter автоматически, так как Ctrl+C срабатывает мгновенно
        this.activeTerminal.sendText('\u0003', false);
		
        // Вызов dispose() шлет SIGKILL/SIGINT процессу и закрывает вкладку терминала
		// Дополнительно шлем dispose(), чтобы вкладка терминала полностью закрылась.
        // За счет того, что мы сначала послали Ctrl+C, .NET успеет перехватить SIGINT 
        // и корректно освободить порты перед тем, как VS Code уничтожит оболочку.
        this.activeTerminal.dispose();

		if (!this.isRestarting) {
            vscode.window.showInformationMessage('Отправлен сигнал остановки сервера (Ctrl+C).');
        }

		// Обновляем статус-бар в состояние "Остановлен"
        // this.updateStatusBar(false);
        vscode.window.showInformationMessage('Сервер BPMSoft остановлен.');
    }

    public restart(): void {
		if (!this.isRunning()) {
            // Если сервер и так не запущен, просто стартуем его
            this.start();
            return;
        }

        vscode.window.showInformationMessage('Перезапуск сервера...');
		this.isRestarting = true; // Выставляем флаг перед остановкой
        this.stop(); // Запускаем процесс мягкого закрытия

		// Дальше управление переходит в слушатель onDidCloseTerminal в конструкторе.
        // Как только ОС и VS Code закроют старый терминал, автоматически выполнится новый start()
        
        // // Пауза, чтобы ОС успела полностью закрыть порт
        // setTimeout(() => {
        //     this.start();
        // }, 1500);
    }

	/**
     * Централизованный метод обновления статус-бара на основе перечисления состояний
     */
    private updateStatusBar(state: ServerState): void {
		this.currentState = state;
        switch (state) {
            case ServerState.Running:
                this.statusBarItem.text = `$(primitive-square) BPMSoft: 🟢 Running`;
                this.statusBarItem.tooltip = `Сервер запущен и готов к работе. Кликните, чтобы остановить.`;
                break;

            case ServerState.Starting:
                // Используем встроенную иконку синхронизации $(sync~spin), которая будет красиво крутиться!
                this.statusBarItem.text = `$(sync~spin) BPMSoft: 🟡 Starting...`;
                this.statusBarItem.tooltip = `Приложение инициализируется. Пожалуйста, подождите...`;
                break;

            case ServerState.Stopped:
            default:
                this.statusBarItem.text = `$(play) BPMSoft: 🔴 Stopped`;
                this.statusBarItem.tooltip = `Сервер остановлен. Кликните, чтобы запустить.`;
                break;
        }
    }

	/**
     * Не забываем очистить ресурсы статус-бара при деактивации расширения
     */
    public dispose(): void {
		for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.statusBarItem.dispose();
    }
}
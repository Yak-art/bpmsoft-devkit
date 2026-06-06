import * as vscode from 'vscode';
import { registerWebHostCommands } from './commands/toggleWebHost';
import { BpmAppProvider } from './providers/bpmAppProvider';
import { ProcessManager } from './services/processManager';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "bpmsoft-devkit" is now active!');

	// 1. Инициализируем менеджер (слушатель терминалов включится автоматически)
    const processManager = new ProcessManager();
	const bpmAppProvider = new BpmAppProvider();

    // 2. Регистрируем команды кликов
    registerWebHostCommands(context, processManager, bpmAppProvider);

	// 3. Регистрируем UI-панель
    vscode.window.registerTreeDataProvider('bpmsoft-sidebar-view', bpmAppProvider);

	// Добавляем менеджер процессов в подписки контекста, 
    // чтобы при закрытии VS Code вызвался метод dispose() и очистил статус-бар
    context.subscriptions.push(processManager);
}

export function deactivate() {}

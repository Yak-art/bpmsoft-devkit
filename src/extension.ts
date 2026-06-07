import * as vscode from 'vscode';
import { registerConfigCommands } from './commands/configCommands';
import { registerProcessCommands } from './commands/processCommands';
import { registerUiCommands } from './commands/uiCommands';
import { BpmAppProvider } from './providers/bpmAppProvider';
import { Logger } from './services/logger';
import { ProcessManager } from './services/processManager';
import { WebHostPathResolver } from './services/webHostPathResolver';
import { BpmStatusBarManager } from './ui/bpmStatusBarManager';

export function activate(context: vscode.ExtensionContext) {
	// Получаем инстанс логгера и регистрируем его dispose
    const logger = Logger.getInstance();
    context.subscriptions.push(logger);

    logger.log('Extension', 'Расширение BPMSoft DevKit успешно активировано.');
	
    // 1. Инициализируем чистые атомарные сервисы
    const pathResolver = new WebHostPathResolver();
    const statusBarManager = new BpmStatusBarManager();

    // 2. Внедряем их в главный менеджер процессов
    const processManager = new ProcessManager(pathResolver, statusBarManager);
    const bpmAppProvider = new BpmAppProvider();

	// 3. Изолированная регистрация групп команд
    registerProcessCommands(context, processManager);
    registerUiCommands(context, bpmAppProvider);
    registerConfigCommands(context, bpmAppProvider);

    vscode.window.registerTreeDataProvider('bpmsoft-sidebar-view', bpmAppProvider);

    // 4. Складываем всё в корзину деактивации контекста
    context.subscriptions.push(statusBarManager, processManager);
}

export function deactivate() {}
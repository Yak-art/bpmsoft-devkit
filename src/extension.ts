import * as vscode from 'vscode';
import { registerWebHostCommands } from './commands/toggleWebHost';
import { BpmAppProvider } from './providers/bpmAppProvider';
import { ProcessManager } from './services/processManager';
import { WebHostPathResolver } from './services/webHostPathResolver';
import { BpmStatusBarManager } from './ui/bpmStatusBarManager';

export function activate(context: vscode.ExtensionContext) {
    // 1. Инициализируем чистые атомарные сервисы
    const pathResolver = new WebHostPathResolver();
    const statusBarManager = new BpmStatusBarManager();

    // 2. Внедряем их в главный менеджер процессов
    const processManager = new ProcessManager(pathResolver, statusBarManager);
    const bpmAppProvider = new BpmAppProvider();

    // 3. Регистрируем команды UI
    registerWebHostCommands(context, processManager, bpmAppProvider);

    vscode.window.registerTreeDataProvider('bpmsoft-sidebar-view', bpmAppProvider);

    // 4. Складываем всё в корзину деактивации контекста
    context.subscriptions.push(statusBarManager, processManager);
}

export function deactivate() {}
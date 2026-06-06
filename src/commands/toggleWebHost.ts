import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { COMMANDS, CONFIG } from '../constants';
import { BpmAppProvider } from '../providers/bpmAppProvider';
import { ProcessManager } from '../services/processManager';

export function registerWebHostCommands(
	context: vscode.ExtensionContext, 
	processManager: ProcessManager,
    bpmAppProvider: BpmAppProvider
) {
    const startCmd = vscode.commands.registerCommand(COMMANDS.START, () => {
        processManager.start();
    });

    const stopCmd = vscode.commands.registerCommand(COMMANDS.STOP, () => {
        processManager.stop();
    });

    const restartCmd = vscode.commands.registerCommand(COMMANDS.RESTART, () => {
        processManager.restart();
    });

    context.subscriptions.push(startCmd, stopCmd, restartCmd);

	// Переключение экрана UI на НАСТРОЙКИ
    const toggleUiSettingsCmd = vscode.commands.registerCommand(COMMANDS.TOGGLE_UI_SETTINGS, () => {
        bpmAppProvider.setSettingsMode(true);
    });

    // Переключение экрана UI НАЗАД в главное меню
    const toggleUiMenuCmd = vscode.commands.registerCommand(COMMANDS.TOGGLE_UI_MENU, () => {
        bpmAppProvider.setSettingsMode(false);
    });

    // Интерактивное изменение пути к DLL через InputBox
    const changePathCmd = vscode.commands.registerCommand(COMMANDS.CHANGE_PATH, async () => {
        const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
        const currentPath = config.get<string>(CONFIG.KEYS.WEB_HOST_FOLDER_PATH) || CONFIG.DEFAULTS.WEB_HOST_FOLDER_PATH;

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
            vscode.window.showErrorMessage('Откройте рабочую область (workspace) перед настройкой.');
            return;
        }
		const rootPath = workspaceFolders[0].uri.fsPath;
		// Функция валидации «на лету» (Пункт 1)
        const validateFolder = (value: string): string | undefined => {
            if (!value) { 
				return undefined; 
			}
            
            const targetFolder = path.isAbsolute(value) ? value : path.join(rootPath, value);
            const expectedDllPath = path.join(targetFolder, 'BPMSoft.WebHost.dll');
            
            if (!fs.existsSync(targetFolder)) {
                return 'Указанная папка не существует';
            }
            if (!fs.existsSync(expectedDllPath)) {
                return 'Папка существует, но в ней нет файла BPMSoft.WebHost.dll';
            }
            return undefined; // Ошибок нет
        };

		// 1. Предлагаем варианты: ввести вручную или выбрать через Обзор
        const quickPickItems: vscode.QuickPickItem[] = [
            { 
                label: '$(edit) Ввести путь вручную', 
                description: 'Указать относительный или абсолютный путь в строке ввода' 
            },
            { 
                label: '$(folder-opened) Выбрать папку в проводнике', 
                description: 'Открыть стандартный диалог выбора папки (Пункт 2)' 
            }
        ];

		const selection = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: 'Выберите способ настройки пути к WebHost'
        });

		if (!selection) { return; } // Пользователь закрыл меню

		let selectedFolderPath: string | undefined;

		// Логика для Варианта 1: Ручной ввод с валидацией (Пункт 1)
        if (selection.label.includes('Ввести путь вручную')) {
            selectedFolderPath = await vscode.window.showInputBox({
                prompt: 'Укажите путь до ПАПКИ с BPMSoft.WebHost.dll',
                value: currentPath,
                placeHolder: 'Например: src/BPMSoft.WebHost',
                validateInput: validateFolder // Привязываем валидацию
            });
        }
		// Логика для Варианта 2: Проводник (Пункт 2)
        else if (selection.label.includes('Выбрать папку в проводнике')) {
            const defaultUri = currentPath 
                ? vscode.Uri.file(path.isAbsolute(currentPath) ? currentPath : path.join(rootPath, currentPath))
                : vscode.Uri.file(rootPath);

            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true, // Нам нужна именно папка
                defaultUri: defaultUri,
                openLabel: 'Выбрать папку'
            };

            const folderUri = await vscode.window.showOpenDialog(options);
            if (folderUri && folderUri[0]) {
                const absolutePath = folderUri[0].fsPath;
                
                // Делаем путь относительным для красоты (если папка внутри воркспейса)
                if (absolutePath.startsWith(rootPath)) {
                    selectedFolderPath = path.relative(rootPath, absolutePath);
                } else {
                    selectedFolderPath = absolutePath;
                }

                // Финальная проверка выбранной папки
                const validationError = validateFolder(selectedFolderPath);
                if (validationError) {
                    vscode.window.showErrorMessage(validationError);
                    return;
                }
            }
        }

        if (selectedFolderPath !== undefined) {
            await config.update(CONFIG.KEYS.WEB_HOST_FOLDER_PATH, selectedFolderPath, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Путь успешно обновлен: ${selectedFolderPath || '(корень воркспейса)'}`);
            bpmAppProvider.refresh();
        }
    });

	context.subscriptions.push(toggleUiSettingsCmd, toggleUiMenuCmd, changePathCmd);

	// Регистрация команды переключения для Статус-бара
    const toggleServerCmd = vscode.commands.registerCommand(COMMANDS.TOGGLE_SERVER, () => {
        processManager.toggleServer();
    });

    context.subscriptions.push(toggleServerCmd);
}
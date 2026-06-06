import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CONFIG } from '../constants';
import { BpmAppProvider } from '../providers/bpmAppProvider';

export class WebHostConfigWizard {
    constructor(private readonly bpmAppProvider: BpmAppProvider) {}

    /**
     * Запускает интерактивный пошаговый мастер изменения пути к WebHost.
     */
    public async changePath(): Promise<void> {
        const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
        const currentPath = config.get<string>(CONFIG.KEYS.WEB_HOST_FOLDER_PATH) || CONFIG.DEFAULTS.WEB_HOST_FOLDER_PATH;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Откройте рабочую область (workspace) перед настройкой.');
            return;
        }
        const rootPath = workspaceFolders[0].uri.fsPath;

        // Лямбда-функция валидации «на лету»
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
            return undefined;
        };

        // Варианты выбора в меню
        const quickPickItems: vscode.QuickPickItem[] = [
            { 
                label: '$(edit) Ввести путь вручную', 
                description: 'Указать относительный или абсолютный путь в строке ввода' 
            },
            { 
                label: '$(folder-opened) Выбрать папку в проводнике', 
                description: 'Открыть стандартный диалог выбора папки' 
            }
        ];

        const selection = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: 'Выберите способ настройки пути к WebHost'
        });

        if (!selection) { 
            return; // Пользователь отменил выбор
        }

        let selectedFolderPath: string | undefined;

        // Сценарий 1: Ручной ввод
        if (selection.label.includes('Ввести путь вручную')) {
            selectedFolderPath = await vscode.window.showInputBox({
                prompt: 'Укажите путь до ПАПКИ с BPMSoft.WebHost.dll',
                value: currentPath,
                placeHolder: 'Например: src/BPMSoft.WebHost',
                validateInput: validateFolder
            });
        } 
        // Сценарий 2: Диалоговое окно ОС
        else if (selection.label.includes('Выбрать папку в проводнике')) {
            const defaultUri = currentPath 
                ? vscode.Uri.file(path.isAbsolute(currentPath) ? currentPath : path.join(rootPath, currentPath))
                : vscode.Uri.file(rootPath);

            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                defaultUri: defaultUri,
                openLabel: 'Выбрать папку'
            };

            const folderUri = await vscode.window.showOpenDialog(options);
            if (folderUri && folderUri[0]) {
                const absolutePath = folderUri[0].fsPath;
                
                // Трансформируем в относительный путь, если папка находится внутри проекта
                if (absolutePath.startsWith(rootPath)) {
                    selectedFolderPath = path.relative(rootPath, absolutePath);
                } else {
                    selectedFolderPath = absolutePath;
                }

                // Повторная валидация результата из проводника
                const validationError = validateFolder(selectedFolderPath);
                if (validationError) {
                    vscode.window.showErrorMessage(validationError);
                    return;
                }
            }
        }

        // Сохранение результатов, если выбор был сделан успешно
        if (selectedFolderPath !== undefined) {
            await config.update(CONFIG.KEYS.WEB_HOST_FOLDER_PATH, selectedFolderPath, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Путь успешно обновлен: ${selectedFolderPath || '(корень воркспейса)'}`);
            
            // Обновляем дерево UI дерева плагина
            this.bpmAppProvider.refresh();
        }
    }
}
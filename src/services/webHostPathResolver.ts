import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CONFIG } from '../constants';

export class WebHostPathResolver {
    private readonly dllName = 'BPMSoft.WebHost.dll';

    /**
     * Вычисляет абсолютный путь к BPMSoft.WebHost.dll на основе настроек Workspace.
     * @throws Error если рабочая область не открыта или файл не найден.
     */
    public resolveDllPath(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('Откройте корневую папку проекта!');
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration(CONFIG.SECTION);
        const configuredFolder = config.get<string>(CONFIG.KEYS.WEB_HOST_FOLDER_PATH) ?? CONFIG.DEFAULTS.WEB_HOST_FOLDER_PATH;

        // Вычисляем финальный путь к папке (с учетом относительности)
        const folderPath = path.isAbsolute(configuredFolder)
            ? configuredFolder
            : path.join(rootPath, configuredFolder);

        const dllPath = path.join(folderPath, this.dllName);

        if (!fs.existsSync(dllPath)) {
            throw new Error(`Файл ${this.dllName} не найден в папке: ${folderPath}. Проверьте настройки расширения.`);
        }

        return dllPath;
    }
}
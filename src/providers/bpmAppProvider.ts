

import * as vscodeModule from 'vscode';
import { COMMANDS, CONFIG } from '../constants';

export class BpmAppProvider implements vscodeModule.TreeDataProvider<AppTreeItem> {
    private _onDidChangeTreeData: vscodeModule.EventEmitter<AppTreeItem | undefined | null | void> = new vscodeModule.EventEmitter<AppTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscodeModule.Event<AppTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	// Состояние: находимся ли мы сейчас в меню настроек
    private isSettingsMode: boolean = false;

	public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

	// Метод для переключения режимов (вызывается из команд)
    public setSettingsMode(value: boolean): void {
        this.isSettingsMode = value;
        this.refresh();
    }

    getTreeItem(element: AppTreeItem): vscodeModule.TreeItem {
        return element;
    }

    getChildren(element?: AppTreeItem): vscodeModule.ProviderResult<AppTreeItem[]> {
        if (element) {
            return [];
        }

		// Если включен режим настроек
        if (this.isSettingsMode) {
            const config = vscodeModule.workspace.getConfiguration(CONFIG.SECTION);
            const currentPath = config.get<string>(CONFIG.KEYS.WEB_HOST_FOLDER_PATH) || CONFIG.DEFAULTS.WEB_HOST_FOLDER_PATH;

            return [
                new AppTreeItem(`Текущий путь: ${currentPath}`, COMMANDS.CHANGE_PATH, 'edit', 'Изменить путь к WebHost.dll'),
                new AppTreeItem('Назад в меню', COMMANDS.TOGGLE_UI_MENU, 'arrow-left', 'Вернуться к управлению сервером')
            ];
        }

        return [
            new AppTreeItem('Запустить сервер', COMMANDS.START, 'play'),
            new AppTreeItem('Остановить сервер', COMMANDS.STOP, 'primitive-square'),
            new AppTreeItem('Перезапустить сервер', COMMANDS.RESTART, 'sync'),
        ];
    }
}

class AppTreeItem extends vscodeModule.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        iconName: string,
        description?: string
    ) {
        super(label, vscodeModule.TreeItemCollapsibleState.None);
        this.contextValue = 'appAction';
        this.iconPath = new vscodeModule.ThemeIcon(iconName);
		if (description) {
            this.tooltip = description;
        }
        
        this.command = {
            title: label,
            command: commandId
        };
    }
}
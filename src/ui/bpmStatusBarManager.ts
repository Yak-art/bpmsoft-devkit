import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { ServerState } from '../models/serverState';

export class BpmStatusBarManager implements vscode.Disposable {
    private readonly statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = COMMANDS.TOGGLE_SERVER;
        this.update(ServerState.Stopped);
        this.statusBarItem.show();
    }

    /**
     * Централизованно обновляет внешний вид статус-бара на основе состояния
     */
    public update(state: ServerState): void {
        switch (state) {
            case ServerState.Running:
                this.statusBarItem.text = `$(primitive-square) BPMSoft: 🟢 Running`;
                this.statusBarItem.tooltip = `Сервер запущен и готов к работе. Кликните, чтобы остановить.`;
                break;

            case ServerState.Starting:
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

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
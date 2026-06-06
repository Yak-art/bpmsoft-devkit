import * as path from 'path';
import * as vscode from 'vscode';
import { ServerState } from '../models/serverState';
import { BpmStatusBarManager } from '../ui/bpmStatusBarManager';
import { WebHostPathResolver } from './webHostPathResolver';

export class ProcessManager implements vscode.Disposable {
    private activeTerminal: vscode.Terminal | null = null;
    private isRestarting: boolean = false;
    private currentState: ServerState = ServerState.Stopped;
    
    private readonly disposables: vscode.Disposable[] = [];
    private readonly pathResolver: WebHostPathResolver;
    private readonly statusBarManager: BpmStatusBarManager;

    constructor(pathResolver: WebHostPathResolver, statusBarManager: BpmStatusBarManager) {
        this.pathResolver = pathResolver;
        this.statusBarManager = statusBarManager;

        this.registerTerminalListeners();
    }

    public isRunning(): boolean {
        return this.activeTerminal !== null;
    }

    public toggleServer(): void {
        if (this.currentState === ServerState.Running || this.currentState === ServerState.Starting) {
            this.stop();
        } else {
            this.start();
        }
    }

    public start(): void {
        let dllPath: string;

        try {
            dllPath = this.pathResolver.resolveDllPath();
        } catch (error: any) {
            vscode.window.showErrorMessage(error.message);
            this.isRestarting = false;
            return;
        }

        if (this.activeTerminal) {
            this.activeTerminal.show();
            return;
        }

        this.setServerState(ServerState.Starting);

        this.activeTerminal = vscode.window.createTerminal({
            name: "BPMSoft Server",
            cwd: path.dirname(dllPath)
        });

        this.activeTerminal.show();
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

        this.activeTerminal.sendText('\u0003', false);
        this.activeTerminal.dispose();
    }

    public restart(): void {
        if (!this.isRunning()) {
            this.start();
            return;
        }

        vscode.window.showInformationMessage('Перезапуск сервера...');
        this.isRestarting = true;
        this.stop();
    }

    private setServerState(state: ServerState): void {
        this.currentState = state;
        this.statusBarManager.update(state);
    }

    private registerTerminalListeners(): void {
        // Подписка на закрытие терминала
        const closeSub = vscode.window.onDidCloseTerminal((closedTerminal) => {
            if (this.activeTerminal && closedTerminal === this.activeTerminal) {
                this.activeTerminal = null;
                this.setServerState(ServerState.Stopped);

                if (this.isRestarting) {
                    this.isRestarting = false;
                    this.start();
                } else {
                    vscode.window.showInformationMessage('Терминал BPMSoft закрыт пользователем.');
                }
            }
        });

        // Подписка на чтение потока данных терминала (Парсинг логов)
        const dataSub = (vscode.window as any).onDidWriteTerminalData((e: any) => {
            if (!this.activeTerminal || e.terminal !== this.activeTerminal) {
                return;
            }

            if (e.data.includes('Application starting')) {
                this.setServerState(ServerState.Starting);
            }

            if (e.data.includes('Application started') || e.data.includes('Hosting environment:')) {
                this.setServerState(ServerState.Running);
            }
        });

        this.disposables.push(closeSub, dataSub);
    }

    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
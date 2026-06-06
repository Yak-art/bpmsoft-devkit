import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { ProcessManager } from '../services/processManager';

export function registerProcessCommands(context: vscode.ExtensionContext, processManager: ProcessManager) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.START, () => processManager.start()),
        vscode.commands.registerCommand(COMMANDS.STOP, () => processManager.stop()),
        vscode.commands.registerCommand(COMMANDS.RESTART, () => processManager.restart()),
        vscode.commands.registerCommand(COMMANDS.TOGGLE_SERVER, () => processManager.toggleServer())
    );
}
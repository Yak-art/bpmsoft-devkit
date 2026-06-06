import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { BpmAppProvider } from '../providers/bpmAppProvider';

export function registerUiCommands(context: vscode.ExtensionContext, bpmAppProvider: BpmAppProvider) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.TOGGLE_UI_SETTINGS, () => bpmAppProvider.setSettingsMode(true)),
        vscode.commands.registerCommand(COMMANDS.TOGGLE_UI_MENU, () => bpmAppProvider.setSettingsMode(false))
    );
}
import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { BpmAppProvider } from '../providers/bpmAppProvider';
import { WebHostConfigWizard } from '../services/webHostConfigWizard';

export function registerConfigCommands(context: vscode.ExtensionContext, bpmAppProvider: BpmAppProvider) {
    const configWizard = new WebHostConfigWizard(bpmAppProvider);
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.CHANGE_PATH, () => configWizard.changePath())
    );
}
/**
 * Константы для идентификаторов конфигурации расширения (из package.json)
 */
export const CONFIG = {
    /** Имя основной секции настроек */
    SECTION: 'bpmsoft.devkit',
    
    /** Ключи конкретных свойств */
    KEYS: {
        WEB_HOST_FOLDER_PATH: 'webHostFolderPath'
    },
    
    /** Значения по умолчанию, если настройка не задана */
    DEFAULTS: {
        WEB_HOST_FOLDER_PATH: ''
    }
} as const;

/**
 * Константы команд расширения
 */
export const COMMANDS = {
    START: 'bpmsoft.app.start',
    STOP: 'bpmsoft.app.stop',
    RESTART: 'bpmsoft.app.restart',
    TOGGLE_UI_SETTINGS: 'bpmsoft.app.toggleUiSettings',
    TOGGLE_UI_MENU: 'bpmsoft.app.toggleUiMenu',
    CHANGE_PATH: 'bpmsoft.app.changePath',
	TOGGLE_SERVER: 'bpmsoft.app.toggleServer'
} as const;
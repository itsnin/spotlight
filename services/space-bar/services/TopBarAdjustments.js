import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Settings } from './Settings.js';
export class TopBarAdjustments {
    static _instance;
    static init() {
        TopBarAdjustments._instance = new TopBarAdjustments();
        TopBarAdjustments._instance.init();
    }
    static destroy() {
        TopBarAdjustments._instance.destroy();
        TopBarAdjustments._instance = null;
    }
    _settings = Settings.getInstance();
    _didHideActivitiesButton = false;
    init() {
        this._settings.systemWorkspaceIndicator.subscribe((systemWorkspaceIndicator) => {
            if (systemWorkspaceIndicator) {
                this._restoreSystemWorkspaceIndicator();
            }
            else {
                this._hideSystemWorkspaceIndicator();
            }
        }, { emitCurrentValue: true });
    }
    destroy() {
        this._restoreSystemWorkspaceIndicator();
    }
    _hideSystemWorkspaceIndicator() {
        const activitiesButton = Main.panel.statusArea.activities;
        if (activitiesButton && !Main.sessionMode.isLocked && activitiesButton.is_visible()) {
            activitiesButton.hide();
            this._didHideActivitiesButton = true;
        }
    }
    _restoreSystemWorkspaceIndicator() {
        const activitiesButton = Main.panel.statusArea.activities;
        if (activitiesButton && this._didHideActivitiesButton) {
            activitiesButton.show();
            this._didHideActivitiesButton = false;
        }
    }
}

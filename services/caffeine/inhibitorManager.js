// spotlight - caffeine inhibitor manager
// copied from caffeine extension v60
// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import { MprisPlayer } from './mprisMediaPlayer2.js';

export const INHIBIT_APPS_KEY = 'inhibit-apps';
export const SHOW_INDICATOR_KEY = 'show-indicator';
export const SHOW_NOTIFICATIONS_KEY = 'show-notifications';
export const SHOW_TIMER_KEY = 'show-timer';
export const SHOW_TOGGLE_KEY = 'show-toggle';
export const DURATION_TIMER_LIST = 'duration-timer-list';
export const USER_ENABLED_KEY = 'user-enabled';
export const RESTORE_KEY = 'restore-state';
export const FULLSCREEN_KEY = 'enable-fullscreen';
export const MPRIS_KEY = 'enable-mpris';
export const NIGHT_LIGHT_KEY = 'nightlight-control';
export const TOGGLE_SHORTCUT = 'caffeine-toggle-shortcut';
export const TIMER_KEY = 'countdown-timer';
export const SCREEN_BLANK = 'screen-blank';
export const TRIGGER_APPS_MODE = 'trigger-apps-mode';
export const INDICATOR_POSITION = 'indicator-position';
export const INDICATOR_INDEX = 'indicator-position-index';
export const INDICATOR_POS_MAX = 'indicator-position-max';
export const CLI_TOGGLE_KEY = 'cli-toggle';

export const ControlContext = {
    NEVER: 0,
    ALWAYS: 1,
    FOR_APPS: 2
};

export const ShowIndicator = {
    ONLY_ACTIVE: 0,
    ALWAYS: 1,
    NEVER: 2
};

export const AppsTrigger = {
    ON_RUNNING: 0,
    ON_FOCUS: 1,
    ON_ACTIVE_WORKSPACE: 2
};

const ColorInterface = '<node> \
  <interface name="org.gnome.SettingsDaemon.Color"> \
    <property name="DisabledUntilTomorrow" type="b" access="readwrite"/>\
  </interface>\
  </node>';

const ColorProxy = Gio.DBusProxy.makeProxyWrapper(ColorInterface);

const DBusSessionManagerIface = '<node>\
  <interface name="org.gnome.SessionManager">\
    <method name="Inhibit">\
        <arg type="s" direction="in" />\
        <arg type="u" direction="in" />\
        <arg type="s" direction="in" />\
        <arg type="u" direction="in" />\
        <arg type="u" direction="out" />\
    </method>\
    <method name="Uninhibit">\
        <arg type="u" direction="in" />\
    </method>\
  </interface>\
</node>';

const DBusSessionManagerProxy = Gio.DBusProxy.makeProxyWrapper(DBusSessionManagerIface);

export const InhibitorManager = GObject.registerClass({
    Signals: {
        'update': {}
    }
}, class InhibitorManager extends GObject.Object {
    _init(settings) {
        super._init();

        this._isInhibited = false;
        this._inhibitorCookie = null;
        this._userEnabled = false;
        this._triggerApp = null;
        this._tempManageLight = false;
        this._lastReasons = [];
        this._ignoredReasons = [];

        this._appStateSignal = null;
        this._focusWindowSignal = null;
        this._workspaceSignal = null;
        this._restackedSignal = null;

        this._sessionManager = new DBusSessionManagerProxy(Gio.DBus.session,
            'org.gnome.SessionManager',
            '/org/gnome/SessionManager');
        this._colorProxy = new ColorProxy(
            Gio.DBus.session,
            'org.gnome.SettingsDaemon.Color',
            '/org/gnome/SettingsDaemon/Color',
            (proxy, error) => {
                if (error) {
                    log(error.message);
                }
            }
        );

        this._settings = settings;
        this._appSystem = Shell.AppSystem.get_default();

        this._settings.connectObject(
            `changed::${SCREEN_BLANK}`,
            () => this._forceUpdate(),
            `changed::${FULLSCREEN_KEY}`,
            () => this._updateState(),
            `changed::${MPRIS_KEY}`,
            () => this._onMprisSettingChange(),
            `changed::${NIGHT_LIGHT_KEY}`,
            () => this._updateState(),
            `changed::${INHIBIT_APPS_KEY}`,
            () => this._updateState(),
            `changed::${TRIGGER_APPS_MODE}`,
            () => {
                this._disconnectTriggerSignals();
                this._connectTriggerSignals();
                this._updateState();
            }, this);

        global.display.connectObject('in-fullscreen-changed', () => this._updateState(), this);

        this._onMprisSettingChange();

        this._connectTriggerSignals();

        this._updateState();
    }

    _onMprisSettingChange() {
        const enable = this._settings.get_boolean(MPRIS_KEY);
        if (enable && !MprisPlayer.isActive) {
            MprisPlayer.Get().connectIsPlaying((_isPlaying) => this._updateState());
        } else {
            MprisPlayer.Destroy();
        }
        this._updateState();
    }

    _connectTriggerSignals() {
        switch (this._settings.get_enum(TRIGGER_APPS_MODE)) {
        case AppsTrigger.ON_RUNNING:
            this._appStateSignal = this._appSystem.connect('app-state-changed',
                () => this._updateState());
            break;
        case AppsTrigger.ON_FOCUS:
            this._focusWindowSignal = global.display.connect('notify::focus-window',
                () => this._updateState());
            break;
        case AppsTrigger.ON_ACTIVE_WORKSPACE:
            this._appStateSignal = this._appSystem.connect('app-state-changed',
                () => this._updateState());
            this._workspaceSignal = global.workspace_manager.connect('workspace-switched',
                () => this._updateState());
            this._restackedSignal = global.display.connect('restacked',
                () => this._updateState());
            break;
        }
    }

    _disconnectTriggerSignals() {
        if (this._appStateSignal !== null) {
            this._appSystem.disconnect(this._appStateSignal);
            this._appStateSignal = null;
        }
        if (this._focusWindowSignal !== null) {
            global.display.disconnect(this._focusWindowSignal);
            this._focusWindowSignal = null;
        }
        if (this._workspaceSignal !== null) {
            global.workspace_manager.disconnect(this._workspaceSignal);
            this._workspaceSignal = null;
        }
        if (this._restackedSignal !== null) {
            global.display.disconnect(this._restackedSignal);
            this._restackedSignal = null;
        }
    }

    _findRunningApp() {
        const possibleTriggerApps = this._settings.get_strv(INHIBIT_APPS_KEY);
        const runningApps = this._appSystem.get_running();

        for (const app of runningApps) {
            const appId = app.get_id();
            if (possibleTriggerApps.includes(appId)) {
                return appId;
            }
        }

        return null;
    }

    _findFocusedApp() {
        const possibleTriggerApps = this._settings.get_strv(INHIBIT_APPS_KEY);
        const focusedApp = Shell.WindowTracker.get_default().focus_app;
        if (focusedApp !== null) {
            const appId = focusedApp.get_id();
            if (possibleTriggerApps.includes(appId)) {
                return appId;
            }
        }

        return null;
    }

    _findActiveApp() {
        const possibleTriggerApps = this._settings.get_strv(INHIBIT_APPS_KEY);
        const activeWorkspace = global.workspace_manager.get_active_workspace();

        for (const appId of possibleTriggerApps) {
            const app = this._appSystem.lookup_app(appId);
            if (app !== null) {
                if (app.is_on_workspace(activeWorkspace)) {
                    return appId;
                }
            }
        }

        return null;
    }

    _getInhibitReasons() {
        const reasons = [];
        if (this.isFullscreen() && this._settings.get_boolean(FULLSCREEN_KEY)) {
            reasons.push('fullscreen');
        }

        if (MprisPlayer.isActive && MprisPlayer.Get().isPlaying) {
            reasons.push('mpris');
        }

        if (this._userEnabled) {
            reasons.push('user');
        }

        let triggerApp = null;
        if (this._settings.get_strv(INHIBIT_APPS_KEY).length !== 0) {
            switch (this._settings.get_enum(TRIGGER_APPS_MODE)) {
            case AppsTrigger.ON_RUNNING:
                triggerApp = this._findRunningApp();
                break;
            case AppsTrigger.ON_FOCUS:
                triggerApp = this._findFocusedApp();
                break;
            case AppsTrigger.ON_ACTIVE_WORKSPACE:
                triggerApp = this._findActiveApp();
                break;
            }
        }

        this._triggerApp = triggerApp;
        if (triggerApp !== null) {
            reasons.push('app');
        }

        return reasons;
    }

    _forceUpdate() {
        if (this._isInhibited) {
            this._removeInhibitor();
        }

        this._updateState();
    }

    _updateState() {
        let reasons = this._getInhibitReasons();

        this._ignoredReasons = this._ignoredReasons.filter(Set.prototype.has, new Set(reasons));

        reasons = reasons.filter((n) => !this._ignoredReasons.includes(n));
        this._lastReasons = [...reasons];
        const shouldInhibit = reasons.length !== 0;

        if (!reasons.includes('app')) {
            if (this._settings.get_enum(NIGHT_LIGHT_KEY) === ControlContext.FOR_APPS) {
                if (this._colorProxy.DisabledUntilTomorrow === true) {
                    this._tempManageLight = true;
                }
            }
        }

        if (this._isInhibited !== shouldInhibit) {
            if (shouldInhibit) {
                this._addInhibitor(reasons);
            } else {
                this._removeInhibitor();
            }
        }

        if (this.isNightLightManaged()) {
            if (shouldInhibit && !this._tempManageLight) {
                this._colorProxy.DisabledUntilTomorrow = true;
            } else {
                this._colorProxy.DisabledUntilTomorrow = false;
            }
        }

        this.emit('update');

        this._tempManageLight = false;
    }

    _addInhibitor(reasons) {
        let allowBlank = this._settings.get_enum(SCREEN_BLANK) === ControlContext.ALWAYS;
        if (reasons.includes('app')) {
            allowBlank = this._settings.get_enum(SCREEN_BLANK) > ControlContext.NEVER;
        }

        let inhibitFlags;
        if (allowBlank) {
            inhibitFlags = 4;
        } else {
            inhibitFlags = 8;
        }

        const params = [
            GLib.Variant.new_string('caffeine-gnome-extension'),
            GLib.Variant.new_uint32(0),
            GLib.Variant.new_string('Inhibited by Caffeine GNOME extension'),
            GLib.Variant.new_uint32(inhibitFlags)
        ];
        const paramsVariant = GLib.Variant.new_tuple(params);

        const cookieTuple = this._sessionManager.call_sync('Inhibit', paramsVariant,
            Gio.DBusCallFlags.NONE, -1, null);
        if (cookieTuple !== null) {
            this._inhibitorCookie = cookieTuple.get_child_value(0).get_uint32();
            this._isInhibited = true;
        } else {
            log('Failed to add inhibitor');
        }
    }

    _removeInhibitor() {
        if (this._isInhibited) {
            this._sessionManager.UninhibitRemote(this._inhibitorCookie);
            this._inhibitorCookie = null;
            this._isInhibited = false;
        }
    }

    isFullscreen() {
        const monitorCount = global.display.get_n_monitors();
        for (let i = 0; i < monitorCount; i++) {
            if (global.display.get_monitor_in_fullscreen(i)) {
                return true;
            }
        }

        return false;
    }

    isNightLightManaged() {
        if (this._tempManageLight) {
            return true;
        }

        let handleNightLight = this._settings.get_enum(NIGHT_LIGHT_KEY) === ControlContext.ALWAYS;
        if (this._lastReasons.includes('app')) {
            handleNightLight = this._settings.get_enum(NIGHT_LIGHT_KEY) > ControlContext.NEVER;
        }

        return handleNightLight;
    }

    getInhibitState() {
        return this._isInhibited;
    }

    getInhibitApp() {
        return this._triggerApp;
    }

    setUserEnabled(enabled) {
        this._userEnabled = enabled;
        if (!enabled) {
            this._ignoredReasons = this._getInhibitReasons();
        }

        this._updateState();
    }

    destroy() {
        this._disconnectTriggerSignals();
        global.display.disconnectObject(this);
        this._settings.disconnectObject(this);

        if (this._isInhibited) {
            this._removeInhibitor();
        }
    }
});

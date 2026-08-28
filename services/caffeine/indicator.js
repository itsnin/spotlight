// spotlight - caffeine quick settings indicator and toggle
// copied from caffeine extension v60
// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { PopupAnimation } from 'resource:///org/gnome/shell/ui/boxpointer.js';

import {
    InhibitorManager,
    ControlContext,
    ShowIndicator,
    INHIBIT_APPS_KEY,
    SHOW_INDICATOR_KEY,
    SHOW_NOTIFICATIONS_KEY,
    SHOW_TIMER_KEY,
    SHOW_TOGGLE_KEY,
    DURATION_TIMER_LIST,
    USER_ENABLED_KEY,
    RESTORE_KEY,
    FULLSCREEN_KEY,
    MPRIS_KEY,
    NIGHT_LIGHT_KEY,
    TOGGLE_SHORTCUT,
    TIMER_KEY,
    SCREEN_BLANK,
    TRIGGER_APPS_MODE,
    INDICATOR_POSITION,
    INDICATOR_INDEX,
    INDICATOR_POS_MAX,
    CLI_TOGGLE_KEY,
} from './inhibitorManager.js';
import { MprisPlayer } from './mprisMediaPlayer2.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;
const ShellVersion = parseFloat(Config.PACKAGE_VERSION);

const ActionsPath = '/icons/hicolor/scalable/actions/';
const DisabledIcon = 'my-caffeine-off-symbolic';
const EnabledIcon = 'my-caffeine-on-symbolic';
const TimerMenuIcon = 'stopwatch-symbolic';
const TimerIcons = [
    'caffeine-short-timer-symbolic',
    'caffeine-medium-timer-symbolic',
    'caffeine-long-timer-symbolic',
    'caffeine-infinite-timer-symbolic'
];

export const CaffeineToggle = GObject.registerClass({
    Signals: {
        'timer-clicked': {}
    }
}, class CaffeineToggle extends QuickSettings.QuickMenuToggle {
    _init(extension) {
        super._init({
            'title': 'Caffeine',
            toggleMode: false
        });

        this._settings = extension._settings;
        this._path = extension.path;
        this._ = extension._ || (s => s);

        this.finalTimerMenuIcon = TimerMenuIcon;
        this._iconActivated = Gio.ThemedIcon.new(EnabledIcon);
        this._iconDeactivated = Gio.ThemedIcon.new(DisabledIcon);
        this._iconTheme = new St.IconTheme();
        if (!this._iconTheme.has_icon(TimerMenuIcon)) {
            this.finalTimerMenuIcon =
                Gio.icon_new_for_string(`${this._path}${ActionsPath}${TimerMenuIcon}.svg`);
        }
        if (!this._iconTheme.has_icon(EnabledIcon)) {
            this._iconActivated = Gio.icon_new_for_string(`${this._path}${ActionsPath}${EnabledIcon}.svg`);
        }
        if (!this._iconTheme.has_icon(DisabledIcon)) {
            this._iconDeactivated = Gio.icon_new_for_string(`${this._path}${ActionsPath}${DisabledIcon}.svg`);
        }
        this.updateIcon();

        this.menu.setHeader(this.finalTimerMenuIcon, this._('Caffeine Timer'), null);

        this._itemsSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._itemsSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const settingsItem = this.menu.addAction(this._('Settings'), () => extension._openPreferences());

        settingsItem.visible = Main.sessionMode.allowSettings;
        this.menu._settingsActions[extension.uuid] = settingsItem;

        this._timerItems = new Map();
        this._syncTimers(false);

        this._settings.connectObject(
            `changed::${TIMER_KEY}`,
            () => this._sync(),
            `changed::${DURATION_TIMER_LIST}`,
            () => this._syncTimers(true),
            `changed::${SHOW_TOGGLE_KEY}`,
            () => {
                this.visible = this._settings.get_boolean(SHOW_TOGGLE_KEY);
            },
            this);
        this.connect('destroy', () => {
            this._iconActivated = null;
            this._iconDeactivated = null;
            this.gicon = null;
        });

        this.visible = this._settings.get_boolean(SHOW_TOGGLE_KEY);
    }

    _syncTimers(resetDefault) {
        this._itemsSection.removeAll();
        this._timerItems.clear();
        const durationValues = this._settings.get_value(DURATION_TIMER_LIST).deepUnpack();
        durationValues.push(0);

        for (const [index, timer] of durationValues.entries()) {
            let label = null;
            if (timer === 0) {
                label = this._('Infinite');
            } else {
                const hours = Math.floor(timer / 3600);
                const minutes = Math.floor((timer % 3600) / 60);
                switch (hours) {
                case 0:
                    break;
                case 1:
                    label = hours + this._(' hour ');
                    break;
                default:
                    label = hours + this._(' hours ');
                    break;
                }
                switch (minutes) {
                case 0:
                    break;
                case 1:
                    label = label + minutes + this._(' minute');
                    break;
                default:
                    label = label + minutes + this._(' minutes');
                    break;
                }
            }
            if (!label) {
                continue;
            }
            let icon = Gio.ThemedIcon.new(TimerIcons[index]);
            if (!this._iconTheme.has_icon(TimerIcons[index])) {
                icon = Gio.icon_new_for_string(`${this._path}${ActionsPath}${TimerIcons[index]}.svg`);
            }
            const item = new PopupMenu.PopupImageMenuItem(label, icon);
            item.connectObject('activate', () => this._checkTimer(timer), this);
            this._timerItems.set(timer, item);
            this._itemsSection.addMenuItem(item);
        }

        if (resetDefault && this._settings.get_int(TIMER_KEY) !== 0) {
            this._settings.set_int(TIMER_KEY, 0);
        } else {
            this._sync();
        }
    }

    _sync() {
        const activeTimerId = this._settings.get_int(TIMER_KEY);
        for (const [timerId, item] of this._timerItems) {
            item.setOrnament(timerId === activeTimerId
                ? PopupMenu.Ornament.CHECK
                : PopupMenu.Ornament.NONE);
        }
    }

    _checkTimer(timerId) {
        this._settings.set_int(TIMER_KEY, timerId);
        this.emit('timer-clicked');
    }

    updateIcon() {
        if (this.checked) {
            this.gicon = this._iconActivated;
        } else {
            this.gicon = this._iconDeactivated;
        }
    }
});

export const CaffeineIndicator = GObject.registerClass(
class CaffeineIndicator extends QuickSettings.SystemIndicator {
    _init(extension) {
        super._init();

        this._extension = extension;
        this._appSystem = Shell.AppSystem.get_default();
        this._indicator = this._addIndicator();
        this._settings = extension._settings;
        this._ = extension._ || (s => s);
        this._state = false;

        this._timerLabel = new St.Label({
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this._timerLabel.visible = false;
        this.add_child(this._timerLabel);

        this._iconActivated = Gio.ThemedIcon.new(EnabledIcon);
        this._iconDeactivated = Gio.ThemedIcon.new(DisabledIcon);
        this._iconTheme = new St.IconTheme();
        if (!this._iconTheme.has_icon(EnabledIcon)) {
            this._iconActivated = Gio.icon_new_for_string(`${extension.path}${ActionsPath}${EnabledIcon}.svg`);
        }
        if (!this._iconTheme.has_icon(DisabledIcon)) {
            this._iconDeactivated = Gio.icon_new_for_string(`${extension.path}${ActionsPath}${DisabledIcon}.svg`);
        }
        this._indicator.gicon = this._iconDeactivated;

        this._timeOut = null;
        this._timePrint = null;
        this._timerEnable = false;

        this._manageShowIndicator();

        this._caffeineToggle = new CaffeineToggle(extension);

        this.quickSettingsItems.push(this._caffeineToggle);
        this._updateTimerSubtitle();

        this._caffeineToggle.connectObject('clicked', () => this._handleToggleClick(), this);
        this._caffeineToggle.connectObject('timer-clicked', () => this._forceToggleClick(), this);

        this._settings.connectObject(
            `changed::${TIMER_KEY}`,
            () => this._startTimer(),
            `changed::${SHOW_TIMER_KEY}`,
            () => this._showIndicatorLabel(),
            `changed::${INDICATOR_POSITION}`,
            () => this._updateIndicatorPosition(),
            `changed::${SHOW_INDICATOR_KEY}`,
            () => {
                this._manageShowIndicator();
                this._showIndicatorLabel();
            },
            this);

        if (ShellVersion >= 46) {
            QuickSettingsMenu._indicators.connectObject(
                'child-added', () => this._updateMaxPosition(),
                'child-removed', () => this._updateMaxPosition(),
                this);
        } else {
            QuickSettingsMenu._indicators.connectObject(
                'actor-added', () => this._updateMaxPosition(),
                'actor-removed', () => this._updateMaxPosition(),
                this);
        }

        this._indicator.reactive = true;
        this._indicator.connectObject('scroll-event',
            (actor, event) => this._handleScrollEvent(event), this);

        this.indicatorPosition = this._settings.get_int(INDICATOR_POSITION);
        this.indicatorIndex = this._settings.get_int(INDICATOR_INDEX);
        this.lastIndicatorPosition = this.indicatorPosition;

        QuickSettingsMenu.addExternalIndicator(this);
        if (ShellVersion >= 46) {
            QuickSettingsMenu._indicators.remove_child(this);
        } else {
            QuickSettingsMenu._indicators.remove_actor(this);
        }
        QuickSettingsMenu._indicators.insert_child_at_index(this, this.indicatorIndex);

        this._inhibitorManager = new InhibitorManager(this._settings);
        this._inhibitorManager.connectObject('update', () => this._inhibitorUpdated(), this);

        if (this._settings.get_boolean(USER_ENABLED_KEY) &&
            this._settings.get_boolean(RESTORE_KEY)) {
            this._forceToggleClick();
        }

        this._settings.set_boolean(CLI_TOGGLE_KEY, this._state);
        this._settings.connectObject(
            `changed::${CLI_TOGGLE_KEY}`,
            () => this._commandStateChanged(),
            this);
    }

    _commandStateChanged() {
        const commandState = this._settings.get_boolean(CLI_TOGGLE_KEY);
        if (commandState === this._state) {
            return;
        }

        this._handleToggleClick();
    }

    _forceToggleClick() {
        this._state = false;
        this._handleToggleClick();
    }

    _handleToggleClick() {
        this._inhibitorManager.setUserEnabled(!this._state);
        this._settings.set_boolean(USER_ENABLED_KEY, this._state);

        if (this._state) {
            if (this._settings.get_int(TIMER_KEY) !== 0 && !this._timerEnable) {
                this._startTimer();
            }
        } else {
            this._removeTimer();
        }

        this._updateTimerSubtitle();
        this._updateMaxPosition();
    }

    _incrementIndicatorPosIndex() {
        if (this.lastIndicatorPosition < this.indicatorPosition) {
            this.indicatorIndex += 1;
        } else {
            this.indicatorIndex -= 1;
        }
    }

    _updateMaxPosition() {
        let pos = -1;
        const indicators = QuickSettingsMenu._indicators.get_children();

        indicators.forEach((indicator) => {
            if (indicator.is_visible()) {
                pos += 1;
            }
        });

        this._settings.set_int(INDICATOR_POS_MAX, pos);
    }

    _updateIndicatorPosition() {
        const newPosition = this._settings.get_int(INDICATOR_POSITION);

        if (this.indicatorPosition !== newPosition) {
            this.indicatorPosition = newPosition;
            this._incrementIndicatorPosIndex();

            let targetIndicator =
                QuickSettingsMenu._indicators.get_child_at_index(this.indicatorIndex);
            const maxIndex = QuickSettingsMenu._indicators.get_n_children();
            while (this.indicatorIndex < maxIndex && !targetIndicator.is_visible() &&
                   this.indicatorIndex > -1) {
                this._incrementIndicatorPosIndex();
                targetIndicator =
                    QuickSettingsMenu._indicators.get_child_at_index(this.indicatorIndex);
            }

            if (this.indicatorPosition === 0) {
                this.indicatorIndex = 0;
            }

            this.lastIndicatorPosition = newPosition;

            if (ShellVersion >= 46) {
                QuickSettingsMenu._indicators.remove_child(this);
            } else {
                QuickSettingsMenu._indicators.remove_actor(this);
            }
            QuickSettingsMenu._indicators.insert_child_at_index(this, this.indicatorIndex);
            this._settings.set_int(INDICATOR_INDEX, this.indicatorIndex);
        }
        this._updateMaxPosition();
    }

    _showIndicatorLabel() {
        if (this._settings.get_boolean(SHOW_TIMER_KEY) &&
           (this._settings.get_enum(SHOW_INDICATOR_KEY) !== ShowIndicator.NEVER) &&
            this._timerEnable) {
            this._timerLabel.visible = true;
        } else {
            this._timerLabel.visible = false;
        }
    }

    _startTimer() {
        this._removeTimer();
        this._timerEnable = true;

        const timerDelay = this._settings.get_int(TIMER_KEY);

        if (timerDelay !== 0) {
            let secondLeft = timerDelay;
            this._showIndicatorLabel();
            this._printTimer(secondLeft);
            this._timePrint = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                secondLeft -= 1;
                this._printTimer(secondLeft);
                return GLib.SOURCE_CONTINUE;
            });

            this._timeOut = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timerDelay * 1000, () => {
                this._removeTimer();
                if (this._state) {
                    this._handleToggleClick();
                }
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _printTimer(seconds) {
        const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const min = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        if (hours !== '00') {
            this._updateLabelTimer(hours + ':' + min + ':' + sec);
        } else {
            this._updateLabelTimer(min + ':' + sec);
        }
    }

    _removeTimer() {
        this._timerEnable = false;

        this._updateLabelTimer(null);
        this._timerLabel.visible = false;

        if ((this._timeOut !== null) || (this._timePrint !== null)) {
            GLib.Source.remove(this._timeOut);
            GLib.Source.remove(this._timePrint);
            this._timeOut = null;
            this._timePrint = null;
        }
    }

    _updateLabelTimer(text) {
        this._timerLabel.text = text;
        this._caffeineToggle.menu.setHeader(this._caffeineToggle.finalTimerMenuIcon,
            this._('Caffeine Timer'), text);
        this._caffeineToggle.subtitle = text;
    }

    _handleScrollEvent(event) {
        let scrollDirection = event.get_scroll_direction();
        if (ShellVersion >= 49) {
            if (event.get_scroll_flags() & Clutter.ScrollFlags.INVERTED) {
                switch (scrollDirection) {
                case Clutter.ScrollDirection.UP:
                    scrollDirection = Clutter.ScrollDirection.DOWN;
                    break;
                case Clutter.ScrollDirection.DOWN:
                    scrollDirection = Clutter.ScrollDirection.UP;
                    break;
                }
            }
        }

        switch (scrollDirection) {
        case Clutter.ScrollDirection.UP:
            if (!this._state) {
                this._handleToggleClick();
            }
            break;
        case Clutter.ScrollDirection.DOWN:
            if (this._state) {
                this._removeTimer();
                this._handleToggleClick();
            }
            break;
        }
    }

    _inhibitorUpdated() {
        const oldState = this._state;
        this._state = this._inhibitorManager.getInhibitState();

        this._settings.set_boolean(CLI_TOGGLE_KEY, this._state);

        this._caffeineToggle.checked = this._state;
        this._caffeineToggle.updateIcon();
        this._updateAppSubtitle(this._inhibitorManager.getInhibitApp());

        if (this._state !== oldState) {
            if (this._settings.get_boolean(SHOW_NOTIFICATIONS_KEY) &&
                !this._inhibitorManager.isFullscreen()) {
                this._sendOSDNotification(this._state);
            }
        }

        this._manageShowIndicator();
        this._updateTimerSubtitle();
    }

    _manageShowIndicator() {
        if (this._state) {
            this._indicator.visible = this._settings.get_enum(SHOW_INDICATOR_KEY) !== ShowIndicator.NEVER;
            this._indicator.gicon = this._iconActivated;
        } else {
            this._indicator.visible = this._settings.get_enum(SHOW_INDICATOR_KEY) === ShowIndicator.ALWAYS;
            this._indicator.gicon = this._iconDeactivated;
        }
    }

    _sendOSDNotification(state) {
        let message = this._('Caffeine enabled');
        let icon = this._iconActivated;
        if (!state) {
            message = this._('Caffeine disabled');
            icon = this._iconDeactivated;
        }

        if (this._inhibitorManager.isNightLightManaged()) {
            if (state) {
                message = message + '. ' + this._('Night Light paused');
            } else {
                message = message + '. ' + this._('Night Light resumed');
            }
        }

        if (ShellVersion >= 49) {
            Main.osdWindowManager.showAll(icon, message, null, null);
        } else {
            Main.osdWindowManager.show(-1, icon, message, null, null);
        }
    }

    _updateAppSubtitle(appId) {
        if (appId === null) {
            this._caffeineToggle.subtitle = null;
            return;
        }

        const app = this._appSystem.lookup_app(appId);
        if (app === null) {
            this._caffeineToggle.subtitle = null;
            return;
        }

        this._caffeineToggle.subtitle = app.get_name();
    }

    _updateTimerSubtitle() {
        if (!this._state) {
            const timerDuration = this._settings.get_int(TIMER_KEY);
            const hours = Math.floor(timerDuration / 3600);
            const min = Math.floor((timerDuration % 3600) / 60);
            let timeLabel = '';
            switch (hours) {
            case 0:
                break;
            case 1:
                timeLabel = hours + this._(' hour ');
                break;
            default:
                timeLabel = hours + this._(' hours ');
                break;
            }
            switch (min) {
            case 0:
                break;
            case 1:
                timeLabel += min + this._(' minute ');
                break;
            default:
                timeLabel += min + this._(' minutes ');
                break;
            }
            this._caffeineToggle.subtitle = timerDuration !== 0
                ? timeLabel
                : null;
        }
    }

    destroy() {
        this.quickSettingsItems.forEach((item) => item.destroy());

        if (this._timeOut) {
            GLib.Source.remove(this._timeOut);
            this._timeOut = null;
        }
        if (this._timePrint) {
            GLib.Source.remove(this._timePrint);
            this._timePrint = null;
        }

        MprisPlayer.Destroy();
        this._inhibitorManager.destroy();
        this._inhibitorManager = null;

        this._settings = null;
        super.destroy();
    }
});

// spotlight - caffeine display preferences page
// copied from caffeine extension v60
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { SettingsKey } from './settingsKeys.js';

export var DisplayPage = GObject.registerClass(
class CaffeineDisplayPage extends Adw.PreferencesPage {
    _init(settings, settingsKey) {
        super._init({
            title: _('Display'),
            icon_name: 'video-display-symbolic',
            name: 'CaffeineDisplayPage'
        });
        this._settings = settings;
        this._settingsKey = settingsKey;

        const displayGroup = new Adw.PreferencesGroup({
            title: _('Display')
        });

        const showStatusIndicator = new Gtk.StringList();
        showStatusIndicator.append(_('Only when active'));
        showStatusIndicator.append(_('Always'));
        showStatusIndicator.append(_('Never'));
        const showStatusIndicatorRow = new Adw.ComboRow({
            title: _('Show status indicator in top panel'),
            subtitle: _('Enable or disable the Caffeine icon in the top panel'),
            model: showStatusIndicator,
            selected: this._settings.get_enum(this._settingsKey.SHOW_INDICATOR)
        });

        const showTimerRow = new Adw.SwitchRow({
            title: _('Show timer in top panel'),
            subtitle: _('Enable or disable the timer in the top panel'),
            active: this._settings.get_boolean(this._settingsKey.SHOW_TIMER)
        });

        const showToggleRow = new Adw.SwitchRow({
            title: _('Show quick settings toggle'),
            subtitle: _('Enable or disable the toggle in the quick settings menu'),
            active: this._settings.get_boolean(this._settingsKey.SHOW_TOGGLE)
        });

        const notificationRow = new Adw.SwitchRow({
            title: _('Notifications'),
            subtitle: _('Enable notifications when Caffeine is enabled or disabled'),
            active: this._settings.get_boolean(this._settingsKey.SHOW_NOTIFICATIONS)
        });

        this.lastIndicatorPos = this._settings.get_int(this._settingsKey.INDICATOR_POS_MAX);
        this.posIndicatorOffsetRow = new Adw.SpinRow({
            title: _('Status indicator position'),
            subtitle: _('The position relative of indicator icon to other items'),
            adjustment: new Gtk.Adjustment({
                lower: -1,
                upper: this.lastIndicatorPos,
                step_increment: 1,
                page_increment: 1,
                page_size: 0,
                value: this._settings.get_int(this._settingsKey.INDICATOR_POSITION)
            })
        });

        displayGroup.add(showStatusIndicatorRow);
        displayGroup.add(showTimerRow);
        displayGroup.add(showToggleRow);
        displayGroup.add(notificationRow);
        displayGroup.add(this.posIndicatorOffsetRow);
        this.add(displayGroup);

        showStatusIndicatorRow.connect('notify::selected', (widget) => {
            if (widget.selected === 2) {
                showTimerRow.set_sensitive(false);
            } else {
                showTimerRow.set_sensitive(true);
            }
            this._settings.set_enum(this._settingsKey.SHOW_INDICATOR, widget.selected);
        });
        showTimerRow.connect('notify::active', (widget) => {
            this._settings.set_boolean(this._settingsKey.SHOW_TIMER, widget.get_active());
        });
        showToggleRow.connect('notify::active', (widget) => {
            this._settings.set_boolean(this._settingsKey.SHOW_TOGGLE, widget.get_active());
        });
        notificationRow.connect('notify::active', (widget) => {
            this._settings.set_boolean(this._settingsKey.SHOW_NOTIFICATIONS, widget.get_active());
        });
        this._settings.bind(this._settingsKey.INDICATOR_POSITION,
            this.posIndicatorOffsetRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        this._settings.connect(`changed::${this._settingsKey.INDICATOR_POS_MAX}`, this._updatePosMax.bind(this));
    }

    _updatePosMax() {
        this.lastIndicatorPos = this._settings.get_int(this._settingsKey.INDICATOR_POS_MAX);
        this.posIndicatorOffsetRow.adjustment.set_upper(this.lastIndicatorPos);
    }
});

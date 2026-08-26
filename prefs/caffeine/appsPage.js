// spotlight - caffeine apps preferences page
// copied from caffeine extension v60
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { SettingsKey } from './settingsKeys.js';

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';
const ShellVersion = parseFloat(Config.PACKAGE_VERSION);

let GioUnix;
try {
    GioUnix = (await import('gi://GioUnix?version=2.0')).default;
} catch {}

export var AppsPage = GObject.registerClass(
class CaffeineAppsPage extends Adw.PreferencesPage {
    _init(settings, settingsKey) {
        super._init({
            title: _('Apps'),
            icon_name: 'applications-symbolic',
            name: 'CaffeineAppsPage'
        });
        this._settingsKey = settingsKey;
        this._settings = settings;
        this._listApps = [];

        const appsBehaviorGroup = new Adw.PreferencesGroup({
            title: _('Trigger mode')
        });

        const appsTriggerMode = new Gtk.StringList();
        appsTriggerMode.append(_('Running'));
        appsTriggerMode.append(_('Focus'));
        appsTriggerMode.append(_('Active workspace'));
        const appsTriggerModeRow = new Adw.ComboRow({
            title: _('Apps trigger Caffeine mode'),
            subtitle: _('Choose the way apps will trigger Caffeine'),
            model: appsTriggerMode,
            selected: this._settings.get_enum(this._settingsKey.TRIGGER_APPS_MODE)
        });

        appsBehaviorGroup.add(appsTriggerModeRow);
        this.add(appsBehaviorGroup);

        const addAppsButton = new Gtk.Button({
            child: new Adw.ButtonContent({
                icon_name: 'list-add-symbolic',
                label: _('Add')
            })
        });
        this.appsGroup = new Adw.PreferencesGroup({
            title: _('Apps that trigger Caffeine'),
            header_suffix: addAppsButton
        });

        this._refreshApps();

        this.add(this.appsGroup);

        addAppsButton.connect('clicked', this._onAddApp.bind(this));
        appsTriggerModeRow.connect('notify::selected', (widget) => {
            this._settings.set_enum(this._settingsKey.TRIGGER_APPS_MODE, widget.selected);
        });
    }

    _refreshApps() {
        const _apps = this._settings.get_strv(this._settingsKey.INHIBIT_APPS);

        this._listApps.length = 0;

        _apps.forEach((id) => {
            let appInfo = null;
            if (ShellVersion >= 49) {
                appInfo = GioUnix.DesktopAppInfo.new(id);
            } else {
                appInfo = Gio.DesktopAppInfo.new(id);
            }

            if (appInfo) {
                this._listApps.push(id);
            }
        });

        if (this._appsListUi !== this._listApps) {
            if (this._count) {
                for (let i = 0; i < this._count; i++) {
                    this.appsGroup.remove(this.apps[i].Row);
                }
                this._count = null;
            }

            if (this._listApps.length > 0) {
                this.apps = {};

                for (const i in this._listApps) {
                    this.apps[i] = {};
                    this.apps[i].ButtonBox = new Gtk.Box({
                        orientation: Gtk.Orientation.HORIZONTAL,
                        halign: Gtk.Align.CENTER,
                        spacing: 5,
                        hexpand: false,
                        vexpand: false
                    });
                    this.apps[i].DeleteButton = new Gtk.Button({
                        icon_name: 'edit-delete-symbolic',
                        valign: Gtk.Align.CENTER,
                        css_classes: ['error'],
                        hexpand: false,
                        vexpand: false
                    });

                    let appInfo = null;
                    if (ShellVersion >= 49) {
                        appInfo = GioUnix.DesktopAppInfo.new(this._listApps[i]);
                    } else {
                        appInfo = Gio.DesktopAppInfo.new(this._listApps[i]);
                    }
                    const appIcon = new Gtk.Image({
                        gicon: appInfo.get_icon(),
                        pixel_size: 32
                    });
                    appIcon.get_style_context().add_class('icon-dropshadow');
                    this.apps[i].Row = new Adw.ActionRow({
                        title: appInfo.get_display_name(),
                        subtitle: this._listApps[i].replace('.desktop', ''),
                        activatable: true
                    });

                    this.apps[i].Row.add_prefix(appIcon);
                    this.apps[i].ButtonBox.append(this.apps[i].DeleteButton);
                    this.apps[i].Row.add_suffix(this.apps[i].ButtonBox);
                    this.appsGroup.add(this.apps[i].Row);
                }
                for (const i in this.apps) {
                    this.apps[i].DeleteButton.connect('clicked', () => {
                        this._onRemoveApp(this._listApps[i]);
                    });
                }
                this._count = this._listApps.length;
            }
            this._appsListUi = [...this._listApps];
        }
        return 0;
    }

    _onAddApp() {
        const dialog = new NewAppDialog(this.get_root(), this._settings, this._settingsKey);
        dialog.connect('response', (dlg, id) => {
            const appInfo = id === Gtk.ResponseType.OK
                ? dialog.get_widget().get_app_info() : null;
            const apps = this._settings.get_strv(this._settingsKey.INHIBIT_APPS);
            if (appInfo && !apps.some((a) => a === appInfo.get_id())) {
                this._settings.set_strv(this._settingsKey.INHIBIT_APPS, [
                    ...apps, appInfo.get_id()
                ]);
                this._refreshApps();
            }
            dialog.destroy();
        });
        dialog.show();
    }

    _onRemoveApp(appId) {
        this._settings.set_strv(this._settingsKey.INHIBIT_APPS,
            this._settings.get_strv(this._settingsKey.INHIBIT_APPS).filter((id) => {
                return id !== appId;
            })
        );
        this._refreshApps();
    }
});

const NewAppDialog = GObject.registerClass(
    class NewAppDialog extends Gtk.AppChooserDialog {
        _init(parent, settings, settingsKey) {
            super._init({
                transient_for: parent,
                modal: true
            });

            this._settings = settings;
            this._settingsKey = settingsKey;

            this.get_widget().set({
                show_all: true,
                show_other: true
            });

            this.get_widget().connect('application-selected',
                this._updateSensitivity.bind(this));
            this._updateSensitivity();
        }

        _updateSensitivity() {
            const apps = this._settings.get_strv(this._settingsKey.INHIBIT_APPS);
            const appInfo = this.get_widget().get_app_info();
            this.set_response_sensitive(Gtk.ResponseType.OK,
                appInfo && !apps.some((i) => i.startsWith(appInfo.get_id())));
        }
    });

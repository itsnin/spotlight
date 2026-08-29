// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';

/**
 * Wraps a Gio.Settings object to transparently prefix all key names.
 * Used to merge multiple logical feature schemas into a single physical schema.
 */
export class PrefixedSettings {
    constructor(settings, prefix) {
        this._settings = settings;
        this._prefix = prefix;
    }

    /**
     * Returns the underlying raw Gio.Settings instance.
     * Use only when a real GObject is required (e.g. Main.wm.addKeybinding).
     * For normal get/set/connect operations, use the wrapper methods directly.
     */
    getRawSettings() {
        return this._settings;
    }

    _k(key) {
        return this._prefix + key;
    }

    get_boolean(key) { return this._settings.get_boolean(this._k(key)); }
    set_boolean(key, val) { return this._settings.set_boolean(this._k(key), val); }
    get_int(key) { return this._settings.get_int(this._k(key)); }
    set_int(key, val) { return this._settings.set_int(this._k(key), val); }
    get_string(key) { return this._settings.get_string(this._k(key)); }
    set_string(key, val) { return this._settings.set_string(this._k(key), val); }
    get_strv(key) { return this._settings.get_strv(this._k(key)); }
    set_strv(key, val) { return this._settings.set_strv(this._k(key), val); }
    get_value(key) { return this._settings.get_value(this._k(key)); }
    set_value(key, val) { return this._settings.set_value(this._k(key), val); }
    get_default_value(key) { return this._settings.get_default_value(this._k(key)); }
    get_user_value(key) { return this._settings.get_user_value(this._k(key)); }
    reset(key) { return this._settings.reset(this._k(key)); }
    has_key(key) { return this._settings.has_key(this._k(key)); }

    connect(name, callback) {
        if (name.startsWith('changed::')) {
            const key = name.slice('changed::'.length);
            return this._settings.connect(`changed::${this._k(key)}`, callback);
        }
        return this._settings.connect(name, callback);
    }

    disconnect(id) {
        return this._settings.disconnect(id);
    }

    bind(key, object, property, flags) {
        return this._settings.bind(this._k(key), object, property, flags);
    }
}

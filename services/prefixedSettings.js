// spotlight - wraps Gio.Settings with a key prefix
// SPDX-License-Identifier: GPL-3.0-or-later
// Used to pass our spotlight schema to upstream code that expects unprefixed
// key names. e.g. upstream code calls get_int('history-size') and we transparently
// map it to 'clipboard-history-size' in our schema.

export class PrefixedSettings {
    constructor(settings, prefix) {
        this._settings = settings;
        this._prefix = prefix;
    }

    _key(name) {
        return this._prefix + name;
    }

    get_int(name) { return this._settings.get_int(this._key(name)); }
    set_int(name, val) { this._settings.set_int(this._key(name), val); }
    get_boolean(name) { return this._settings.get_boolean(this._key(name)); }
    set_boolean(name, val) { this._settings.set_boolean(this._key(name), val); }
    get_string(name) { return this._settings.get_string(this._key(name)); }
    set_string(name, val) { this._settings.set_string(this._key(name), val); }
    get_strv(name) { return this._settings.get_strv(this._key(name)); }
    set_strv(name, val) { this._settings.set_strv(this._key(name), val); }
    get_enum(name) { return this._settings.get_enum(this._key(name)); }
    set_enum(name, val) { this._settings.set_enum(this._key(name), val); }
    get_value(name) { return this._settings.get_value(this._key(name)); }
    set_value(name, val) { this._settings.set_value(this._key(name), val); }

    bind(name, object, property, flags) {
        return this._settings.bind(this._key(name), object, property, flags);
    }

    connect(name, cb) {
        return this._settings.connect('changed::' + this._key(name), cb);
    }

    disconnect(id) {
        this._settings.disconnect(id);
    }

    // connectObject / disconnectObject: delegate to underlying settings
    // but translate signal names. This is tricky because the callback
    // receives the raw settings object. For simplicity, we support
    // listening to 'changed' (all changes) which upstream uses.
    connectObject(...args) {
        // args: [signal1, cb1, signal2, cb2, ..., object]
        // Translate 'changed::key' signals to prefixed versions
        const translated = [];
        for (let i = 0; i < args.length - 1; i += 2) {
            let signal = args[i];
            const cb = args[i + 1];
            if (signal.startsWith('changed::')) {
                signal = 'changed::' + this._prefix + signal.slice(9);
            }
            translated.push(signal, cb);
        }
        translated.push(args[args.length - 1]); // the object
        return this._settings.connectObject(...translated);
    }

    disconnectObject(obj) {
        return this._settings.disconnectObject(obj);
    }
}

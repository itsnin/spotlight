import Gio from 'gi://Gio';

/**
 * Wraps a Gio.Settings object to transparently prefix all key names.
 * Used to merge multiple logical schemas into a single physical schema.
 */
export class PrefixedSettings {
    constructor(settings, prefix) {
        this._settings = settings;
        this._prefix = prefix;
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
    list_keys() { return this._settings.list_keys().filter(k => k.startsWith(this._prefix)).map(k => k.slice(this._prefix.length)); }

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

export class Settings {
    static _instance;
    static _extension;
    static init(extension) {
        Settings._extension = extension;
        Settings._instance = new Settings();
        Settings._instance.init();
    }
    static destroy() {
        Settings._instance?.destroy();
        Settings._instance = null;
    }
    static getInstance() {
        return Settings._instance;
    }
    const _baseSettings = Settings._extension.getSettings(Settings._extension.metadata['settings-schema']);
    state = new PrefixedSettings(_baseSettings, 'space-bar-state-');
    behaviorSettings = new PrefixedSettings(_baseSettings, 'space-bar-behavior-');
    appearanceSettings = new PrefixedSettings(_baseSettings, 'space-bar-appearance-');
    shortcutsSettings = new PrefixedSettings(_baseSettings, 'space-bar-shortcuts-');
    mutterSettings = new Gio.Settings({ schema: 'org.gnome.mutter' });
    wmPreferencesSettings = new Gio.Settings({
        schema: 'org.gnome.desktop.wm.preferences',
    });
    _version = SettingsSubject.createIntSubject(this.state, 'version');
    workspaceNamesMap = SettingsSubject.createJsonObjectSubject(this.state, 'workspace-names-map');
    dynamicWorkspaces = SettingsSubject.createBooleanSubject(this.mutterSettings, 'dynamic-workspaces');
    indicatorStyle = SettingsSubject.createStringSubject(this.behaviorSettings, 'indicator-style');
    enableCustomLabel = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'enable-custom-label');
    enableCustomLabelInMenus = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'enable-custom-label-in-menu');
    customLabelNamed = SettingsSubject.createStringSubject(this.behaviorSettings, 'custom-label-named');
    customLabelUnnamed = SettingsSubject.createStringSubject(this.behaviorSettings, 'custom-label-unnamed');
    position = SettingsSubject.createStringSubject(this.behaviorSettings, 'position');
    systemWorkspaceIndicator = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'system-workspace-indicator');
    positionIndex = SettingsSubject.createIntSubject(this.behaviorSettings, 'position-index');
    scrollWheel = SettingsSubject.createStringSubject(this.behaviorSettings, 'scroll-wheel');
    scrollWheelDebounce = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'scroll-wheel-debounce');
    scrollWheelDebounceTime = SettingsSubject.createIntSubject(this.behaviorSettings, 'scroll-wheel-debounce-time');
    scrollWheelVertical = SettingsSubject.createStringSubject(this.behaviorSettings, 'scroll-wheel-vertical');
    scrollWheelHorizontal = SettingsSubject.createStringSubject(this.behaviorSettings, 'scroll-wheel-horizontal');
    scrollWheelWrapAround = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'scroll-wheel-wrap-around');
    alwaysShowNumbers = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'always-show-numbers');
    showEmptyWorkspaces = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'show-empty-workspaces');
    toggleOverview = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'toggle-overview');
    smartWorkspaceNames = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'smart-workspace-names');
    reevaluateSmartWorkspaceNames = SettingsSubject.createBooleanSubject(this.behaviorSettings, 'reevaluate-smart-workspace-names');
    enableActivateWorkspaceShortcuts = SettingsSubject.createBooleanSubject(this.shortcutsSettings, 'enable-activate-workspace-shortcuts');
    backAndForth = SettingsSubject.createBooleanSubject(this.shortcutsSettings, 'back-and-forth');
    enableMoveToWorkspaceShortcuts = SettingsSubject.createBooleanSubject(this.shortcutsSettings, 'enable-move-to-workspace-shortcuts');
    workspaceNames = SettingsSubject.createStringArraySubject(this.wmPreferencesSettings, 'workspace-names');
    workspacesBarPadding = SettingsSubject.createIntSubject(this.appearanceSettings, 'workspaces-bar-padding');
    workspaceMargin = SettingsSubject.createIntSubject(this.appearanceSettings, 'workspace-margin');
    activeWorkspaceBackgroundColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'active-workspace-background-color');
    activeWorkspaceTextColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'active-workspace-text-color');
    activeWorkspaceBorderColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'active-workspace-border-color');
    activeWorkspaceFontSize = SettingsSubject.createIntSubject(this.appearanceSettings, 'active-workspace-font-size');
    activeWorkspaceFontWeight = SettingsSubject.createStringSubject(this.appearanceSettings, 'active-workspace-font-weight');
    activeWorkspaceBorderRadius = SettingsSubject.createIntSubject(this.appearanceSettings, 'active-workspace-border-radius');
    activeWorkspaceBorderWidth = SettingsSubject.createIntSubject(this.appearanceSettings, 'active-workspace-border-width');
    activeWorkspacePaddingH = SettingsSubject.createIntSubject(this.appearanceSettings, 'active-workspace-padding-h');
    activeWorkspacePaddingV = SettingsSubject.createIntSubject(this.appearanceSettings, 'active-workspace-padding-v');
    inactiveWorkspaceBackgroundColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'inactive-workspace-background-color');
    inactiveWorkspaceTextColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'inactive-workspace-text-color');
    inactiveWorkspaceBorderColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'inactive-workspace-border-color');
    inactiveWorkspaceFontSize = SettingsSubject.createIntSubject(this.appearanceSettings, 'inactive-workspace-font-size');
    inactiveWorkspaceFontWeight = SettingsSubject.createStringSubject(this.appearanceSettings, 'inactive-workspace-font-weight');
    inactiveWorkspaceBorderRadius = SettingsSubject.createIntSubject(this.appearanceSettings, 'inactive-workspace-border-radius');
    inactiveWorkspaceBorderWidth = SettingsSubject.createIntSubject(this.appearanceSettings, 'inactive-workspace-border-width');
    inactiveWorkspacePaddingH = SettingsSubject.createIntSubject(this.appearanceSettings, 'inactive-workspace-padding-h');
    inactiveWorkspacePaddingV = SettingsSubject.createIntSubject(this.appearanceSettings, 'inactive-workspace-padding-v');
    emptyWorkspaceBackgroundColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'empty-workspace-background-color');
    emptyWorkspaceTextColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'empty-workspace-text-color');
    emptyWorkspaceBorderColor = SettingsSubject.createStringSubject(this.appearanceSettings, 'empty-workspace-border-color');
    emptyWorkspaceFontSize = SettingsSubject.createIntSubject(this.appearanceSettings, 'empty-workspace-font-size');
    emptyWorkspaceFontWeight = SettingsSubject.createStringSubject(this.appearanceSettings, 'empty-workspace-font-weight');
    emptyWorkspaceBorderRadius = SettingsSubject.createIntSubject(this.appearanceSettings, 'empty-workspace-border-radius');
    emptyWorkspaceBorderWidth = SettingsSubject.createIntSubject(this.appearanceSettings, 'empty-workspace-border-width');
    emptyWorkspacePaddingH = SettingsSubject.createIntSubject(this.appearanceSettings, 'empty-workspace-padding-h');
    emptyWorkspacePaddingV = SettingsSubject.createIntSubject(this.appearanceSettings, 'empty-workspace-padding-v');
    applicationStyles = SettingsSubject.createStringSubject(this.appearanceSettings, 'application-styles');
    customStylesEnabled = SettingsSubject.createBooleanSubject(this.appearanceSettings, 'custom-styles-enabled');
    customStylesFailed = SettingsSubject.createBooleanSubject(this.appearanceSettings, 'custom-styles-failed');
    customStyles = SettingsSubject.createStringSubject(this.appearanceSettings, 'custom-styles');
    init() {
        SettingsSubject.initAll();
        this.runMigrations();
    }
    destroy() {
        SettingsSubject.destroyAll();
    }
    /**
     * Migrates preferences from previous space-bar versions.
     */
    runMigrations() {
        if (this._version.value < 26) {
            if (this.indicatorStyle.value === 'current-workspace-name') {
                this.indicatorStyle.value = 'current-workspace';
            }
        }
        this._version.value = Settings._extension.metadata['version'];
    }
}
class SettingsSubject {
    _settings;
    _name;
    _type;
    static _subjects = [];
    static createBooleanSubject(settings, name) {
        return new SettingsSubject(settings, name, 'boolean');
    }
    static createIntSubject(settings, name) {
        return new SettingsSubject(settings, name, 'int');
    }
    static createStringSubject(settings, name) {
        return new SettingsSubject(settings, name, 'string');
    }
    static createStringArraySubject(settings, name) {
        return new SettingsSubject(settings, name, 'string-array');
    }
    static createJsonObjectSubject(settings, name) {
        return new SettingsSubject(settings, name, 'json-object');
    }
    static initAll() {
        for (const subject of SettingsSubject._subjects) {
            subject._init();
        }
    }
    static destroyAll() {
        for (const subject of SettingsSubject._subjects) {
            subject._destroy();
        }
        SettingsSubject._subjects = [];
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this._setValue(value);
    }
    _value;
    _subscribers = [];
    _getValue;
    _setValue;
    _disconnect;
    constructor(_settings, _name, _type) {
        this._settings = _settings;
        this._name = _name;
        this._type = _type;
        SettingsSubject._subjects.push(this);
    }
    subscribe(subscriber, { emitCurrentValue = false } = {}) {
        this._subscribers.push(subscriber);
        if (emitCurrentValue) {
            subscriber(this._value);
        }
    }
    _init() {
        this._getValue = () => {
            switch (this._type) {
                case 'boolean':
                    return this._settings.get_boolean(this._name);
                case 'int':
                    return this._settings.get_int(this._name);
                case 'string':
                    return this._settings.get_string(this._name);
                case 'string-array':
                    return this._settings.get_strv(this._name);
                case 'json-object':
                    return JSON.parse(this._settings.get_string(this._name));
                default:
                    throw new Error('unknown type ' + this._type);
            }
        };
        this._setValue = (value) => {
            switch (this._type) {
                case 'boolean':
                    return this._settings.set_boolean(this._name, value);
                case 'int':
                    return this._settings.set_int(this._name, value);
                case 'string':
                    return this._settings.set_string(this._name, value);
                case 'string-array':
                    return this._settings.set_strv(this._name, value);
                case 'json-object':
                    return this._settings.set_string(this._name, JSON.stringify(value));
                default:
                    throw new Error('unknown type ' + this._type);
            }
        };
        this._value = this._getValue();
        const changed = this._settings.connect(`changed::${this._name}`, () => this._updateValue(this._getValue()));
        this._disconnect = () => this._settings.disconnect(changed);
    }
    _destroy() {
        this._disconnect();
        this._subscribers = [];
    }
    _updateValue(value) {
        this._value = value;
        this._notifySubscriber();
    }
    _notifySubscriber() {
        for (const subscriber of this._subscribers) {
            subscriber(this._value);
        }
    }
}

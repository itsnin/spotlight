import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { DefaultColors, getDataPath } from '../common/constants.js';
import { enumParamSpec, registerClass } from '../common/gjs.js';
import { ColorScheme, CustomColorScheme, Theme } from '../common/settings.js';

var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return (c > 3 && r && Object.defineProperty(target, key, r), r);
	};

Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_async');
let ThemeManager = class ThemeManager extends GObject.Object {
	ext;
	_resource;
	_themeSettings;
	_settings;
	_contrastChangedId;
	_colorSchemeChangedId;
	_stylesheet = null;
	_colorScheme = CustomColorScheme.Dark;

	constructor(ext) {
		super();
		this.ext = ext;
		this._resource = Gio.resource_load(`${this.ext.path}/theme.gresource`);
		Gio.resources_register(this._resource);
		this._themeSettings = this.ext.settings.get_child('theme');
		this._themeSettings.connectObject('changed', this.updateTheme.bind(this), this);
		this._settings = St.Settings.get();
		this._contrastChangedId = this._settings.connect('notify::high-contrast', this.updateTheme.bind(this));
		this._colorSchemeChangedId = this._settings.connect('notify::color-scheme', this.updateTheme.bind(this));
		this.updateTheme().catch(() => {});
	}

	get theme() {
		return St.ThemeContext.get_for_stage(global.stage).get_theme();
	}

	get colorScheme() {
		return this._colorScheme;
	}

	set colorScheme(scheme) {
		if (scheme === this._colorScheme) return;
		this._colorScheme = scheme;
		this.notify('color-scheme');
	}

	destroy() {
		if (this._stylesheet) this.theme.unload_stylesheet(this._stylesheet);
		this._stylesheet = null;
		Gio.resources_unregister(this._resource);
		this._themeSettings.disconnectObject(this);
		this._settings.disconnect(this._contrastChangedId);
		this._settings.disconnect(this._colorSchemeChangedId);
	}

	async updateTheme() {
		let theme = this._themeSettings.get_enum('theme');
		this.colorScheme = (() => {
			if (theme === Theme.Custom) {
				return this._themeSettings.get_enum('custom-color-scheme');
			}
			const colorScheme = this._themeSettings.get_enum('color-scheme');
			if (colorScheme === ColorScheme.System) {
				return this._settings.high_contrast
					? CustomColorScheme.HighContrast
					: Main.getStyleVariant() === 'light'
						? CustomColorScheme.Light
						: CustomColorScheme.Dark;
			} else {
				return colorScheme - 1;
			}
		})();
		const colorScheme = ['dark', 'light', 'high-contrast'][this.colorScheme];

		// Custom Theme
		if (theme === Theme.Custom) {
			try {
				// Load template
				const uri = `resource:///org/gnome/shell/extensions/copyous/css/template-${colorScheme}.css`;
				const template = Gio.File.new_for_uri(uri);
				const [contents] = await template.load_contents_async(null);
				const text = new TextDecoder().decode(contents);

				// Fill template
				const css = Object.entries(DefaultColors).reduce((s, [key, colors]) => {
					const i = Math.min(this.colorScheme, colors.length - 1);
					let color = this._themeSettings.get_string(key);
					color = color ? color : colors[i];

					// custom-var-foo-bar -> var_foo_bar
					const variable = key.substring('custom-'.length).replace(/-/g, '_');
					return s.replaceAll(`$${variable}`, color);
				}, text);

				// Save theme
				const path = getDataPath(this.ext);
				const stylesheet = path.get_child('custom-theme.css');
				const bytes = new TextEncoder().encode(css);
				await stylesheet.replace_contents_async(
					bytes,
					null,
					false,
					Gio.FileCreateFlags.REPLACE_DESTINATION,
					null,
				);

				// Load theme
				if (this._stylesheet) this.theme.unload_stylesheet(this._stylesheet);
				this.theme.load_stylesheet(stylesheet);
				this._stylesheet = stylesheet;
				return;
			} catch (err) {
				theme = Theme.Default;
				this.ext.logger.error(err);
			}
		}

		// GNOME Theme
		const themeName = ['default', 'yaru'][theme];
		const uri = `resource:///org/gnome/shell/extensions/copyous/css/stylesheet-${themeName}-${colorScheme}.css`;
		const stylesheet = Gio.File.new_for_uri(uri);
		if (this._stylesheet?.equal(stylesheet)) return;
		try {
			if (this._stylesheet) this.theme.unload_stylesheet(this._stylesheet);
			this.theme.load_stylesheet(stylesheet);
			this._stylesheet = stylesheet;
		} catch (err) {
			this.ext.logger.error(err);
		}
	}
};
ThemeManager = __decorate(
	[
		registerClass({
			Properties: {
				'color-scheme': enumParamSpec(
					'color-scheme',
					GObject.ParamFlags.READABLE,
					CustomColorScheme,
					CustomColorScheme.Dark,
				),
			},
		}),
	],
	ThemeManager,
);

export { ThemeManager };

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import { registerClass } from './gjs.js';
import { ClipboardHistory } from './settings.js';

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

const DBusInterfaceXml = `
<node>
	<interface name="org.gnome.Shell.Extensions.Copyous">
		<method name="Toggle"/>
		<method name="Show"/>
		<method name="Hide"/>
		<method name="ClearHistory">
			<arg type="b" direction="in" name="all"/>
		</method>
	</interface>
</node>
`.trim();
let DbusService = class DbusService extends GObject.Object {
	dbus;
	ownerId;
	confirmedLogoutId = -1;
	confirmedRebootId = -1;
	confirmedShutdownId = -1;
	prepareForShutdownId = -1;

	constructor() {
		super();
		this.ownerId = Gio.DBus.own_name(
			Gio.BusType.SESSION,
			'org.gnome.Shell.Extensions.Copyous',
			Gio.BusNameOwnerFlags.NONE,
			this.busAcquired.bind(this),
			null,
			null,
		);
		this.registerSignals();
	}

	Toggle() {
		this.emit('toggle');
	}

	Show() {
		this.emit('show');
	}

	Hide() {
		this.emit('hide');
	}

	ClearHistory(all) {
		const history = all ? ClipboardHistory.Clear : ClipboardHistory.KeepPinnedAndTagged;
		this.emit('clear-history', history);
	}

	destroy() {
		this.dbus?.unexport();
		this.dbus = undefined;
		this.unregisterSignals();
	}

	busAcquired(connection, _name) {
		this.dbus = Gio.DBusExportedObject.wrapJSObject(DBusInterfaceXml, this);
		this.dbus.export(connection, '/org/gnome/Shell/Extensions/Copyous');
	}

	registerSignals() {
		this.confirmedLogoutId = Gio.DBus.session.signal_subscribe(
			null,
			'org.gnome.SessionManager.EndSessionDialog',
			'ConfirmedLogout',
			'/org/gnome/SessionManager/EndSessionDialog',
			null,
			Gio.DBusSignalFlags.NONE,
			() => this.emit('clear-history', -1),
		);
		this.confirmedRebootId = Gio.DBus.session.signal_subscribe(
			null,
			'org.gnome.SessionManager.EndSessionDialog',
			'ConfirmedReboot',
			'/org/gnome/SessionManager/EndSessionDialog',
			null,
			Gio.DBusSignalFlags.NONE,
			() => this.emit('clear-history', -1),
		);
		this.confirmedShutdownId = Gio.DBus.session.signal_subscribe(
			null,
			'org.gnome.SessionManager.EndSessionDialog',
			'ConfirmedShutdown',
			'/org/gnome/SessionManager/EndSessionDialog',
			null,
			Gio.DBusSignalFlags.NONE,
			() => this.emit('clear-history', -1),
		);
		this.prepareForShutdownId = Gio.DBus.system.signal_subscribe(
			null,
			'org.freedesktop.login1.Manager',
			'PrepareForShutdown',
			'/org/freedesktop/login1',
			null,
			Gio.DBusSignalFlags.NONE,
			() => this.emit('clear-history', -1),
		);
	}

	unregisterSignals() {
		if (this.ownerId >= 0) Gio.DBus.unown_name(this.ownerId);
		if (this.confirmedLogoutId >= 0) Gio.DBus.session.signal_unsubscribe(this.confirmedLogoutId);
		if (this.confirmedRebootId >= 0) Gio.DBus.session.signal_unsubscribe(this.confirmedRebootId);
		if (this.confirmedShutdownId >= 0) Gio.DBus.session.signal_unsubscribe(this.confirmedShutdownId);
		if (this.prepareForShutdownId >= 0) Gio.DBus.system.signal_unsubscribe(this.prepareForShutdownId);
		this.ownerId = -1;
		this.confirmedLogoutId = -1;
		this.confirmedRebootId = -1;
		this.confirmedShutdownId = -1;
		this.prepareForShutdownId = -1;
	}
};
DbusService = __decorate(
	[
		registerClass({
			Signals: {
				'toggle': {},
				'show': {},
				'hide': {},
				'clear-history': {
					param_types: [GObject.TYPE_INT],
				},
			},
		}),
	],
	DbusService,
);

export { DbusService };

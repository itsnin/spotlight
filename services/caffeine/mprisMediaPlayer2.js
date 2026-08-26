// spotlight - caffeine mpris media player dbus monitoring
// copied from caffeine extension v60
// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

const DBusInterface = `<node>
    <interface name="org.freedesktop.DBus">
        <method name="ListNames">
            <arg type="as" direction="out" />
        </method>
        <signal name="NameAcquired">
            <arg type="s"/>
        </signal>
    </interface>
</node>`;

const DBusMprisPlayerInterface = `<node>
  <interface name="org.mpris.MediaPlayer2.Player">
    <property name="PlaybackStatus" type="s" access="read"/>
  </interface>
</node>`;

const MprisPlayer = GObject.registerClass({
    Signals: {
        isPlaying: {
            param_types: [GObject.TYPE_BOOLEAN]
        }
    }
}, class MprisPlayer extends GObject.Object {
    static _instance;

    static get isActive() {
        return this._instance !== undefined;
    }

    static Get() {
        if (this._instance) {
            return this._instance;
        }
        this._instance = new MprisPlayer();
        return this._instance;
    }

    static Destroy() {
        if (this._instance) {
            this._instance._onDestroy();
        }
        this._instance = undefined;
    }

    _DBusPlayerProxy;
    _dbusProxy;
    _dbusHandlerId;
    _mprisPrefix = 'org.mpris.MediaPlayer2.';
    _activePlayers = new Map();
    _connections = new Set();
    _isPlaying = false;
    _lastEmittedPlayStatus = false;

    get isPlaying() {
        return this._isPlaying;
    }

    refresh() {
        const dbusNames = this._getMPlayerApps();
        dbusNames.forEach((dbusName) => this._addPlayer(dbusName));
        this._emitPlayStatus(true);
    }

    connectIsPlaying(callbackFn) {
        const connectId = this.connect(
            'isPlaying',
            (_, isPlaying) => callbackFn(isPlaying)
        );
        this._connections.add(connectId);
        return connectId;
    }

    disconnectIsPlaying(connectId) {
        if (!this._connections.has(connectId)) {
            return;
        }
        this.disconnect(connectId);
        this._connections.delete(connectId);
        return connectId;
    }

    _emitPlayStatus(forceEmit = false) {
        if (this._lastEmittedPlayStatus === this.isPlaying && !forceEmit) {
            return;
        }
        this._lastEmittedPlayStatus = this.isPlaying;
        this.emit('isPlaying', this.isPlaying);
    }

    _addPlayer(dbusName) {
        if (this._activePlayers.has(dbusName)) {
            return;
        }

        const dbusPlayerProxy = new this._DBusPlayerProxy(
            Gio.DBus.session,
            dbusName,
            '/org/mpris/MediaPlayer2',
            (_player) => this._onPlayerChange()
        );

        const handlerId = dbusPlayerProxy.connect(
            'g-properties-changed',
            (_player) => this._onPlayerChange()
        );

        this._activePlayers.set(dbusName, {
            handlerId,
            playerProxy: dbusPlayerProxy
        });
    }

    _removePlayer(dbusName) {
        const player = this._activePlayers.get(dbusName);
        if (!player) {
            return;
        }
        player.playerProxy.disconnect(player.handlerId);
        this._activePlayers.delete(dbusName);
    }

    _onPlayerChange() {
        let isPlaying = false;
        for (const player of this._activePlayers.values()) {
            if (player.playerProxy.PlaybackStatus === 'Playing') {
                isPlaying = true;
            }
        }
        this._isPlaying = isPlaying;
        this._emitPlayStatus();
    }

    _onNameOwnerChanged(_proxy, _sender, [name, oldOwner, newOwner]) {
        if (!name.startsWith(this._mprisPrefix)) {
            return;
        }
        if (newOwner === '') {
            this._removePlayer(name);
        } else if (oldOwner === '') {
            this._addPlayer(name);
        }
        this._onPlayerChange();
    }

    _getMPlayerApps() {
        const [names] = this._dbusProxy.ListNamesSync();
        const mprisPlayers = names.filter((dbusName) =>
            dbusName.startsWith(this._mprisPrefix)
        );

        return mprisPlayers;
    }

    _onDestroy() {
        this._dbusProxy.disconnectSignal(this._dbusHandlerId);
        for (const dbusName of this._activePlayers.keys()) {
            this._removePlayer(dbusName);
        }
        this._activePlayers.clear();

        for (const connectId of this._connections.values()) {
            this.disconnectIsPlaying(connectId);
        }
        this._connections.clear();
    }

    constructor() {
        super();

        const DBusProxy = Gio.DBusProxy.makeProxyWrapper(DBusInterface);
        this._DBusPlayerProxy = Gio.DBusProxy.makeProxyWrapper(
            DBusMprisPlayerInterface
        );

        this._dbusProxy = new DBusProxy(
            Gio.DBus.session,
            'org.freedesktop.DBus',
            '/org/freedesktop/DBus',
            (_proxy) => this._onPlayerChange()
        );

        this._dbusHandlerId = this._dbusProxy.connectSignal(
            'NameOwnerChanged',
            (...args) => this._onNameOwnerChanged(...args)
        );

        this.refresh();
    }
});

export { MprisPlayer };

// spotlight - virtual keyboard for paste simulation
// SPDX-License-Identifier: GPL-3.0-or-later
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

// singleton pattern creates device on first use
let _virtualDevice = null;

function getDevice() {
    if (!_virtualDevice) {
        const seat = Clutter.get_default_backend().get_default_seat();
        _virtualDevice = seat.create_virtual_device(
            Clutter.InputDeviceType.KEYBOARD_DEVICE,
        );
    }
    return _virtualDevice;
}

export function destroyDevice() {
    if (_virtualDevice) {
        // drop reference let garbage collection reclaim it
        // run_dispose not used per ego extension guidelines
        _virtualDevice = null;
    }
}

// simulates shift insert which pastes from primary selection
// used by both clipboard history and emoji selector on select
export function triggerPaste(callback) {
    const device = getDevice();
    // get_current_event_time valid when called from signal handlers
    // falls back to clutter current time if called outside event context
    let eventTime = Clutter.get_current_event_time();
    if (eventTime === 0)
        eventTime = Clutter.CURRENT_TIME;
    eventTime = eventTime * 1000;

    // shift insert paste sequence
    device.notify_keyval(
        eventTime,
        Clutter.KEY_Shift_L,
        Clutter.KeyState.PRESSED,
    );
    device.notify_keyval(
        eventTime,
        Clutter.KEY_Insert,
        Clutter.KeyState.PRESSED,
    );
    device.notify_keyval(
        eventTime,
        Clutter.KEY_Insert,
        Clutter.KeyState.RELEASED,
    );
    device.notify_keyval(
        eventTime,
        Clutter.KEY_Shift_L,
        Clutter.KeyState.RELEASED,
    );

    if (callback) {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1, () => {
            callback();
            return GLib.SOURCE_REMOVE;
        });
    }
}

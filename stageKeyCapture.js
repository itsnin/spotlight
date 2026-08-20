// spotlight - wires stage-level key capture to a PopupKeyHandler
// SPDX-License-Identifier: GPL-3.0-or-later

// connects global.stage's captured-event to a handler while the popup is
// open, disconnects on close - this class only owns the connection, all
// the actual key logic lives in PopupKeyHandler
export class StageKeyCapture {
    constructor(keyHandler) {
        this._keyHandler = keyHandler;
        this._stageKeyId = 0;
    }

    start() {
        this._stageKeyId = global.stage.connect('captured-event',
            (_, event) => this._keyHandler.handleEvent(event));
    }

    stop() {
        if (this._stageKeyId) {
            global.stage.disconnect(this._stageKeyId);
            this._stageKeyId = 0;
        }
    }
}

// Spotlight: workspace thumbnail enhancements
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SecondaryMonitorDisplay} from 'resource:///org/gnome/shell/ui/workspacesView.js';
import {WorkspaceThumbnail} from 'resource:///org/gnome/shell/ui/workspaceThumbnail.js';
import {BackgroundManager} from 'resource:///org/gnome/shell/ui/background.js';

// Increases thumbnail scale and restores the wallpaper background.
// These are visual enhancements that run once at enable and revert at disable.
export class ThumbnailEnhancer {
    constructor() {
        this._bkpMaxThumbnailScale = null;
        this._bkpSecondaryGetThumbnailsHeight = null;
        this._bkpThumbInit = null;
        this._bkpThumbOnDestroy = null;
    }

    apply() {
        this._applyScale();
        this._applyBackground();
    }

    _applyScale() {
        // Double the default maximum scale so thumbnails are actually usable
        // on modern high-resolution displays.
        const thumbnailsBox = Main.overview._overview._controls._thumbnailsBox;
        this._bkpMaxThumbnailScale = thumbnailsBox._maxThumbnailScale;
        thumbnailsBox._maxThumbnailScale = 0.1;

        const scaleFactor = 0.1;
        this._bkpSecondaryGetThumbnailsHeight = SecondaryMonitorDisplay.prototype._getThumbnailsHeight;
        SecondaryMonitorDisplay.prototype._getThumbnailsHeight = function(box) {
            if (!this || !this._thumbnails.visible)
                return 0;
            this._thumbnails._maxThumbnailScale = scaleFactor;
            const [width, height] = box.get_size();
            const {expandFraction} = this._thumbnails;
            const [thumbnailsHeight] = this._thumbnails.get_preferred_height(width);
            return Math.min(
                thumbnailsHeight * expandFraction,
                height * this._thumbnails.maxThumbnailScale);
        };
    }

    _applyBackground() {
        // Replace the solid grey default with the actual wallpaper. Queue
        // relayout on load to work around a Shell 50 bug where thumbnails stay
        // blank until something else forces a relayout.
        this._bkpThumbInit = WorkspaceThumbnail.prototype._init;
        const bkpThumbInit = this._bkpThumbInit;
        this._bkpThumbOnDestroy = WorkspaceThumbnail.prototype._onDestroy;
        const bkpThumbOnDestroy = this._bkpThumbOnDestroy;

        WorkspaceThumbnail.prototype._init = function(metaWorkspace, monitorIndex) {
            bkpThumbInit.call(this, metaWorkspace, monitorIndex);
            this._bgManager = new BackgroundManager({
                monitorIndex: monitorIndex,
                container: this._contents,
                vignette: false,
            });
            const requeue = () => this._bgManager.backgroundActor?.queue_relayout();
            this._bgManagerLoadedId = this._bgManager.connect('loaded', requeue);
            this._bgManagerChangedId = this._bgManager.connect('changed', requeue);
        };

        WorkspaceThumbnail.prototype._onDestroy = function() {
            bkpThumbOnDestroy.call(this);
            if (this._bgManager) {
                if (this._bgManagerLoadedId) {
                    this._bgManager.disconnect(this._bgManagerLoadedId);
                    this._bgManagerLoadedId = 0;
                }
                if (this._bgManagerChangedId) {
                    this._bgManager.disconnect(this._bgManagerChangedId);
                    this._bgManagerChangedId = 0;
                }
                this._bgManager.destroy();
                this._bgManager = null;
            }
        };
    }

    revert() {
        if (this._bkpMaxThumbnailScale !== null) {
            const thumbnailsBox = Main.overview._overview._controls._thumbnailsBox;
            thumbnailsBox._maxThumbnailScale = this._bkpMaxThumbnailScale;
            this._bkpMaxThumbnailScale = null;
        }

        if (this._bkpSecondaryGetThumbnailsHeight !== null) {
            SecondaryMonitorDisplay.prototype._getThumbnailsHeight = this._bkpSecondaryGetThumbnailsHeight;
            this._bkpSecondaryGetThumbnailsHeight = null;
        }

        if (this._bkpThumbInit !== null) {
            WorkspaceThumbnail.prototype._init = this._bkpThumbInit;
            this._bkpThumbInit = null;
        }

        if (this._bkpThumbOnDestroy !== null) {
            WorkspaceThumbnail.prototype._onDestroy = this._bkpThumbOnDestroy;
            this._bkpThumbOnDestroy = null;
        }
    }
}

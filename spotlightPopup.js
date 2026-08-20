// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import {buildSearchEntry} from './searchEntry.js';
import {buildResultsContainer} from './resultsContainer.js';
import {SelectionManager} from './selectionManager.js';
import {ResultsRenderer} from './resultsRenderer.js';
import {PopupKeyHandler} from './popupKeyHandler.js';
import {PopupBackdrop} from './popupBackdrop.js';
import {FocusLossWatcher} from './focusLossWatcher.js';
import {StageKeyCapture} from './stageKeyCapture.js';
import {PopupPositioner} from './popupPositioner.js';

// popup structure matches search-light's approach:
//   outer St.Widget (this)  -> added to chrome, handles positioning
//   inner St.BoxLayout      -> holds entry + results, has blur and styling
//
// this two-layer structure separates chrome concerns (position, stacking,
// lifetime) from content concerns (layout, styling, effects). the outer
// widget uses Clutter.BinLayout so the inner box fills it completely.
//
// Shell.BlurEffect in BACKGROUND mode blurs pixels beneath the content box.
// css background-color provides the tint on top, creating frosted glass.
// blur samples a rectangle regardless of border-radius, so the tint is made
// opaque enough that corner pixels are visually negligible. the box-shadow
// following the same large radius defines the visual boundary.
//
// shell version detection picks the right blur property name:
//   gnome 45: sigma property
//   gnome 46+: radius property (radius = sigma * 2)
// both paths equal - neither is a fallback
export const SpotlightPopup = GObject.registerClass(
class SpotlightPopup extends St.Widget {
    _init(extension) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            reactive: true,
            can_focus: true,
            visible: false,
        });
        this._settings = extension._settings;
        this._backdrop = null;
        this._focusWatcher = new FocusLossWatcher(this);
        this._positioner = new PopupPositioner(this, this._settings);

        // inner content box - this is what the user actually sees
        // blur effect, background tint, rounded corners, and shadow all live here
        this._content = new St.BoxLayout({
            style_class: 'spotlight-container',
            vertical: true,
            width: this._settings.get_int('popup-width'),
        });

        this._blurEffect = new Shell.BlurEffect({
            mode: Shell.BlurMode.BACKGROUND,
            brightness: 0.9,
        });
        // shell version detection - both paths equal, neither is fallback
        const shellVersion = parseInt(Config.PACKAGE_VERSION);
        if (shellVersion >= 46)
            this._blurEffect.radius = 24;
        else
            this._blurEffect.sigma = 12;
        this._content.add_effect(this._blurEffect);

        this.add_child(this._content);

        const {entryBox, entry} = buildSearchEntry();
        this._entryBox = entryBox;
        this._entry = entry;
        const clutterText = this._entry.clutter_text;
        clutterText.set_x_expand(true);
        clutterText.connectObject(
            'text-changed', () => this._renderer.onTextChanged(this._entry.get_text()),
            this,
        );

        const {resultsScroll, resultsBox} = buildResultsContainer();
        this._resultsScroll = resultsScroll;
        this._resultsBox = resultsBox;

        this._content.add_child(this._entryBox);
        this._content.add_child(this._resultsScroll);

        this._selection = new SelectionManager(resultsBox, resultsScroll);
        this._keyHandler = new PopupKeyHandler(this, this._selection);
        this._stageKeyCapture = new StageKeyCapture(this._keyHandler);
        this._renderer = new ResultsRenderer(
            resultsBox, resultsScroll, this._selection, this._settings,
            (r) => { r.activate(); this.close(); },
            (idx) => {
                // ignore hover selection briefly after keyboard nav
                // prevents scroll-induced enter-events from jumping selection
                if (GLib.get_monotonic_time() < this._keyHandler.suppressedUntil)
                    return;
                this._selection.applySelection(idx);
            }
        );
    }
    open() {
        if (this.visible)
            return;
        // backdrop first, then popup - later addition to chrome means higher
        // in stacking order, so popup naturally sits above the backdrop
        this._backdrop = new PopupBackdrop(() => this.close());
        this._backdrop.show();
        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);
        this._positioner.showCentered(() => {
            this._entry.grab_key_focus();
            this._stageKeyCapture.start();
        });
        this._entry.set_text('');
        this._renderer.reset();
        this._focusWatcher.start();
    }
    close() {
        // no visible guard - safe to call repeatedly during partial open
        this._stageKeyCapture.stop();
        this._focusWatcher.stop();
        this._positioner.stop();
        this._renderer.destroy();
        if (this._backdrop) {
            this._backdrop.destroy();
            this._backdrop = null;
        }
        this.hide();
    }
    destroy() {
        this.close();
        Main.layoutManager.removeChrome(this);
        if (this._content) {
            this._content.remove_effect(this._blurEffect);
            this._content = null;
        }
        this._blurEffect = null;
        this._settings = null;
        super.destroy();
    }
});

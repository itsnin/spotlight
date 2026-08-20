// spotlight - popup widget
// SPDX-License-Identifier: GPL-3.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {buildSearchEntry} from './searchEntry.js';
import {buildResultsContainer} from './resultsContainer.js';
import {SelectionManager} from './selectionManager.js';
import {ResultsRenderer} from './resultsRenderer.js';
import {PopupKeyHandler} from './popupKeyHandler.js';
import {PopupBackdrop} from './popupBackdrop.js';
import {FocusLossWatcher} from './focusLossWatcher.js';
import {StageKeyCapture} from './stageKeyCapture.js';
import {PopupPositioner} from './popupPositioner.js';

// the popup widget - a vertical box with a search entry and scrollable results
// added to gnome's chrome layer so it floats above all windows
//
// single unified window design: entry and results share one continuous
// background with rounded corners. a background widget sits at the bottom
// of the container with Shell.BlurEffect in BACKGROUND mode, which blurs
// the pixels beneath the popup. the translucent background-color from css
// tints the blurred result to create frosted glass.
//
// shell version detection picks the right blur property name:
//   gnome 45: sigma property (gaussian sigma value)
//   gnome 46+: radius property (radius = sigma * 2)
// both get equal treatment - neither is a fallback
//
// to capture clicks outside the popup we do not use Main.pushModal because a
// modal grab swallows pointer events before they reach the stage instead we
// place a transparent full-screen reactive backdrop actor behind the popup
// any click on the backdrop closes the popup clicks on the popup itself are
// received normally because the popup sits above the backdrop in the chrome
//
// keyboard input is captured via grab_key_focus on the entry which receives
// all key events while it has focus the escape key closes the popup
//
// this class owns the lifecycle (open/close/destroy) and holds a
// SelectionManager, a ResultsRenderer, and a PopupKeyHandler which each own
// one slice of what used to all live in this file directly
export const SpotlightPopup = GObject.registerClass(
class SpotlightPopup extends St.BoxLayout {
    _init(extension) {
        super._init({
            style_class: 'spotlight-container',
            reactive: true,
            can_focus: true,
            visible: false,
            width: extension._settings.get_int('popup-width'),
            clip_to_allocation: true,
        });
        // orientation set after init for gnome 45/46 compatibility
        // the Clutter.Orientation enum property was added in gnome 47
        this.set_vertical(true);
        this._settings = extension._settings;
        this._backdrop = null;
        this._focusWatcher = new FocusLossWatcher(this);
        this._positioner = new PopupPositioner(this, this._settings);

        // background widget sits at the bottom and fills the container
        // Shell.BlurEffect in BACKGROUND mode blurs whatever is beneath it
        this._blurWidget = new St.Widget({
            x_expand: true,
            y_expand: true,
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
        this._blurWidget.add_effect(this._blurEffect);
        this.add_child(this._blurWidget);

        // tint layer - translucent color drawn on top of the blurred pixels
        // this and the blur widget together create frosted glass
        this._tintWidget = new St.Widget({
            x_expand: true,
            y_expand: true,
            style_class: 'spotlight-tint',
        });
        this.add_child(this._tintWidget);

        // content container holds entry + results above the blur and tint
        this._contentBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'spotlight-content',
        });
        this.add_child(this._contentBox);

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

        this._contentBox.add_child(this._entryBox);
        this._contentBox.add_child(this._resultsScroll);

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
        // popup is added to chrome in open() after the backdrop
        // this ensures it naturally sits above the backdrop without needing
        // raise() or lower() calls which are unreliable on hidden actors
    }
    open() {
        if (this.visible)
            return;
        // create and show backdrop first then popup - later addition to
        // chrome means higher in the stacking order so popup naturally
        // sits above the backdrop
        this._backdrop = new PopupBackdrop(() => this.close());
        this._backdrop.show();
        // always re-add popup to chrome to guarantee correct stacking order
        // if popup was left in chrome from a previous close remove it first
        if (this.get_parent())
            Main.layoutManager.removeChrome(this);
        Main.layoutManager.addChrome(this);
        this._positioner.showCentered(() => {
            // grab focus only after the popup is visible
            // grabbing focus on a hidden actor fails silently
            this._entry.grab_key_focus();
            this._stageKeyCapture.start();
        });
        this._entry.set_text('');
        this._renderer.reset();
        this._focusWatcher.start();
    }
    close() {
        // no visible guard - must clean up even if called during the partially-open
        // window between open() and the idle callback that actually calls show()
        // every operation below is individually guarded and safe to call repeatedly
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
    // overridden so that disable() -> destroy() tears down everything cleanly:
    // closes the popup which removes the backdrop and focus handler then
    // removes us from the chrome layer and chains up to the parent destroy
    destroy() {
        this.close();
        Main.layoutManager.removeChrome(this);
        if (this._blurWidget) {
            this._blurWidget.remove_effect(this._blurEffect);
            this._blurWidget = null;
        }
        this._blurEffect = null;
        this._tintWidget = null;
        this._contentBox = null;
        this._settings = null;
        super.destroy();
    }
});

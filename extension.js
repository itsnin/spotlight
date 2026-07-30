// spotlight - a compact launcher for gnome shell
// SPDX-License-Identifier: GPL-3.0-or-later
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import St from 'gi://St';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { KeybindingManager } from './keybinding.js';
import { searchApps, searchCalculator, searchSystemActions, searchSettings, searchWeb } from './searchProviders.js';
// the popup widget - a vertical box with a search entry and scrollable results
// added to gnome's chrome layer so it floats above all windows
// uses a modal grab to capture all keyboard input while open
const SpotlightPopup = GObject.registerClass(class SpotlightPopup extends St.BoxLayout {
    _init(extension) {
        super._init({
            vertical: true,
            style_class: 'spotlight-container',
            reactive: true,
            can_focus: true,
            visible: false,
            width: extension._settings.get_int('popup-width'),
        });
        this._settings = extension._settings;
        this._results = [];
        this._selectedIndex = -1;
        this._searchIdleId = 0;
        this._grab = null;
        // entry box holds the search icon and text entry side by side
        this._entryBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            style_class: 'spotlight-entry-box',
        });
        this._searchIcon = new St.Icon({
            icon_name: 'system-search-symbolic',
            style_class: 'spotlight-search-icon',
            icon_size: 20,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._entry = new St.Entry({
            style_class: 'spotlight-entry',
            hint_text: 'Search apps...',
            can_focus: true,
            x_expand: true,
        });
        this._entryBox.add_child(this._searchIcon);
        this._entryBox.add_child(this._entry);
        // connectobject auto-disconnects all signals when this widget is destroyed
        const clutterText = this._entry.clutter_text;
        clutterText.set_x_expand(true);
        clutterText.connectObject('text-changed', this._onTextChanged.bind(this), 'key-press-event', this._onKeyPress.bind(this), this);
        this._resultsScroll = new St.ScrollView({
            style_class: 'spotlight-results',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            visible: false,
        });
        this._resultsBox = new St.BoxLayout({ vertical: true, x_expand: true });
        this._resultsScroll.add_child(this._resultsBox);
        this.add_child(this._entryBox);
        this.add_child(this._resultsScroll);
        // addchrome places this widget above all windows in the shell
        Main.layoutManager.addChrome(this);
    }
    open() {
        if (this.visible)
            return;
        // center on the primary monitor
        const monitor = Main.layoutManager.primaryMonitor;
        const popupWidth = this._settings.get_int('popup-width');
        const [, naturalHeight] = this.get_preferred_height(popupWidth);
        this.set_position(Math.floor(monitor.x + (monitor.width - popupWidth) / 2), Math.floor(monitor.y + (monitor.height - naturalHeight) / 2));
        this.show();
        // pushmodal grabs all keyboard input so the popup receives keystrokes
        // returns null if another modal is already active
        this._grab = Main.pushModal(this, {
            actionMode: Shell.ActionMode.POPUP,
        });
        if (this._grab) {
            // if the grab is invalidated (another modal steals it) close the popup
            this._grab.connectObject('notify::state', () => {
                if (this._grab && this._grab.get_state() === Clutter.GrabState.INVALID)
                    this.close();
            }, this);
        }
        this._entry.set_text('');
        this._selectedIndex = -1;
        this._resultsBox.destroy_all_children();
        this._resultsScroll.hide();
        this._entry.grab_key_focus();
    }
    close() {
        if (!this.visible)
            return;
        // cancel any pending search that hasn't run yet
        if (this._searchIdleId) {
            GLib.source_remove(this._searchIdleId);
            this._searchIdleId = 0;
        }
        if (this._grab) {
            this._grab.disconnectObject(this);
            Main.popModal(this._grab);
            this._grab = null;
        }
        this.hide();
    }
    _onTextChanged() {
        const text = this._entry.get_text();
        // cancel previous pending search before scheduling a new one
        if (this._searchIdleId) {
            GLib.source_remove(this._searchIdleId);
            this._searchIdleId = 0;
        }
        if (text.trim().length === 0) {
            this._results = [];
            this._selectedIndex = -1;
            this._resultsBox.destroy_all_children();
            this._resultsScroll.hide();
            return;
        }
        // debounce search on idle so typing stays responsive
        // without this every keystroke would synchronously search all installed apps
        this._searchIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._searchIdleId = 0;
            this._runSearch(text);
            return GLib.SOURCE_REMOVE;
        });
    }
    // search priority: apps first then calculator then system actions then settings then web last
    _runSearch(text) {
        const trimmed = text.trim();
        const maxResults = this._settings.get_int('max-results');
        const allResults = [];
        // apps are always first - the main feature
        allResults.push(...searchApps(trimmed, maxResults));
        // calculator shows if the input is valid arithmetic
        const calcResult = searchCalculator(trimmed);
        if (calcResult)
            allResults.push(calcResult);
        // system actions - lock suspend restart etc
        allResults.push(...searchSystemActions(trimmed));
        // settings panels
        allResults.push(...searchSettings(trimmed));
        // web search only appears when nothing local matched
        if (allResults.length === 0 && this._settings.get_boolean('show-web-search')) {
            const engine = this._settings.get_string('web-search-engine');
            allResults.push(searchWeb(trimmed, engine));
        }
        this._results = allResults;
        this._resultsBox.destroy_all_children();
        if (allResults.length === 0) {
            this._renderNoResults(trimmed);
        }
        else {
            this._renderResults();
            this._applySelection(0);
        }
        this._resultsScroll.show();
    }
    _renderResults() {
        let lastType = null;
        for (const result of this._results) {
            // insert a section header when the result type changes
            if (result.type !== lastType) {
                lastType = result.type;
                this._resultsBox.add_child(new St.Label({
                    style_class: 'spotlight-section-header',
                    text: this._sectionTitle(result.type),
                }));
            }
            this._resultsBox.add_child(this._buildResultRow(result));
        }
    }
    _buildResultRow(result) {
        const hbox = new St.BoxLayout({
            style_class: 'spotlight-result',
            vertical: false,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });
        // for apps call get_icon() at render time to get a fresh gicon reference
        // for other types use the icon name string from the icon theme
        const iconParams = {
            fallback_icon_name: 'application-x-executable',
            style_class: 'spotlight-result-icon',
            icon_size: 28,
        };
        if (result.type === 'app' && result.app)
            iconParams.gicon = result.app.get_icon();
        else if (typeof result.icon === 'string')
            iconParams.icon_name = result.icon;
        else
            iconParams.gicon = result.icon;
        const icon = new St.Icon(iconParams);
        const text = new St.BoxLayout({
            style_class: 'spotlight-result-content',
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        text.add_child(new St.Label({
            style_class: 'spotlight-result-title',
            text: result.title,
        }));
        if (result.description) {
            text.add_child(new St.Label({
                style_class: 'spotlight-result-description',
                text: result.description,
            }));
        }
        hbox.add_child(icon);
        hbox.add_child(text);
        // store the result index on the widget so we can look it up during keyboard nav
        hbox._resultIndex = this._results.indexOf(result);
        hbox.connectObject('button-release-event', () => {
            result.activate();
            return Clutter.EVENT_STOP;
        }, 'enter-event', () => {
            this._applySelection(hbox._resultIndex);
            return Clutter.EVENT_PROPAGATE;
        }, this);
        return hbox;
    }
    _renderNoResults(query) {
        const box = new St.BoxLayout({
            vertical: true,
            style_class: 'spotlight-no-results',
        });
        box.add_child(new St.Label({
            style_class: 'spotlight-no-results-title',
            text: 'No Results',
        }));
        box.add_child(new St.Label({
            text: `No results for "${query}"`,
        }));
        this._resultsBox.add_child(box);
    }
    _sectionTitle(type) {
        const titles = {
            app: 'Applications',
            calculator: 'Calculator',
            'system-action': 'System Actions',
            settings: 'Settings',
            web: 'Web Search',
        };
        return titles[type] || 'Results';
    }
    // highlight a row and scroll it into view if it's outside the visible area
    _applySelection(index) {
        // remove highlight from the previously selected row
        if (this._selectedIndex >= 0 && this._selectedIndex < this._results.length) {
            const oldRow = this._getResultRow(this._selectedIndex);
            if (oldRow)
                oldRow.remove_style_class_name('spotlight-selected');
        }
        this._selectedIndex = index;
        if (index >= 0 && index < this._results.length) {
            const newRow = this._getResultRow(index);
            if (newRow) {
                newRow.add_style_class_name('spotlight-selected');
                // adjust the scroll position if the row is outside the visible area
                const adjustment = this._resultsScroll.vscroll.adjustment;
                const rowY = newRow.get_allocation_box().y1;
                const rowHeight = newRow.get_allocation_box().get_height();
                if (rowY < adjustment.value)
                    adjustment.value = rowY;
                else if (rowY + rowHeight > adjustment.value + adjustment.page_size)
                    adjustment.value = rowY + rowHeight - adjustment.page_size;
            }
        }
    }
    _getResultRow(resultIndex) {
        for (const child of this._resultsBox.get_children()) {
            if (child._resultIndex === resultIndex)
                return child;
        }
        return null;
    }
    _moveSelection(delta) {
        if (this._results.length === 0)
            return;
        let newIndex = this._selectedIndex + delta;
        // wrap around from top to bottom and vice versa
        if (newIndex < 0)
            newIndex = this._results.length - 1;
        if (newIndex >= this._results.length)
            newIndex = 0;
        this._applySelection(newIndex);
    }
    _onKeyPress(_, event) {
        switch (event.get_key_symbol()) {
            case Clutter.KEY_Escape:
                this.close();
                return Clutter.EVENT_STOP;
            case Clutter.KEY_Down:
                this._moveSelection(1);
                return Clutter.EVENT_STOP;
            case Clutter.KEY_Up:
                this._moveSelection(-1);
                return Clutter.EVENT_STOP;
            case Clutter.KEY_Return:
            case Clutter.KEY_KP_Enter:
                // activate the selected result or fall back to the first result
                if (this._selectedIndex >= 0 && this._selectedIndex < this._results.length)
                    this._results[this._selectedIndex].activate();
                else if (this._results.length > 0)
                    this._results[0].activate();
                return Clutter.EVENT_STOP;
            default:
                return Clutter.EVENT_PROPAGATE;
        }
    }
    destroy() {
        this.close();
        Main.layoutManager.removeChrome(this);
        this._results = [];
        this._settings = null;
        super.destroy();
    }
});
// entry point - enable and disable are kept next to each other for easy review
export default class SpotlightExtension extends Extension {
    _settings;
    _popup;
    _keybindingManager;
    _shortcutChangedId;
    enable() {
        this._settings = this.getSettings();
        this._popup = new SpotlightPopup(this);
        this._keybindingManager = new KeybindingManager();
        this._keybindingManager.enable();
        // read the shortcut from gsettings defaulting to ctrl+space on first run
        const shortcuts = this._settings.get_strv('toggle-shortcut');
        const accelerator = shortcuts.length > 0 ? shortcuts[0] : '<Control>space';
        // persist the default so it shows up in preferences
        if (shortcuts.length === 0)
            this._settings.set_strv('toggle-shortcut', [accelerator]);
        this._grabShortcut(accelerator);
        // re-grab when the user changes the shortcut in preferences
        this._shortcutChangedId = this._settings.connect('changed::toggle-shortcut', () => {
            this._keybindingManager.unlisten();
            const arr = this._settings.get_strv('toggle-shortcut');
            if (arr.length > 0)
                this._grabShortcut(arr[0]);
        });
    }
    _grabShortcut(accelerator) {
        this._keybindingManager.listenFor(accelerator, () => {
            if (this._popup.visible)
                this._popup.close();
            else
                this._popup.open();
        });
    }
    disable() {
        if (this._shortcutChangedId) {
            this._settings.disconnect(this._shortcutChangedId);
            this._shortcutChangedId = null;
        }
        this._keybindingManager.disable();
        this._keybindingManager = null;
        this._popup.destroy();
        this._popup = null;
        this._settings = null;
    }
}

// spotlight - emoji popup wrapper
// SPDX-License-Identifier: GPL-3.0-or-later
// Core logic adapted from emoji-copy@felipeftn v38.
// Creates PanelMenu.Button with all original emoji categories/features but
// does NOT add it to the top panel. Opened/closed via Ctrl+2 shortcut only.

import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { EmojiButton } from "../services/emoji/emojiButton.js";
import { EmojiCategory } from "../services/emoji/emojiCategory.js";
import { EmojiSearchItem } from "../services/emoji/emojiSearchItem.js";
import { SQLite } from "../services/emoji/handlers/sql.js";

const CAT_LABELS = [
  "Smileys & Emotion",
  "People & Body",
  "Animals & Nature",
  "Food & Drink",
  "Travel & Places",
  "Activities",
  "Objects",
  "Symbols",
  "Flags",
];

const CAT_ICONS = [
  "emoji-body-symbolic",
  "emoji-people-symbolic",
  "emoji-nature-symbolic",
  "emoji-food-symbolic",
  "emoji-travel-symbolic",
  "emoji-activities-symbolic",
  "emoji-objects-symbolic",
  "emoji-symbols-symbolic",
  "emoji-flags-symbolic",
];

export class EmojiPopup {
    constructor(settings, extensionPath, gettext) {
        this._settings = settings;
        this._path = extensionPath;
        this._ = gettext;
        this.timeoutSourceId = null;
        this.position = this._settings.get_string("position");
        this._permanentItems = 0;
        this.clipboardOwned = false;
        this.emojiCategories = [];
    }

    async initialize() {
        this.sqlite = new SQLite();
        await this.sqlite.initializeDB(this._path);

        this.super_btn = new PanelMenu.Button(0.0, this._("Emoji Copy"), false);
        let box = new St.BoxLayout();
        let icon = new St.Icon({
            icon_name: "face-cool-symbolic",
            style_class: "system-status-icon emotes-icon",
        });
        box.add_child(icon);
        this.super_btn.add_child(box);

        this._cursorAnchor = new St.Widget({
            width: 1,
            height: 1,
            opacity: 0,
            reactive: false,
        });
        Main.uiGroup.add_child(this._cursorAnchor);

        this.super_btn.menu.connectObject(
            "open-state-changed",
            this._onOpenStateChanged.bind(this),
            this,
        );

        let nbCols = this._settings.get_int("nbcols");

        this._createAllCategories(nbCols);
        this._renderPanelMenuHeaderBox();

        this.searchItem = new EmojiSearchItem(this, nbCols);
        let recentlyUsed = this.searchItem.recentlyUsedItem;

        if (this.position === "top") {
            this.super_btn.menu.addMenuItem(this._buttonMenuItem);
            this._permanentItems++;
            this.super_btn.menu.addMenuItem(this.searchItem.super_item);
            this._permanentItems++;
            this.super_btn.menu.addMenuItem(recentlyUsed);
            this._permanentItems++;
        }

        this._addAllCategories();

        if (this.position === "bottom") {
            this.super_btn.menu.addMenuItem(recentlyUsed);
            this._permanentItems++;
            this.super_btn.menu.addMenuItem(this.searchItem.super_item);
            this._permanentItems++;
            this.super_btn.menu.addMenuItem(this._buttonMenuItem);
            this._permanentItems++;
        }

        this._settings.connectObject(
            "changed::emojisize", () => { this.updateStyle(); },
            "changed::nbcols", () => { this.updateNbCols(); },
            this,
        );
    }

    open() {
        if (!this.super_btn.menu.isOpen) this.toggleMenu();
    }

    close() {
        if (this.super_btn.menu.isOpen) this.super_btn.menu.close();
    }

    get isOpen() {
        return this.super_btn?.menu?.isOpen ?? false;
    }

  _createAllCategories(nbCols) {
    this.emojiCategories = [];

    const CAT_LABELS = [
      this._("Smileys & Body"),
      this._("Peoples & Clothing"),
      this._("Animals & Nature"),
      this._("Food & Drink"),
      this._("Travel & Places"),
      this._("Activities & Sports"),
      this._("Objects"),
      this._("Symbols"),
      this._("Flags"),
    ];

    const CAT_ICONS = [
      "face-smile-symbolic",
      "emoji-people-symbolic",
      "emoji-nature-symbolic",
      "emoji-food-symbolic",
      "emoji-travel-symbolic",
      "emoji-activities-symbolic",
      "emoji-objects-symbolic",
      "emoji-symbols-symbolic",
      "emoji-flags-symbolic",
    ];

    for (let i = 0; i < 9; i++) {
      this.emojiCategories[i] = new EmojiCategory(
        this,
        CAT_LABELS[i],
        CAT_ICONS[i],
        i,
      );
      this.emojiCategories[i].setNbCols(nbCols);
    }
  }

  _addAllCategories() {
    for (let i = 0; i < 9; i++) {
      this.super_btn.menu.addMenuItem(this.emojiCategories[i].super_item);
    }
  }

  _renderPanelMenuHeaderBox() {
    this._buttonMenuItem = new PopupMenu.PopupBaseMenuItem({
      reactive: false,
      can_focus: false,
    });
    for (let i = 0; i < this.emojiCategories.length; i++) {
      this._buttonMenuItem.add_child(this.emojiCategories[i].getButton());
    }
  }

  toggleMenu() {
    const windowLocation = this._settings.get_string("window-location");

    if (this.super_btn.menu.isOpen) {
      this.super_btn.menu.close();
      return;
    }

    if (!this._cursorAnchor) {
      this._cursorAnchor = new St.Widget({
        width: 1,
        height: 1,
        opacity: 0,
        reactive: false,
      });
      Main.uiGroup.add_child(this._cursorAnchor);
    }

    if (windowLocation === "cursor") {
      let x, y;
      [x, y] = global.get_pointer();

      const margin = 10;
      const clampedX = Math.max(margin, Math.min(x, global.stage.width - margin));
      const clampedY = Math.max(margin, Math.min(y, global.stage.height - margin));

      this._cursorAnchor.set_position(clampedX, clampedY);
      this.super_btn.menu.sourceActor = this._cursorAnchor;
    } else {
      this.super_btn.menu.sourceActor = this.super_btn;
    }

    this.super_btn.menu.open(true);
  }

  _onOpenStateChanged(_, open) {
    if (open) {
      // The clipboard still holds whatever was copied before opening the
      // menu; the first "append" selection must not append to it.
      this.clipboardOwned = false;
    }
    this.super_btn.visible = open || this._settings.get_boolean("always-show");
    this.clearCategories();
    this.searchItem.searchEntry.set_text("");

    this.timeoutSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 20, () => {
      if (open) {
        global.stage.set_key_focus(this.searchItem.searchEntry);
      }
      this.timeoutSourceId = null;
      return GLib.SOURCE_REMOVE;
    });
  }

  updateStyle() {
    this.searchItem.updateStyleRecents();
    this.emojiCategories.forEach(function (c) {
      c.updateStyle();
    });
  }

  updateNbCols() {
    let nbCols = this._settings.get_int("nbcols");
    this.emojiCategories.forEach(function (c) {
      c.setNbCols(nbCols);
    });

    // Update in place: recreating the EmojiSearchItem would remove the
    // search entry and recents row from the menu without re-adding them.
    this.searchItem.setNbCols(nbCols);
  }

  _bindShortcut() { /* handled by spotlight keybinding manager */ }


    destroy() {
        if (this.searchItem) this.searchItem.saveRecents();

        if (this._cursorAnchor) {
            Main.uiGroup.remove_child(this._cursorAnchor);
            this._cursorAnchor.destroy();
            this._cursorAnchor = null;
        }

        if (this._settings) this._settings.disconnectObject(this);
        if (this.super_btn) {
            this.super_btn.menu.disconnectObject(this);
        }

        if (this.timeoutSourceId) {
            GLib.Source.remove(this.timeoutSourceId);
            this.timeoutSourceId = null;
        }

        if (this.sqlite) { this.sqlite.destroy(); this.sqlite = null; }
        if (this.searchItem) { this.searchItem.destroy(); this.searchItem = null; }
        if (this.emojiCategories) {
            this.emojiCategories.forEach((c) => c.destroy());
            this.emojiCategories = null;
        }
        EmojiButton.destroyTooltip();
        if (this._buttonMenuItem) {
            this._buttonMenuItem.destroy();
            this._buttonMenuItem = null;
        }
        if (this.super_btn) {
            this.super_btn.destroy();
            this.super_btn = null;
        }
        this._settings = null;
    }
}

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { registerClass } from '../common/gjs.js';
import {
	get_first_visible_child,
	get_last_visible_child,
	get_n_visible_children,
	get_next_visible_sibling,
	get_previous_visible_sibling,
} from '../misc/actor.js';
import { ClipboardItem } from './items/clipboardItem.js';
import { State, StatusItem } from './items/statusItem.js';
import { SearchChange } from './searchEntry.js';

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

let ClipboardScrollContainer = class ClipboardScrollContainer extends St.BoxLayout {
	_statusItem;
	_lastFocus = null;
	_lastQuery = null;

	constructor(ext) {
		super({
			style_class: 'clipboard-item-list',
			x_align: Clutter.ActorAlign.START,
			x_expand: false,
		});
		this._statusItem = new StatusItem(ext);
		this.updateVisible();
	}

	updateVisible() {
		const n = get_n_visible_children(this);
		if (n === 0) {
			this.add_child(this._statusItem);
			this.x_align = Clutter.ActorAlign.CENTER;
			this.x_expand = true;
			if (this.get_n_children() === 1) {
				this._statusItem.state = State.Empty;
			} else {
				this._statusItem.state = State.NoResults;
			}
		} else if (n >= 2 && this._statusItem.get_parent() !== null) {
			this.remove_child(this._statusItem);
			this.x_align = Clutter.ActorAlign.START;
			this.x_expand = false;
		}
		this.updatePseudoclasses();
	}

	removePseudoclasses() {
		get_first_visible_child(this)?.remove_style_pseudo_class('first-child');
		get_last_visible_child(this)?.remove_style_pseudo_class('last-child');
	}

	updatePseudoclasses() {
		get_first_visible_child(this)?.add_style_pseudo_class('first-child');
		get_last_visible_child(this)?.add_style_pseudo_class('last-child');
	}

	nextFocus(child, animate = true) {
		if (child.get_parent() !== this) return;
		const newFocus = get_next_visible_sibling(child) ?? get_previous_visible_sibling(child);
		if (newFocus && newFocus !== this._statusItem) {
			this.focusChild(newFocus, animate);
		} else {
			// Navigate to the search entry
			global.focus_manager.get_group(this).grab_key_focus();
		}
	}

	focusChild(child, animate = true) {
		if (child.get_parent() !== this) return;
		this._lastFocus = child;
		child.grab_key_focus();
		this.scrollToChild(child, animate);
	}

	scrollToFocus(animate = true) {
		for (const child of this.get_children()) {
			if (child.has_key_focus()) {
				this._lastFocus = child;
				this.scrollToChild(child, animate);
				return;
			}
		}
	}

	scrollToChild(child, animate = true) {
		if (child.get_parent() !== this) return;
		const box = child.get_allocation_box();
		let adjustment;
		let value;
		if (this.orientation === Clutter.Orientation.HORIZONTAL) {
			adjustment = this.hadjustment;
			value = box.x1 + box.get_width() * 0.5 - adjustment.page_size * 0.5;
		} else {
			adjustment = this.vadjustment;
			value = box.y1 + box.get_height() * 0.5 - adjustment.page_size * 0.5;
		}
		if (this.text_direction === Clutter.TextDirection.RTL) {
			value = adjustment.get_upper() - adjustment.page_size - value;
		}
		if (animate) {
			adjustment.ease(value, { duration: 150, mode: Clutter.AnimationMode.EASE_OUT_QUAD });
		} else {
			adjustment.value = value;
		}
	}

	addItem(item) {
		this.insertOrMoveItem(item);
		if (this._lastQuery) {
			item.search(this._lastQuery);
		}

		// Move item when datetime changes
		item.entry.connect('notify::datetime', () => this.insertOrMoveItem(item));

		// Delete item when deleted
		item.entry.connect('delete', () => this.removeItem(item));

		// Update search when entry changes
		item.entry.connect('notify', () => this.updateSearch(item));
	}

	insertOrMoveItem(item) {
		this.removePseudoclasses();
		if (item.get_parent() === this) this.remove_child(item);
		let i = 0;
		for (const c of this.get_children()) {
			if (c instanceof ClipboardItem && c.entry.datetime.compare(item.entry.datetime) <= 0) {
				this.insert_child_at_index(item, i);
				break;
			}
			i++;
		}
		if (i === this.get_n_children()) {
			this.add_child(item);
		}
		this.updateSearch(item);
		this.updateVisible();
	}

	clearItems() {
		let focus = false;
		for (const child of this.get_children()) {
			if (child instanceof ClipboardItem) {
				focus ||= child.has_key_focus();
				this.remove_child(child);
			}
		}
		this.updateVisible();
		if (focus) {
			// Navigate to the search entry
			global.focus_manager.get_group(this).navigate_focus(this, St.DirectionType.UP, true);
		}
	}

	removeItem(child) {
		if (child.get_parent() !== this) return;
		const hasKeyFocus = child.has_key_focus();
		let newFocus = null;
		if (hasKeyFocus) {
			newFocus = get_next_visible_sibling(child) ?? get_previous_visible_sibling(child);
		}
		this.remove_child(child);
		this.updateVisible();
		if (hasKeyFocus) {
			if (newFocus && newFocus !== this._statusItem) {
				this.focusChild(newFocus);
			} else {
				this._lastFocus = null;

				// Navigate to the search entry
				global.focus_manager.get_group(this).navigate_focus(this, St.DirectionType.UP, true);
			}
		}
	}

	selectItem(index) {
		let i = 0;
		for (const child of this.get_children()) {
			if (child instanceof ClipboardItem && child.visible) {
				if (i === index) {
					this.focusChild(child);
					return true;
				}
				i++;
			}
		}
		return false;
	}

	selectNextItem() {
		let focusChild = null;
		for (const child of this.get_children()) {
			if (focusChild === null && child instanceof ClipboardItem && child.visible) {
				focusChild = child;
			}
			if (child.has_key_focus()) {
				this.nextFocus(child);
				return;
			}
		}
		if (focusChild !== null) {
			this.focusChild(focusChild);
		}
	}

	search(query) {
		// Copy search query, but with SearchChange.Different to always force re-search
		this._lastQuery = query.withChange(SearchChange.Different);
		this.removePseudoclasses();
		let focusChild = null;
		let firstVisible = null;
		for (const child of this.get_children()) {
			if (child instanceof ClipboardItem) {
				const hasFocus = child.has_key_focus();
				child.search(query);
				if (hasFocus) focusChild = child;
				if (child.visible && firstVisible === null) firstVisible = child;
			}
		}
		this.updateVisible();
		if (focusChild && focusChild.visible) {
			this.focusChild(focusChild, false);
		} else if (this._lastFocus && this._lastFocus.visible) {
			this.scrollToChild(this._lastFocus, false);
		} else if (firstVisible !== null) {
			this.focusChild(firstVisible, false);
		}
	}

	updateSearch(item) {
		if (!this._lastQuery) return;
		const hasKeyFocus = item.has_key_focus();
		this.removePseudoclasses();
		item.search(this._lastQuery);
		this.updateVisible();
		if (hasKeyFocus && !item.visible) this.nextFocus(item, false);
	}

	activateFirst() {
		const first = get_first_visible_child(this);
		if (first instanceof St.Button) {
			first.vfunc_clicked(1);
		}
	}

	vfunc_navigate_focus(from, direction) {
		// Navigation from the search entry
		if (from?.get_parent() !== this) {
			// If tab navigation is used, then focus on first or last child
			if (direction === St.DirectionType.TAB_FORWARD || direction === St.DirectionType.TAB_BACKWARD) {
				this._lastFocus = null;
				const child =
					direction === St.DirectionType.TAB_BACKWARD
						? get_last_visible_child(this)
						: get_first_visible_child(this);
				if (child !== this._statusItem) {
					this._lastFocus = child;
				}
			}

			// If the last focus is null or not visible, then focus the first visible child
			if (this._lastFocus === null || !this._lastFocus.visible || this._lastFocus.get_parent() !== this) {
				this._lastFocus = null;
				const child = get_first_visible_child(this);
				if (child !== this._statusItem) {
					this._lastFocus = child;
				}
			}

			// Navigate to the search entry
			if (!this._lastFocus) return Clutter.EVENT_PROPAGATE;
			this._lastFocus.grab_key_focus();
			this.scrollToChild(this._lastFocus);
			return Clutter.EVENT_STOP;
		}
		const first = get_first_visible_child(this);
		const last = get_last_visible_child(this);
		if (this.orientation === Clutter.Orientation.HORIZONTAL) {
			// If up or shift tab navigation then focus the search entry
			if (direction === St.DirectionType.UP) {
				this._lastFocus = from;

				// Navigate to the search entry
				return Clutter.EVENT_PROPAGATE;
			}

			// Ignore down navigation
			if (direction === St.DirectionType.DOWN) {
				return Clutter.EVENT_STOP;
			}
		} else {
			// If on the first child then focus the search entry
			if (from === first && direction === St.DirectionType.UP) {
				this._lastFocus = from;

				// Navigate to the search entry
				return Clutter.EVENT_PROPAGATE;
			}

			// If on the last child then focus on footer
			if (from === last && direction === St.DirectionType.DOWN) {
				this._lastFocus = from;
				return Clutter.EVENT_PROPAGATE;
			}

			// Ignore left and right navigation
			if (direction === St.DirectionType.LEFT || direction === St.DirectionType.RIGHT) {
				return Clutter.EVENT_STOP;
			}
		}

		// If on first child and shift tab navigation then focus the search entry
		if (from === first && direction === St.DirectionType.TAB_BACKWARD) {
			this._lastFocus = from;

			// Navigate to the search entry
			return Clutter.EVENT_PROPAGATE;
		}

		// If on last child and tab navigation then focus the footer
		if (from === last && direction === St.DirectionType.TAB_FORWARD) {
			this._lastFocus = from;

			// Navigate to footer
			return Clutter.EVENT_PROPAGATE;
		}

		// Otherwise map navigation to tab navigation due to weird behavior for a larger number of items
		const tabDirection =
			direction === St.DirectionType.TAB_FORWARD ||
			direction === St.DirectionType.RIGHT ||
			direction === St.DirectionType.DOWN
				? St.DirectionType.TAB_FORWARD
				: St.DirectionType.TAB_BACKWARD;
		const res = super.vfunc_navigate_focus(from, tabDirection);
		this.scrollToFocus();
		return res;
	}

	vfunc_map() {
		this._lastFocus = null;
		this.hadjustment.value = 0;
		this.vadjustment.value = 0;
		super.vfunc_map();
	}
};
ClipboardScrollContainer = __decorate([registerClass()], ClipboardScrollContainer);

export { ClipboardScrollContainer };

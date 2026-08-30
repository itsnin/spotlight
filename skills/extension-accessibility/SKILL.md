---
name: extension-accessibility
description: Accessibility implementation using Atk. Roles, states, relationships, and common patterns for custom widgets.
---

# accessibility

accessibility is a hard requirement of a proper user interface not an optional feature

clutter and st have built in support which means it works by default for standard widgets

if it does not work there is a bug in your code

## basic concepts

the library used is atk and `St.Widget` includes convenience methods and properties

### roles

`Atk.Role` represents the primary purpose of an element

set via `St.Widget:accessible-role` property

common roles:
- `Atk.Role.BUTTON`
- `Atk.Role.CHECK_BOX`
- `Atk.Role.CHECK_MENU_ITEM`
- `Atk.Role.MENU_ITEM`
- `Atk.Role.LABEL`
- `Atk.Role.RADIO_BUTTON`

some roles depend on other widgets for example a menu item should have role `Atk.Role.CHECK_MENU_ITEM` if it has a child with role `Atk.Role.CHECK_BUTTON`

### relationships

`Atk.RelationType` establishes meaningful links between elements

the most common is handled automatically by `St.Widget:label-actor` property which should be set to a widget with role `Atk.Role.LABEL` like `St.Label`

for other relationships use:
```javascript
actor.get_accessible().add_relationship(relationType, target);
actor.get_accessible().remove_relationship(relationType, target);
```

### states

`Atk.StateType` determines the current state of an element

common states many handled automatically by clutter and st:
- `Atk.StateType.SENSITIVE` — based on `Clutter.Actor:reactive`
- `Atk.StateType.VISIBLE` — based on `Clutter.Actor:visible`
- `Atk.StateType.FOCUSABLE` — based on `St.Widget:can-focus`
- `Atk.StateType.CHECKED` — watches css pseudo class `checked`
- `Atk.StateType.SELECTED` — watches css pseudo class `selected`

manage states explicitly:
```javascript
widget.add_accessible_state(Atk.StateType.CHECKED);
widget.remove_accessible_state(Atk.StateType.CHECKED);
```

## example accessible switch

```javascript
const Switch = GObject.registerClass({
    Properties: {
        'state': GObject.ParamSpec.boolean(
            'state', 'state', 'state',
            GObject.ParamFlags.READWRITE,
            false),
    },
}, class Switch extends St.Bin {
    constructor(state) {
        super({
            style_class: 'toggle-switch',
            accessible_role: Atk.Role.CHECK_BOX,
            state,
        });
        this._state = false;
    }

    get state() {
        return this._state;
    }

    set state(state) {
        if (this._state === state)
            return;
        if (state)
            this.add_style_pseudo_class('checked');
        else
            this.remove_style_pseudo_class('checked');
        this._state = state;
        this.notify('state');
    }
});
```

## testing

basic testing before release is usually sufficient for standard widgets

if building custom widgets verify roles states and relationships are set correctly

## source

extracted from gjs.guide accessibility documentation verified via docs-gnome-extension repo

---
name: extension-styling
description: Stylesheet conventions, St CSS limitations, box model properties, and what must be set via style vs constructor properties.
---

# styling

## css comment format

st only supports `/* */` block comments it does not support `//` line comments

using `//` in stylesheet.css will break parsing

```css
/* correct comment format */
```

## box model properties are css not gobject

these properties must be set via the `style` property not in the constructor

- `padding_top` `padding_bottom` `padding_left` `padding_right`
- `margin_top` `margin_bottom` `margin_left` `margin_right`
- `spacing` on `St.BoxLayout`

```javascript
// correct via style property
box.style = 'spacing: 10px; padding: 8px;';

// wrong will throw error
// new St.BoxLayout({ spacing: 10 }) — no such gobject property
```

## st boxlayout orientation

use `set_vertical(true)` after `_init()` not `orientation` in the constructor

the `orientation` property is not reliably settable on gnome shell 45 and 46

```javascript
const box = new St.BoxLayout();
box.set_vertical(true);
```

## common style properties

```css
.spotlight-entry {
    background-color: #1c1c1e;
    color: #f5f5f7;
    border-radius: 14px;
    padding: 8px 12px;
    font-size: 14px;
    spacing: 10px;
}
```

## style classes vs inline style

prefer style classes defined in `stylesheet.css` for reusable styling

use inline `actor.style` only for dynamic or one-off adjustments

## icon guidelines

shell ui: use `St.Icon` or `icon_name` properties
preferences ui: use `Gtk.Image`

never use unicode emojis as icons

## source

extracted from gjs.guide documentation and verified project patterns via docs-gnome-extension repo

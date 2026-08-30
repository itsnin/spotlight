---
name: extension-translations
description: Gettext translation system for GNOME Shell extensions. Covers marking strings, initialization, and POT file generation.
---

# translations

## initialize via metadata.json

the recommended method is defining `gettext-domain` in `metadata.json`

```json
{
    "gettext-domain": "example@gjs.guide"
}
```

gnome shell automatically initializes translations when the extension loads

## import translation functions

```javascript
import {Extension, gettext as _, ngettext, pgettext} from 'resource:///org/gnome/shell/extensions/extension.js';
```

## marking strings for translation

### `_()` or `gettext()` — most common

```javascript
const title = _('Notification');
```

### `ngettext()` — plural forms

```javascript
const body = ngettext(
    'You have been notified %d time',
    'You have been notified %d times',
    count
).format(count);
```

### `pgettext()` — context for translators

used when the same word could mean different things

```javascript
menu.addAction(pgettext('menu item', 'Notify'), callback);
```

## string interpolation with format()

for translatable strings with interpolated values use `String.prototype.format()` not template literals

```javascript
_('Hello %s').format(name);  // correct for translations
`Hello ${name}`;             // wrong xgettext cannot extract this properly
```

## generating the pot template

```bash
xgettext --from-code=UTF-8 --output=po/example@gjs.guide.pot *.js
```

regenerate the pot file whenever translatable strings are added or removed

## compiling translations

use gnome-extensions tool with `--podir` option when packing

```bash
gnome-extensions pack --podir=po example@gjs.guide
```

## rtl considerations

when designing ui remember translations may be right to left not just left to right

## source

extracted from gjs.guide translations documentation verified via docs-gnome-extension repo

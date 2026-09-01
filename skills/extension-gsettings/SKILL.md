---
name: extension-gsettings
description: GSettings schema conventions, key binding, metadata integration, and schema file requirements.
---

# gsettings

## schema id and path conventions

schema id must start with `org.gnome.shell.extensions`
schema path must start with `/org/gnome/shell/extensions/`

```xml
<schema id="org.gnome.shell.extensions.example" path="/org/gnome/shell/extensions/example/">
```

## schema filename

the schema xml filename must follow the pattern `<schema-id>.gschema.xml`

```
schemas/org.gnome.shell.extensions.example.gschema.xml
```

## define settings-schema in metadata.json

the recommended method is defining `settings-schema` in `metadata.json`

```json
{
    "settings-schema": "org.gnome.shell.extensions.example"
}
```

then use `this.getSettings()` without any parameters

```javascript
export default class ExampleExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
    }
}
```

do not repeat the schema id as a module level constant it can drift out of sync

## binding to properties

simple types can be bound directly to gobject properties

```javascript
this._settings.bind('show-indicator', this._indicator, 'visible',
    Gio.SettingsBindFlags.DEFAULT);
```

## listening for changes

```javascript
this._settings.connect('changed::show-indicator', (settings, key) => {
    // handle change
});
```

## never ship compiled schema

`schemas/gschemas.compiled` must not go into the extension zip

ego compiles schemas server side for 45+ packages

add `schemas/gschemas.compiled` to `.gitignore`

## compiling locally for testing

```bash
glib-compile-schemas schemas/
```

## common key types

| type | xml | get method |
|---|---|---|
| boolean | `type="b"` | `get_boolean()` |
| integer | `type="i"` | `get_int()` |
| string | `type="s"` | `get_string()` |
| string array | `type="as"` | `get_strv()` |
| double | `type="d"` | `get_double()` |

## prefixed settings pattern

when multiple features share one schema use key name prefixes like `clipboard-` `emoji-`

wrap `Gio.Settings` with a utility class that transparently prepends the prefix

critical rule: every consumer of feature-specific settings must receive the wrapped instance

never pass raw `Gio.Settings` to a view or manager that expects prefixed keys

this is a common crash source: the view calls `get_boolean('regex-search')` on raw settings

but the schema only has `'clipboard-regex-search'` → "GSettings key not found" crash

wrong:
```javascript
// manager wraps its own copy, but view gets raw
this._manager = new ClipboardManager(new PrefixedSettings(this._settings, 'clipboard-'));
this._view = new ClipboardView(this._manager, this._settings); // ❌ raw! crashes
```

right:
```javascript
// both manager and view receive the same wrapped settings
const clipboardSettings = new PrefixedSettings(this._settings, 'clipboard-');
this._manager = new ClipboardManager(clipboardSettings);
this._view = new ClipboardView(this._manager, clipboardSettings); // ✅ wrapped
```

or have the view consistently ask the manager for its already-wrapped settings:
```javascript
// inside view methods, use manager.getSettings() which returns wrapped
const useRegex = this._manager.getSettings().get_boolean(PrefsFields.REGEX_SEARCH);
```

## source

extracted from gjs.guide preferences and review guidelines verified via docs-gnome-extension repo

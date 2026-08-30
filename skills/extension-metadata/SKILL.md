---
name: extension-metadata
description: metadata.json field reference, conventions, validation rules, and common pitfalls.
---

# metadata.json

## required fields

### uuid

globally unique identifier format `extension-id@namespace`

both parts must only contain letters numbers period underscore hyphen

must not use `gnome.org` as namespace

common patterns:
- `name@username.github.io`
- `name@username.gmail.com`

the extension directory name must match the uuid exactly

### name

short descriptive string like click to focus adblock

should not conflict with another extension if it is a fork it must have a unique name

### description

single sentence explanation of what the extension does

may contain line breaks with `\n` and bullet lists with `*`

### shell-version

array of strings describing supported gnome shell versions

gnome 40+ use just the major version like `"45"`

our project supports `["45", "46", "47", "48", "49", "50"]`

must only contain stable releases and up to one development release

must not claim to support future versions not yet released

### url

link to a git repository where users can report problems

required for submission to extensions.gnome.org

## optional fields

### gettext-domain

gettext translation domain usually the uuid itself

### settings-schema

gio settings schema id used by `this.getSettings()` when called without parameters

### session-modes

array of session modes supported

drop this field entirely if only using `user` mode which is the default

valid values: `user` `unlock-dialog` `gdm`

`unlock-dialog` requires justification during review and keyboard signals must be disconnected in that mode

### version

deprecated set by ego internally

developers should not set this field

### version-name

user visible version string

max 16 characters
letters numbers space period only
must contain at least one letter or number

pattern: `^(?!^[. ]+$)[a-zA-Z0-9 .]{1,16}$`

### donations

object with donation links

possible keys: `buymeacoffee` `custom` `github` `kofi` `liberapay` `opencollective` `patreon` `paypal`

drop this field entirely if not using any donation keys

## complete example

```json
{
    "uuid": "spotlight@nin",
    "name": "Spotlight",
    "description": "Compact keyboard-driven launcher",
    "shell-version": [ "45", "46", "47", "48", "49", "50" ],
    "url": "https://github.com/itsnin/spotlight",
    "gettext-domain": "spotlight",
    "settings-schema": "org.gnome.shell.extensions.spotlight",
    "version-name": "2026.08.30"
}
```

## source

extracted from gjs.guide anatomy and review guidelines verified via docs-gnome-extension repo

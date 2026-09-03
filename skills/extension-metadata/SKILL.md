# extension-metadata

## Required Fields
`uuid`, `name`, `description`, `shell-version`, `url`.

## UUID Format
`extensionname@domain` — unique email-like format. Matches the directory name.

## Shell Version
Array of strings: `'45'`, `'46'`, `'47'`, `'48'`, `'49'`, `'50'`.

## Settings Schema
`settings-schema` field is optional. Defaults to `org.gnome.shell.extensions.<uuid>`.

## Version Name
String up to 16 characters. Shown on EGO.

## Gettext Domain
`gettext-domain` field required for translations.

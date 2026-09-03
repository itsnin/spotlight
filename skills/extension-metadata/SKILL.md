# extension-metadata

## Required fields
uuid, name, description, shell-version, url.

## UUID format
extensionname@domain — unique email-like format. Matches directory name.

## Shell version
Array of strings: '45', '46', '47', '48', '49', '50'.

## Settings schema
settings-schema field optional. Defaults to org.gnome.shell.extensions.<uuid>.

## Version name
String up to 16 characters. Shown on EGO.

## Gettext domain
gettext-domain field required for translations.

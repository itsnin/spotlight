---
name: extension-review-guidelines
description: Official EGO review guidelines. What gets rejected, hard requirements, metadata rules, and legal restrictions.
---

# ego review guidelines

these are the actual rules extensions.gnome.org reviewers apply

## the three basic guidelines

1. do not create or modify anything before `enable()` is called
2. use `enable()` to create objects connect signals and add main loop sources
3. use `disable()` to cleanup anything done in `enable()`

## hard rules that cause rejection

### initialization only for static resources

must not create any gobject instances connect signals or add main loop sources during initialization

### destroy all objects

any objects or widgets created must be destroyed in `disable()`

### disconnect all signals

any signal connections made must be disconnected in `disable()`

### remove main loop sources

any main loop sources created must be removed in `disable()` even one shot ones

### no deprecated modules

must not import `ByteArray` `Lang` `Mainloop`

### process isolation

shell process must not import `Gdk` `Gtk` or `Adw`
prefs process must not import `Clutter` `Meta` `St` or `Shell`

### code must not be obfuscated

must be readable and reviewable javascript
must not be minified or obfuscated
typescript must transpile to well formatted javascript

### no excessive logging

must not print excessively to the log

### no run_dispose unless necessary

should not call `GObject.Object.run_dispose()` unless absolutely necessary
if used must have a comment explaining the real world situation

### no telemetry

must not use any telemetry tools to track users

## metadata.json requirements

- uuid must be `extension-id@namespace` format
- must not use `gnome.org` as namespace
- shell-version must only contain stable releases
- url must link to a repository
- session-modes must be dropped if only using user mode
- version field deprecated do not set it ego controls this
- version-name max 16 characters letters numbers space period only

## gsettings schema requirements

- schema id must use `org.gnome.shell.extensions` base
- schema path must use `/org/gnome/shell/extensions` base
- schema xml file must be included in zip
- schema filename must follow `<schema-id>.gschema.xml` pattern

## clipboard access rules

- must declare clipboard access in description
- must not share clipboard data with third party without explicit user interaction
- must not ship with default keyboard shortcuts for clipboard interaction

## legal

- derived works must be gpl compatible gpl 2.0 or later gpl 3.0 or later
- code from other extensions must include attribution
- must not include copyrighted or trademarked content without permission
- must not promote political agendas
- subject to gnome code of conduct

## recommendations not hard rules

- use a linter
- follow gnome hig for preferences ui
- do not include unnecessary files build scripts po files unused media
- split logic into modules not one large file

## source

extracted from official gjs.guide review guidelines verified via docs-gnome-extension repo

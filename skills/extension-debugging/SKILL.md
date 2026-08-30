---
name: extension-debugging
description: Debugging tools and techniques: Looking Glass, journalctl, nested shell sessions, environment variables, and GDB.
---

# debugging

## environment variables

### SHELL_DEBUG=backtrace-warnings

prints javascript stack trace for every warning or critical message

```bash
export SHELL_DEBUG=backtrace-warnings
```

corresponds to `console.warn()` and `console.error()` log levels

### SHELL_DEBUG=backtrace-segfaults

prints javascript stack before exiting on fatal errors

### SHELL_DEBUG=all

enables all debug options

## logging

### recommended functions

- `console.debug()` — development only information level debug
- `console.warn()` — unexpected errors that may indicate a bug
- `console.error()` — programmer errors and assertion failures

keep logging to a minimum excessive logging makes debugging other applications harder

### viewing logs

```bash
# shell process logs
journalctl -f -o cat /usr/bin/gnome-shell

# prefs process logs
journalctl -f -o cat /usr/bin/gjs
```

## looking glass

built in debugger and inspector press alt+f2 then type `lg`

features:
- evaluator — repl that runs arbitrary javascript in the shell process
- windows — inspect meta.window and shell.app objects
- extensions — list extensions view errors open source directories
- actors — browse all widgets as an object tree
- flags — clutter and mutter debugging options

pre defined globals in evaluator:
- `GLib` `GObject` `Gio` `Clutter` `Meta` `St` `Shell` `Main`
- `stage` alias for `global.stage`
- `inspect(x, y)` get actor at coordinates
- `r(index)` get return value of previous command

## wayland nested shell

```bash
dbus-run-session gnome-shell --devkit --wayland
```

gnome 49+ requires `mutter-devkit` package

## x11 restart

press alt+f2 then type `r`

wayland sessions cannot restart while logged in must logout and back in

## gdb advanced debugging

```bash
dbus-run-session -- gdb --args gnome-shell --devkit --wayland
```

at gdb prompt:
- `run` start the shell
- `call (void)gjs_dumpstack()` print javascript stack
- `set env G_DEBUG=fatal-criticals` break on critical errors

## gjs console

separate process without access to gnome shell useful only for testing pure javascript

```bash
gjs-console
```

## source

extracted from gjs.guide debugging documentation verified via docs-gnome-extension repo

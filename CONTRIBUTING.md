# contributing to spotlight

thanks for your interest in contributing

## getting started

1. clone it locally
2. make sure you have gnome shell 50 running
3. copy the extension to your local extensions directory to test

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/spotlight@ninx
cp -r * ~/.local/share/gnome-shell/extensions/spotlight@ninx/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/spotlight@ninx/schemas/
```

4. restart gnome shell and enable the extension

```bash
gnome-extensions enable spotlight@ninx
```

## code style

- all comments must be lowercase with no punctuation
- no block comment boxes or jsdoc blocks
- use plain // comments only
- explain why not what
- do not wrap standard api calls in try-catch blocks
- do not use optional chaining for guaranteed methods
- keep enable and disable next to each other
- split logic into modules keep the entry point small

## testing before submitting

run shexli to check for review issues

```bash
pip install shexli
shexli path/to/extension
```

the result should be 0 errors and 0 warnings

also test with gjs to make sure the code parses

```bash
gjs -c "Reflect.parse(readFile('extension.js'), { target: 'module' })"
```

## submitting changes

1. make your changes following the code style above
2. test locally on gnome shell 50
3. run shexli and fix any issues
4. open a pull request with a clear description of what you changed and why

## reporting bugs

open an issue on github with
- gnome shell version
- distro
- steps to reproduce
- expected behavior vs actual behavior
- any relevant logs from `journalctl -b /usr/bin/gnome-shell | grep spotlight`

# Testing and Linting
## Automated Checks
These are non-negotiable for every change.
```bash
# JavaScript syntax check — every file
for f in $(find . -name "*.js" -not -path "./.git/*" -not -path "./.agent/skills/*"); do
    node --check "$f"
done
# Schema compilation
glib-compile-schemas --strict schemas/
# YAML lint
yamllint .github/ -c .yamllint
# Shell script lint
shellcheck scripts/*.sh
```
## CI Pipeline
The GitHub Actions workflow in `.github/workflows/ci.yml` runs these checks plus additional validators: metadata integrity, process isolation, deprecated import detection, GObject constructor property scan, CSS comment style, and skill directory existence.
## Manual Testing Checklist
Test on at least one supported GNOME Shell version (preferably 50 or 51) under Wayland:
- [ ] Extension enables without errors in journal
- [ ] `Ctrl+Space` opens the popup positioned correctly on the target monitor
- [ ] Typing shows results from at least apps and system actions
- [ ] `Enter` activates a result and closes the popup
- [ ] `Esc` closes the popup
- [ ] Clicking outside closes the popup
- [ ] Opening a web search result closes the popup and focuses the browser
- [ ] `Ctrl+Space` toggles closed when popup is open
- [ ] Preferences window opens and all three pages work
- [ ] Changing shortcut in prefs actually changes the binding
- [ ] Dark/Light/Default theme modes all work
- [ ] Live theme switching works when set to Default
- [ ] Extension disables cleanly, widgets return to Overview
- [ ] Enable → Disable → Enable cycle works without restarting the shell
- [ ] Opening Spotlight inside Overview and typing does not produce a black screen
## Debugging Aids
- **Looking Glass**: Press `Alt+F2`, type `lg`, go to Extensions tab. Inspect `Main.extensionManager.lookup('spotlight@nin').stateObj`
- **Nested shell**: Run a nested Wayland session for safer testing: `dbus-run-session -- gnome-shell --nested --wayland`
- **Schema reload**: After changing the schema XML, run `glib-compile-schemas schemas/` and restart the shell
- **Journal**: `journalctl -f /usr/bin/gnome-shell | grep -i spotlight`

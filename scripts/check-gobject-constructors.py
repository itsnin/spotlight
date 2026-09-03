#!/usr/bin/env python3
import re, os, sys

violations = []
for root, dirs, files in os.walk('.'):
    if '.git' in root:
        continue
    for fn in files:
        if not fn.endswith('.js'):
            continue
        fp = os.path.join(root, fn)
        with open(fp, 'r', errors='replace') as f:
            c = f.read()
        for m in re.finditer(r'new (St|Clutter|Gio|Adw|Gtk|GObject|Meta|Shell)\.([A-Za-z]+)\(\{([^}]*)\}', c):
            params = m.group(3)
            for prop in re.findall(r'^\s*(_[a-zA-Z_][a-zA-Z0-9_]*)\s*:', params, re.MULTILINE):
                line_no = c[:m.start()].count('\n') + 1
                violations.append(f'  {fp}:{line_no}, {m.group(1)}.{m.group(2)}({{ {prop}: ... }})')

if violations:
    print('ERROR: found JS-only properties in GObject constructors:')
    for v in violations:
        print(v)
    print('Fix: assign as item._prop = value AFTER construction, not inside constructor params')
    sys.exit(1)
else:
    print('No GObject constructor property violations found')

#!/usr/bin/env python3
import json, sys

m = json.load(open('metadata.json'))

# UUID consistency
schema = m['settings-schema']
import glob
schema_files = glob.glob('schemas/*.gschema.xml')
found = False
for sf in schema_files:
    with open(sf) as f:
        if schema in f.read():
            found = True
            break
if not found:
    print(f'ERROR: schema {schema} not found in schema files')
    sys.exit(1)

# version-name length
version = m['version-name']
if len(version) > 16:
    print(f'ERROR: version-name too long ({len(version)} > 16)')
    sys.exit(1)

# shell-version valid
valid = {'45','46','47','48','49','50'}
for v in m['shell-version']:
    if v not in valid:
        print(f'ERROR: invalid shell-version: {v}')
        sys.exit(1)

print(f'metadata OK: uuid={m["uuid"]} version={version} shell-version={m["shell-version"]}')

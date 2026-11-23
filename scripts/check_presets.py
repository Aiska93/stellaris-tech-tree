#!/usr/bin/env python3
"""Validate src/lib/presets.ts rating keys against src/data/techtree.json."""
import json
import re
import sys

SRC = "src/lib/presets.ts"
DATA = "src/data/techtree.json"

data = json.load(open(DATA))
techs = {t["k"]: t for t in data["techs"]}

src = open(SRC).read()
# extract the ratings blocks: id: "..." ... ratings: { key: "X", ... }
blocks = re.findall(
    r'id:\s*"([^"]+)"[\s\S]*?ratings:\s*\{([^}]*)\}', src
)

errors = 0
total = 0
seen_per_preset = {}
for pid, body in blocks:
    entries = re.findall(r'([A-Za-z0-9_]+):\s*"(S|A|B)"', body)
    keys = [k for k, _ in entries]
    seen_per_preset[pid] = len(keys)
    total += len(keys)
    for k in keys:
        if k not in techs:
            print(f"MISSING  {pid}: {k} not in techtree.json")
            errors += 1
    dupes = {k for k in keys if keys.count(k) > 1}
    for k in dupes:
        print(f"DUPLICATE {pid}: {k}")
        errors += 1

print(f"presets: {len(blocks)} | total ratings: {total} | errors: {errors}")
for pid, n in seen_per_preset.items():
    print(f"  {pid}: {n} rated techs")

# overlap matrix (presets should be different)
ids = list(seen_per_preset)
sets = {}
for pid, body in blocks:
    sets[pid] = set(re.findall(r'([A-Za-z0-9_]+):\s*"(?:S|A|B)"', body))
print("\noverlaps > 60% (suspect clones):")
clone_warn = 0
for i, a in enumerate(ids):
    for b in ids[i + 1:]:
        inter = len(sets[a] & sets[b])
        small = min(len(sets[a]), len(sets[b])) or 1
        if inter / small > 0.6:
            print(f"  {a} ~ {b}: {inter}/{small}")
            clone_warn += 1
if clone_warn == 0:
    print("  none")

sys.exit(1 if errors else 0)

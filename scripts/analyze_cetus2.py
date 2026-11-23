import json, re, collections

def load(fp):
    with open(fp) as f:
        return json.load(f)

def walk(node, out=None):
    if out is None:
        out = []
    if "key" in node and "name" in node and "tier" in node and "cost" in node:
        out.append(node)
    for c in node.get("children", []):
        walk(c, out)
    return out

base = "/home/z/my-project/stellaris-data/cetus-4.3.7"
all_techs = []
for fname in ["physics", "society", "engineering"]:
    data = load(f"{base}/{fname}.json")
    all_techs.extend(walk(data))

# Better regex: capture full DLC name up to ) or newline or quote
dlc_counts = collections.Counter()
tech_dlc = {}
for t in all_techs:
    pot = " || ".join(t.get("potential", []))
    wm = " || ".join(t.get("weight_modifiers", []))
    text = pot + " " + wm
    # DLC names like "Ancient Relics Story Pack", "The Machine Age", "Cosmic Storms"
    dlcs = set(re.findall(r"Has DLC ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)", text))
    # normalize trailing words
    norm = set()
    for d in dlcs:
        norm.add(d.strip())
    if norm:
        tech_dlc[t["key"]] = (t["name"], norm)
        for d in norm:
            dlc_counts[d] += 1

print(f"Techs with explicit DLC: {len(tech_dlc)}")
for d, c in sorted(dlc_counts.items(), key=lambda x: -x[1]):
    print(f"  {d}: {c}")

print("\nFull list of DLC-tagged techs:")
for key, (name, dlcs) in sorted(tech_dlc.items()):
    print(f"  {key} = {name} -> {sorted(dlcs)}")

# Also extract raw DLC name strings to see exact names in text
raw_names = collections.Counter()
for t in all_techs:
    pot = " || ".join(t.get("potential", []))
    wm = " || ".join(t.get("weight_modifiers", []))
    for m in re.findall(r"Has DLC (.+?)(?:\)|$|\n)", pot + "\n" + wm):
        raw_names[m.strip()] += 1
print("\nRaw DLC strings:", dict(raw_names))

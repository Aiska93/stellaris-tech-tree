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
    techs = walk(data)
    keys = set(t["key"] for t in techs)
    print(f"===== {fname.upper()}: {len(techs)} tech entries, {len(keys)} unique =====")
    rare = sum(1 for t in techs if t.get("is_rare"))
    danger = sum(1 for t in techs if t.get("is_dangerous"))
    start = sum(1 for t in techs if t.get("is_start_tech"))
    print(f"  is_rare={rare}, is_dangerous={danger}, is_start_tech={start}")
    cats = collections.Counter(t.get("category") for t in techs)
    print(f"  categories: {dict(cats)}")
    tiers = collections.Counter(t.get("tier") for t in techs)
    print(f"  tiers: {dict(sorted(tiers.items()))}")
    srcs = collections.Counter(t.get("source") for t in techs)
    print(f"  sources: {dict(srcs)}")
    all_techs.extend(techs)

print(f"\nTOTAL: {len(all_techs)} techs")

# DLC detection
dlc_counts = collections.Counter()
tech_dlc = {}
for t in all_techs:
    pot = " || ".join(t.get("potential", []))
    wm = " || ".join(t.get("weight_modifiers", []))
    text = pot + wm
    if "Has DLC" in text:
        dlcs = set(d.strip() for d in re.findall(r"Has DLC ([A-Za-z0-9 :'\.]+?)(?=[\s\(])", text))
        tech_dlc[t["key"]] = (t["name"], dlcs)
        for d in dlcs:
            dlc_counts[d] += 1

print(f"\nTechs with explicit 'Has DLC': {len(tech_dlc)}")
for d, c in sorted(dlc_counts.items(), key=lambda x: -x[1]):
    print(f"  {d}: {c}")

# anomalies
anoms = load(f"{base}/anomalies.json")
print(f"\nAnomalies: {len(anoms)} items")
acats = collections.Counter(a.get("area") for a in anoms)
print(f"  by area: {dict(acats)}")

# field names
fieldnames = collections.Counter()
for t in all_techs:
    for k in t.keys():
        fieldnames[k] += 1
print("\nfields:", dict(fieldnames))

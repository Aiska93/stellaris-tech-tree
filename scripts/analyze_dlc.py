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

all_techs = []
for fname in ["physics", "society", "engineering"]:
    data = load(f"/home/z/my-project/stellaris-data/{fname}.json")
    all_techs.extend(walk(data))

print(f"TOTAL techs: {len(all_techs)}")

# Find techs with DLC in potential
dlc_re = re.compile(r'Has DLC ([A-Za-z0-9 :\']+)')
tech_dlc = {}
for t in all_techs:
    pot = " || ".join(t.get("potential", []))
    wm = " || ".join(t.get("weight_modifiers", []))
    dlcs = set(dlc_re.findall(pot)) | set(dlc_re.findall(wm))
    if dlcs:
        tech_dlc[t["key"]] = (t["name"], dlcs)

print(f"\nTechs with DLC mentions: {len(tech_dlc)}")
by_dlc = collections.Counter()
for key, (name, dlcs) in tech_dlc.items():
    for d in dlcs:
        by_dlc[d] += 1
print("By DLC:", dict(by_dlc))

# Show examples for each DLC
seen = set()
for key, (name, dlcs) in tech_dlc.items():
    for d in dlcs:
        if d not in seen:
            seen.add(d)
            print(f"  e.g. {d}: {name} ({key})")

# anomalies structure
data = load("/home/z/my-project/stellaris-data/anomalies.json")
print("\nAnomalies: list of", len(data), "items")
print(json.dumps(data[0], indent=1)[:600])
categories = collections.Counter(a.get("category") for a in data)
print("anomaly categories:", dict(categories))

# check distinct field keys in techs
fieldnames = collections.Counter()
for t in all_techs:
    for k in t.keys():
        fieldnames[k] += 1
print("\nTech field names:", dict(fieldnames))

# check is_gestalt / is_event flags
gest = sum(1 for t in all_techs if t.get("is_gestalt"))
ev = sum(1 for t in all_techs if t.get("is_event"))
print(f"is_gestalt={gest}, is_event={ev}")

# check the tier=5 techs count and cost range
costs = [t["cost"] for t in all_techs]
print(f"cost range: {min(costs)} - {max(costs)}")

# sample rare tech names
rare_names = [t["name"] for t in all_techs if t.get("is_rare")][:10]
print("sample rare:", rare_names)

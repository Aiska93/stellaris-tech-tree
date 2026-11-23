import json, re, collections

def load(fp):
    with open(fp) as f:
        return json.load(f)

def walk(node, depth=0, out=None):
    if out is None:
        out = []
    is_tech = "key" in node and "name" in node and "tier" in node and "cost" in node
    if is_tech:
        out.append(node)
    for c in node.get("children", []):
        walk(c, depth + 1, out)
    return out

for fname in ["physics", "society", "engineering"]:
    data = load(f"/home/z/my-project/stellaris-data/{fname}.json")
    techs = walk(data)
    keys = set(t["key"] for t in techs)
    print(f"\n===== {fname.upper()}: {len(techs)} tech entries, {len(keys)} unique keys =====")
    # Rarity flags
    rare = sum(1 for t in techs if t.get("is_rare"))
    danger = sum(1 for t in techs if t.get("is_dangerous"))
    start = sum(1 for t in techs if t.get("is_start_tech"))
    print(f"is_rare={rare}, is_dangerous={danger}, is_start_tech={start}")
    # Categories
    cats = collections.Counter(t.get("category") for t in techs)
    print("categories:", dict(cats))
    # Tiers
    tiers = collections.Counter(t.get("tier") for t in techs)
    print("tiers:", dict(sorted(tiers.items())))
    # Sources
    srcs = collections.Counter(t.get("source") for t in techs)
    print("sources:", dict(srcs))
    # Search for DLC mentions anywhere in the JSON text
    with open(f"/home/z/my-project/stellaris-data/{fname}.json") as f:
        text = f.read()
    dlcs = set(re.findall(r'[A-Za-z ]*DLC[^\n"\\]*', text))
    print("DLC mentions:", list(dlcs)[:20])

# anomalies
data = load("/home/z/my-project/stellaris-data/anomalies.json")
print("\n===== ANOMALIES keys:", list(data.keys())[:10])
print(json.dumps(data, indent=1)[:800])

# check top-level structure of physics.json
data = load("/home/z/my-project/stellaris-data/physics.json")
print("\nTop-level keys:", list(data.keys()))
print("Top children:", [(c.get("name"), len(c.get("children", []))) for c in data.get("children", [])])

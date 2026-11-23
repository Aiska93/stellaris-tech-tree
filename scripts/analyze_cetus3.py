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
all_techs = {}
for fname in ["physics", "society", "engineering"]:
    data = load(f"{base}/{fname}.json")
    for t in walk(data):
        all_techs[t["key"]] = t

def show(key):
    t = all_techs.get(key)
    if t:
        print(f"{key} = {t['name']}")
        print(f"   potential: {t.get('potential')[:3]}")
    else:
        print(f"{key}: NOT FOUND")

# Utopia content after March 2026 free update
for k in ["tech_habitat_1", "tech_habitat_2", "tech_habitat_3", "tech_sentry_array", "tech_science_nexus",
          "tech_gene_seed_purification", "tech_mind_over_matter", "tech_transcendence"]:
    show(k)

# Synthetic Dawn content
print("\n--- machine empire techs ---")
me = [(k, t["name"]) for k, t in all_techs.items() if t.get("is_machine_empire")]
print(f"{len(me)} techs:", [n for _, n in me][:12])
show("tech_bio_reactor")

# Nemesis content
print("\n--- nemesis patterns ---")
for pat in ["menace", "espionage", "aetherophasic", "intel", "become_crisis"]:
    hits = [(k, t["name"]) for k, t in all_techs.items() if pat in k.lower()]
    if hits:
        print(f"  {pat}: {hits[:6]}")

# species packs
print("\n--- species pack patterns ---")
for pat in ["aquatic", "toxoid", "lithoid", "necroid", "plantoid", "humanoid", "radiotrophic", "catalytic", "clone"]:
    hits = [(k, t["name"]) for k, t in all_techs.items() if pat in k.lower()]
    if hits:
        print(f"  {pat}: {hits[:8]}")

# check tech keys containing dlc-ish hints
print("\n--- anomalies sample (event techs) ---")
anoms = load(f"{base}/anomalies.json")
print(f"{len(anoms)} anomaly techs")
rare_anom = sum(1 for a in anoms if a.get("is_rare"))
print(f"rare among them: {rare_anom}")
cats = collections.Counter(a.get("category") for a in anoms)
print("cats:", dict(cats))
print("sample:", [(a["name"], a["tier"], a["cost"]) for a in anoms[:6]])

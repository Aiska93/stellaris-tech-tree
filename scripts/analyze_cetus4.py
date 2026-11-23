import json, re

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
        pot = " | ".join(t.get("potential", []))
        wm = " | ".join(t.get("weight_modifiers", []))
        dlc = re.findall(r"Has DLC (.+?)(?:\)|$|\n)", pot + "\n" + wm)
        print(f"{key} = {t['name']}  DLC={dlc}")
        print(f"   potential: {t.get('potential')[:2]}")
    else:
        print(f"{key}: NOT FOUND")

print("=== Curated candidates ===")
for k in ["tech_titan_hull_1", "tech_titan_hull_2", "tech_nanite_assemblers",
          "tech_xeno_tourism_agency", "tech_executive_retreat",
          "tech_orbital_ring_tier_2", "tech_orbital_ring_tier_3",
          "tech_encryption_1", "tech_decryption_1", "tech_lgate_insight",
          "tech_mega_assembly", "tech_robomodding_m", "tech_graveyard_...",
          "tech_habitat_4", "tech_arcology", "tech_astral_planes_1"]:
    show(k)

# any tech keys with 'ring' or 'lgate'
print("\n=== ring/lgate/arcology keys ===")
for k in sorted(all_techs):
    if any(p in k for p in ["ring", "lgate", "l_gate", "arcolog", "habitat", "mega_"]):
        t = all_techs[k]
        print(f"  {k} = {t['name']}")

# Corporate authority techs
print("\n=== corporate/hive/machine authority potentials ===")
for k, t in sorted(all_techs.items()):
    pot = " ".join(t.get("potential", []))
    if "Corporate Authority" in pot:
        print(f"  CORPORATE: {k} = {t['name']}")
    if "Hive Mind Authority" in pot:
        print(f"  HIVE: {k} = {t['name']}")

# how many total unique DLC-tagged after normalization
dlc_map = {}
for k, t in all_techs.items():
    pot = " || ".join(t.get("potential", []))
    wm = " || ".join(t.get("weight_modifiers", []))
    text = pot + " " + wm
    names = re.findall(r"Has DLC (.+?)(?:\s*\|\||\)|$|\n)", text)
    if names:
        dlc_map[k] = sorted(set(n.strip() for n in names))
import collections
c = collections.Counter()
for v in dlc_map.values():
    for d in v:
        c[d] += 1
print("\nNormalized DLC tag counts:", dict(c.most_common()))
print(f"Total explicit: {len(dlc_map)}")

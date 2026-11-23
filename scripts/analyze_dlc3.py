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

all_techs = []
for fname in ["physics", "society", "engineering"]:
    data = load(f"/home/z/my-project/stellaris-data/{fname}.json")
    all_techs.extend(walk(data))

dlc_re = re.compile(r"Has DLC ([A-Za-z0-9 :' ]+?)\s*[)\n]|Has DLC ([A-Za-z0-9 :']+)")
print("=== Auto-detected techs with 'Has DLC' ===")
for t in all_techs:
    pot = " || ".join(t.get("potential", []))
    wm = " || ".join(t.get("weight_modifiers", []))
    text = pot + wm
    if "Has DLC" in text:
        dlcs = sorted(set(re.findall(r"Has DLC ([A-Za-z0-9 :\']+)", text)))
        print(f"  {t['key']} = {t['name']}  ->  {dlcs}")

print("\n=== is_drive_assimilator ===")
print([t["name"] for t in all_techs if t.get("is_drive_assimilator")])
print("\n=== is_rogue_servitor ===")
print([t["name"] for t in all_techs if t.get("is_rogue_servitor")])
print("\n=== is_machine_empire ===")
print([t["name"] for t in all_techs if t.get("is_machine_empire")])
print("\n=== is_hive_empire ===")
print([t["name"] for t in all_techs if t.get("is_hive_empire")])
print("\n=== is_megacorp ===")
print([t["name"] for t in all_techs if t.get("is_megacorp")])

# search for nemesis / intel / ops techs
for pat in ["intel", "ops", "spy", "covert", "stealth", "menace"]:
    hits = [t["name"] for t in all_techs if pat in t["key"].lower() or pat in t["name"].lower()]
    if hits:
        print(f"\npattern '{pat}': {hits}")

# count techs with tier 5
t5 = [t["name"] for t in all_techs if t["tier"] == 5]
print(f"\nTier 5 ({len(t5)}): {t5[:15]}")

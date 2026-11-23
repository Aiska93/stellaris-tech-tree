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

# Search for known DLC tech key patterns
patterns = {
    "Utopia habitats": r"habitat",
    "Utopia psionic ascension": r"mind_over_matter|transcendence|psionic",
    "Apocalypse": r"titan|_pk_|colossus|ion_cannon",
    "Overlord": r"hyper_relay|orbital_ring|overlord|bulwark|prospect",
    "Nemesis": r"menace|espionage|nemesis|aetherophasic",
    "Megacorp": r"branch_office|megacorp|strategic_coordination|executive",
    "Synthetic Dawn": r"machine|droid|synthetic|drone|assimilat|servitor",
    "Lithoids": r"lithoid",
    "Necroids": r"necroid|necro|undead",
    "Aquatics": r"aquatic|dragon|hydro|ocean_paradise|here_be",
    "Plantoids": r"plantoid|plant|phototrophic|ravenous",
    "Humanoids": r"humanoid",
    "Ancient Relics": r"archeo|relic|minor_artifact|ancrel",
    "Distant Stars": r"nanite|lgate|l_gate",
    "Federations": r"federat|mega_shipyard|galactic_commun",
    "Leviathans": r"leviathan|dimensional_horror",
    "Colossus": r"colossus",
    "Cloaking (First Contact)": r"cloak",
}

for label, pat in patterns.items():
    matches = [(t["key"], t["name"]) for t in all_techs if re.search(pat, t["key"], re.I)]
    if matches:
        print(f"\n{label} ({len(matches)}):")
        for k, n in matches[:12]:
            print(f"   {k} = {n}")

# Machine empire / gestalt flagged techs
me = [t["name"] for t in all_techs if t.get("is_machine_empire")]
print(f"\nis_machine_empire techs ({len(me)}): {me[:15]}")

# List techs whose potential mentions subject types (Overlord specializations)
subj = [(t["key"], t["name"]) for t in all_techs if any("Subject Type" in p for p in t.get("potential", []))]
print(f"\nSubject-type potential techs ({len(subj)}):")
for k, n in subj:
    print(f"   {k} = {n}")

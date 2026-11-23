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

all_techs = {}
for fname in ["physics", "society", "engineering"]:
    data = load(f"/home/z/my-project/stellaris-data/{fname}.json")
    for t in walk(data):
        all_techs[t["key"]] = t

# check potentials of flagged techs
for key in ["tech_bio_reactor", "tech_adaptive_combat_algorithms", "tech_synaptic_structures",
            "tech_collective_production", "tech_machine_template_system", "tech_binary_motivators",
            "tech_xeno_outreach", "tech_executive_retreat", "tech_encryption_1", "tech_decryption_1",
            "tech_bio_reactor", "tech_mega_assembly", "tech_micro_replicators", "tech_self_assembling",
            "tech_biomechanics", "tech_resource_processing_algorithms"]:
    for k, t in all_techs.items():
        if key in k:
            print(f"{k} ({t['name']}): potential={t.get('potential')[:2]}")
            break

# find exact keys for the flagged techs
print()
targets = {"Bio-Reactor": None, "Adaptive Combat Algorithms": None, "Biomechanics": None,
           "Resource Processing Algorithms": None, "Machine Template System": None,
           "Binary Motivators": None, "Mega-Assembly Systems": None, "Micro-Replicators": None,
           "Self-Assembling Components": None, "Synaptic Structures": None,
           "Collective Production Methods": None, "Xeno Outreach Agencies": None,
           "Executive Leisure Program": None}
for k, t in all_techs.items():
    if t["name"] in targets:
        targets[t["name"]] = (k, t.get("potential"))
for name, v in targets.items():
    print(f"{name}: {v}")

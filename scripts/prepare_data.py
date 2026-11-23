#!/usr/bin/env python3
"""Prepare the Stellaris 4.3.7 tech tree dataset for the web app."""
import json, re, collections, os

BASE = "/home/z/my-project/stellaris-data/cetus-4.3.7"
OUT = "/home/z/my-project/src/data/techtree.json"
os.makedirs(os.path.dirname(OUT), exist_ok=True)

DLCS = [
    # id, full name, short name, color
    ("base",            "Base Game",                  "Base",      "#94a3b8"),
    ("ancient_relics",  "Ancient Relics Story Pack",  "Anc. Relics", "#d97706"),
    ("machine_age",     "The Machine Age",            "Machine Age", "#14b8a6"),
    ("cosmic_storms",   "Cosmic Storms",              "C. Storms", "#22d3ee"),
    ("apocalypse",      "Apocalypse",                 "Apocalypse", "#ef4444"),
    ("grand_archive",   "Grand Archive",              "G. Archive", "#10b981"),
    ("first_contact",   "First Contact Story Pack",   "1st Contact", "#8b5cf6"),
    ("shroud",          "Shadows of the Shroud",      "Shroud",    "#e879f9"),
    ("overlord",        "Overlord",                   "Overlord",  "#facc15"),
    ("megacorp",        "Megacorp",                   "Megacorp",  "#4ade80"),
    ("federations",     "Federations",                "Federations", "#fb923c"),
    ("astral_planes",   "Astral Planes",              "Astral",    "#60a5fa"),
    ("infernals",       "Infernals Species Pack",     "Infernals", "#f43f5e"),
    ("biogenesis",      "BioGenesis",                 "BioGenesis", "#a3e635"),
    ("distant_stars",   "Distant Stars Story Pack",   "Dist. Stars", "#f472b6"),
]
DLC_BY_NAME = {
    "ancient relics story pack": "ancient_relics",
    "the machine age": "machine_age",
    "cosmic storms": "cosmic_storms",
    "apocalypse": "apocalypse",
    "grand archive": "grand_archive",
    "first contact story pack": "first_contact",
    "shadows of the shroud": "shroud",
    "overlord": "overlord",
    "megacorp": "megacorp",
    "federations": "federations",
    "astral planes": "astral_planes",
    "infernals species pack": "infernals",
    "biogenesis": "biogenesis",
    "distant stars story pack": "distant_stars",
}

# Curated additions (verified against game knowledge for 4.3.7)
CURATED_DLC = {
    "tech_titan_hull_1": "apocalypse",
    "tech_titan_hull_2": "apocalypse",
    "tech_nanite_assemblers": "distant_stars",
    "tech_xeno_tourism_agency": "megacorp",
    "tech_executive_retreat": "megacorp",
}

TOKEN_MAP = {
    "physics": "Physics", "society": "Society", "engineering": "Engineering",
    "energy": "Energy", "minerals": "Minerals", "food": "Food", "alloys": "Alloys",
    "consumer_goods": "Consumer Goods", "exotic_gases": "Exotic Gases",
    "rare_crystals": "Rare Crystals", "volatile_motes": "Volatile Motes",
    "zro": "Zro", "dark_matter": "Dark Matter", "living_metal": "Living Metal",
    "sr_dark_matter": "Dark Matter", "sr_living_metal": "Living Metal",
    "astral_threads": "Astral Threads", "minor_artifacts": "Minor Artifacts",
    "nanites": "Nanites", "influence": "Influence", "unity": "Unity",
    "trade": "Trade", "blocker": "",
    "commander": "Commander", "official": "Official", "scientist": "Scientist",
    "job": "Jobs",
    "job_physicist": "Physicist", "job_biologist": "Biologist",
    "job_engineer": "Engineer", "job_foundry": "Metallurgists",
    "job_researcher": "Researchers", "job_researchers": "Researchers",
    "job_technician": "Technicians", "job_artisan": "Artisans",
    "job_metallurgist": "Metallurgists", "job_farmer": "Farmers", "job_miner": "Miners",
    "job_culture_worker": "Culture Workers", "job_bureaucrat": "Bureaucrats",
    "job_priest": "Priests", "job_entertainer": "Entertainers", "job_coordinator": "Coordinators",
    "job_synthetic_drone": "Synthetic Drones", "job_robomodding": "Robomodders",
    "mod_pop": "Pop", "pop": "Pop", "military": "Military",
    "ship_maintenance": "Ship Maintenance", "damage": "Damage", "time": "Time",
    "yes": "Yes", "no": "No", "militarist": "Militarist", "pacifist": "Pacifist",
    "xenophobe": "Xenophobe", "xenophile": "Xenophile",
}
BRACKET_MAP = {
    "GetResearcherPlural": "Researchers", "GetResearcher": "Researcher",
    "GetArtisanPlural": "Artisans", "GetArtisan": "Artisan",
    "GetMetallurgistPlural": "Metallurgists", "GetMetallurgist": "Metallurgist",
    "GetTechnicianPlural": "Technicians", "GetTechnician": "Technician",
    "GetFarmerPlural": "Farmers", "GetFarmer": "Farmer",
    "GetMinerPlural": "Miners", "GetMiner": "Miner",
    "GetCultureWorkerPlural": "Culture Workers", "GetBureaucratPlural": "Bureaucrats",
    "GetCoordinatorPlural": "Coordinators", "GetPriestPlural": "Priests",
    "GetEntertainerPlural": "Entertainers",
}

def _tok(t):
    """Convert one £token£ name to readable text."""
    if t in TOKEN_MAP:
        return TOKEN_MAP[t]
    return t.replace("_", " ").title()

def clean_text(s):
    if not s:
        return ""
    s = re.sub(r"§.§!", "", s)                      # §Y§! color codes
    # runs of adjacent icon tokens -> readable names joined with "/"
    s = re.sub(
        r"(?:£[a-z_]+£){2,}",
        lambda m: "/".join(
            x for x in (_tok(t) for t in re.findall(r"£([a-z_]+)£", m.group(0))) if x
        ),
        s,
    )
    s = re.sub(r"£([a-z_]+)£", lambda m: _tok(m.group(1)), s)
    s = re.sub(r"\[Get([A-Za-z]+)\]", lambda m: BRACKET_MAP.get(m.group(0)[1:-1], m.group(1)), s)
    s = re.sub(r"\[([A-Za-z_]+)\]", lambda m: m.group(1).replace("_", " ").title(), s)
    s = re.sub(r"<br\s*/?>", " - ", s)
    s = re.sub(r"<[^>]+>", "", s)                    # strip html
    s = re.sub(r"&nbsp;", " ", s)
    # collapse word duplicates caused by icon+label pairs (e.g. "Energy Energy")
    s = re.sub(r"\b(\w+)\s+\1\b", r"\1", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()

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

def detect_dlc(t):
    pot = " || ".join(t.get("potential", []))
    wm = " || ".join(t.get("weight_modifiers", []))
    text = (pot + " " + wm).lower()
    found = None
    for name, did in DLC_BY_NAME.items():
        if f"has dlc {name}" in text:
            found = did
            break
    if not found:
        found = CURATED_DLC.get(t["key"])
    return found

techs = []
seen = set()
for area_file in ["physics", "society", "engineering"]:
    data = load(f"{BASE}/{area_file}.json")
    for t in walk(data):
        if t["key"] in seen:
            continue
        seen.add(t["key"])
        techs.append({
            "k": t["key"],
            "n": t["name"],
            "d": clean_text(t.get("description", "")),
            "a": t["area"],
            "c": t.get("category", ""),
            "t": t.get("tier", 0),
            "cost": t.get("cost", 0),
            "w": t.get("base_weight", 0),
            "r": 1 if t.get("is_rare") else 0,
            "dg": bool(t.get("is_dangerous")),
            "st": bool(t.get("is_start_tech")),
            "p": t.get("prerequisites", []),
            "dlc": detect_dlc(t),
            "u": [clean_text(u) for u in t.get("feature_unlocks", []) if clean_text(u)],
            "e": False,
        })

# anomaly / event techs
anoms = load(f"{BASE}/anomalies.json")
anom_count = 0
for a in anoms:
    if a["key"] in seen:
        continue
    seen.add(a["key"])
    anom_count += 1
    techs.append({
        "k": a["key"],
        "n": a["name"],
        "d": clean_text(a.get("description", "")),
        "a": a.get("area", "physics"),
        "c": a.get("category", ""),
        "t": a.get("tier", 1),
        "cost": a.get("cost", 0),
        "w": a.get("base_weight", 0),
        "r": 2,  # unique
        "dg": bool(a.get("is_dangerous")),
        "st": bool(a.get("is_start_tech")),
        "p": a.get("prerequisites", []),
        "dlc": detect_dlc(a),
        "u": [clean_text(u) for u in a.get("feature_unlocks", []) if clean_text(u)],
        "e": True,
    })

# Validate prerequisites against known keys
all_keys = {t["k"] for t in techs}
missing_prereqs = set()
for t in techs:
    t["p"] = [p for p in t["p"] if p in all_keys]
    for p in t["p"]:
        pass

# Stats
dlc_counter = collections.Counter(t["dlc"] or "base" for t in techs)
rarity_counter = collections.Counter(t["r"] for t in techs)
area_counter = collections.Counter(t["a"] for t in techs)
cat_by_area = collections.defaultdict(collections.Counter)
for t in techs:
    cat_by_area[t["a"]][t["c"]] += 1

out = {
    "version": "4.3.7",
    "dlcs": [{"id": d[0], "name": d[1], "short": d[2], "color": d[3]} for d in DLCS],
    "techs": techs,
}

with open(OUT, "w") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

print(f"Wrote {OUT}: {len(techs)} techs ({anom_count} event techs)")
print(f"By area: {dict(area_counter)}")
print(f"By rarity: 0(common)={rarity_counter[0]}, 1(rare)={rarity_counter[1]}, 2(unique)={rarity_counter[2]}")
print(f"By DLC: {dict(dlc_counter.most_common())}")
print("\nCategories by area:")
for a in ["physics", "society", "engineering"]:
    print(f"  {a}: {dict(cat_by_area[a].most_common())}")
size = os.path.getsize(OUT)
print(f"\nFile size: {size/1024:.0f} KB")

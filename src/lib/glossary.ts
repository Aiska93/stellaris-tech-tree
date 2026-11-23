/**
 * Jargon glossary — short newbie-friendly definitions for Stellaris terms
 * used across the site. Rendered inline via the <Term> component (dotted
 * underline + hover definition) and listed in the Help modal.
 */

export interface GlossaryEntry {
  /** the term as shown in the UI */
  term: string;
  /** short definition (one sentence, plain language) */
  def: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  pop: {
    term: "pop",
    def: "One population unit working on a planet. Pops fill jobs, and jobs produce resources — more pops means a stronger economy.",
  },
  district: {
    term: "district",
    def: "A planet building slot for housing and jobs: city, generator, mining or farming districts. More districts = more pops your planet can hold.",
  },
  job: {
    term: "job",
    def: "What a pop does for a living. Researchers, metallurgists, technicians — each job turns pops into research, alloys or energy.",
  },
  amenities: {
    term: "amenities",
    def: "Comfort services that keep pops happy. Low amenities cause instability and lost production; entertainment buildings provide them.",
  },
  unity: {
    term: "unity",
    def: "A culture resource produced by pops like rulers. It buys tradition trees — permanent empire-wide bonuses.",
  },
  tradition: {
    term: "tradition",
    def: "A perk bought with unity, grouped into trees like Discovery or Harmony. Traditions are the second big progression system next to technology.",
  },
  "ascension perk": {
    term: "ascension perk",
    def: "A powerful empire-wide bonus picked after finishing a tradition tree. Slots are limited; Ascension Theory grants an extra one.",
  },
  influence: {
    term: "influence",
    def: "A slow, capped political resource. It claims star systems, signs pacts and reforms your government — spend it deliberately.",
  },
  sprawl: {
    term: "sprawl",
    def: "Empire size from systems, districts and pops. Above your administrative capacity it makes techs and traditions cost more.",
  },
  starbase: {
    term: "starbase",
    def: "The station you build in a system. It claims the system, extends borders, services fleets and can be armed with weapon modules.",
  },
  chokepoint: {
    term: "chokepoint",
    def: "A system every enemy fleet must pass through to reach you. Fortify chokepoints with armed starbases instead of guarding every border.",
  },
  "science ship": {
    term: "science ship",
    def: "A ship with a scientist that surveys systems and studies anomalies. Surveyed systems can be claimed and reveal research opportunities.",
  },
  survey: {
    term: "survey",
    def: "Scanning a system with a science ship. You need it before building mining stations or colonizing planets there.",
  },
  "research alternative": {
    term: "research alternative",
    def: "How many tech choices you draw at once (base 3). More alternatives = more control over what you research next.",
  },
  weight: {
    term: "weight",
    def: "Each tech's hidden pull in the draw. High-weight techs appear in your research options more often — this site shows the number and the odds it creates.",
  },
  tier: {
    term: "tier",
    def: "Tech difficulty band (0–5). A tier-N tech only appears once you have researched 6 techs of tier N-1 in the same area.",
  },
  "dangerous tech": {
    term: "dangerous tech",
    def: "A tech flagged with a warning icon: researching it can trigger a late-game crisis, like an AI rebellion. Powerful, but risky.",
  },
  "rare tech": {
    term: "rare tech",
    def: "A tech with a purple/orange dot and low draw weight — it rarely appears in your options. Rare techs often gate unique rewards.",
  },
  dlc: {
    term: "DLC",
    def: "Downloadable content pack. Techs from DLCs you disable in the filter are hidden and never block your progress here.",
  },
  "colony ship": {
    term: "colony ship",
    def: "A ship that carries pops to settle a new planet. Built at starbases; costs food (or alloys) plus influence to found the colony.",
  },
  habitability: {
    term: "habitability",
    def: "How comfortable a planet is for your species (0–100%). Low habitability means unhappy, less productive pops — or terraform first.",
  },
  terraforming: {
    term: "terraform",
    def: "Slowly converting a planet's climate toward your preference. Costs energy; the society techs in Wide Expansion unlock better tools.",
  },
  habitat: {
    term: "habitat",
    def: "An artificial colony built over a planet by a construction ship. A way to grow without conquering or waiting for good planets.",
  },
  megastructure: {
    term: "megastructure",
    def: "Colossal multi-stage construction like a Dyson Sphere or Ring World. Unlocked via Mega-Engineering; a victory-lap goal for tall empires.",
  },
  alloys: {
    term: "alloys",
    def: "The military resource — metallurgists turn minerals into alloys, and alloys build ships and starbases. No alloys, no fleet.",
  },
  "consumer goods": {
    term: "consumer goods",
    def: "Comfort material for pops; researcher and culture jobs consume it. Shortage stalls your research and unity.",
  },
  "strategic resources": {
    term: "strategic resources",
    def: "Rare materials like exotic gases, volatile motes and rare crystals. Buildings and ship components consume them each month.",
  },
  "naval capacity": {
    term: "naval capacity",
    def: "How many ships your empire can support before upkeep explodes. Soldiers, starbases and techs raise it.",
  },
  army: {
    term: "army",
    def: "Ground troops that invade and hold enemy planets. Transport ships carry them; defense armies protect your own worlds.",
  },
  ethics: {
    term: "ethics",
    def: "Your empire's guiding values (e.g. Xenophile, Militarist). They unlock civics, policies and shape diplomacy.",
  },
  civic: {
    term: "civic",
    def: "A permanent empire bonus chosen at creation (and via Galactic Administration slots). Examples: Technocracy, Feudal Society.",
  },
  origin: {
    term: "origin",
    def: "Your empire's backstory — Prosperous Unification, Void Dwellers, Shattered Ring… It changes your starting situation heavily.",
  },
  gestalt: {
    term: "gestalt",
    def: "A hive mind or machine intelligence: the whole empire is one consciousness. No factions or happiness, different economy rules.",
  },
  psionic: {
    term: "psionic",
    def: "Mind powers: telepathy, precognition and the Shroud. The psionic ascension path turns your whole species psychic.",
  },
  synthetic: {
    term: "synthetic",
    def: "Fully robotic pops. The synthetic ascension path converts your species into immortal machines.",
  },
  "gene modding": {
    term: "gene modding",
    def: "Editing your species' traits. The genetic ascension path eventually lets you rewrite pops on demand.",
  },
  "trade value": {
    term: "trade value",
    def: "Commerce generated by pops on planets, collected by starbases and converted into energy or consumer goods.",
  },
  federation: {
    term: "federation",
    def: "A permanent alliance with shared fleets and laws. Powerful, but you pool diplomacy with your allies.",
  },
  envoy: {
    term: "envoy",
    def: "A diplomatic agent assigned to improve relations, federations or the galactic community.",
  },
  crisis: {
    term: "crisis",
    def: "A galaxy-ending threat (or your empire becoming one). Some dangerous techs can trigger a crisis; Cosmogenesis is a deliberate path into one.",
  },
  "the Shroud": {
    term: "the Shroud",
    def: "A psychic dimension psionic empires can enter for boons and pacts — and sometimes terrible deals.",
  },
};

export const GLOSSARY_LIST: GlossaryEntry[] = Object.values(GLOSSARY).sort(
  (a, b) => a.term.localeCompare(b.term),
);

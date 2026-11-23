/**
 * Early-game milestone checklist — non-tech actions that decide the first
 * decades of a Stellaris campaign. New players lose games in the first 20
 * years; these are the habits that prevent that.
 *
 * `id` is persisted (which milestones are checked off), so it must stay
 * stable once shipped.
 */

export interface Milestone {
  id: string;
  /** what to do */
  title: string;
  /** when to aim for it */
  when: string;
  /** one-sentence why/how */
  note: string;
  group: "Economy" | "Expansion" | "Military" | "Science" | "Society";
}

export const MILESTONES: Milestone[] = [
  {
    id: "science-ships",
    title: "Build a 2nd and 3rd science ship",
    when: "by 2201",
    note: "More scientists surveying means faster claiming, more anomalies and better research options. Keep them busy forever.",
    group: "Science",
  },
  {
    id: "construction-ship",
    title: "Build a 2nd construction ship",
    when: "by 2202",
    note: "One claims systems while the other builds mining and research stations — waiting on a single builder stalls everything.",
    group: "Economy",
  },
  {
    id: "chokepoints",
    title: "Claim chokepoint systems with starbases",
    when: "2201–2206",
    note: "Find the narrow hyperlane entrances to your space and claim those systems first — they are the only systems you ever need to fortify.",
    group: "Military",
  },
  {
    id: "survey-queue",
    title: "Never leave a scientist idle",
    when: "always",
    note: "A scientist without a survey or research assistance order is wasted salary. Re-check every few years.",
    group: "Science",
  },
  {
    id: "first-colony-ship",
    title: "Build your first colony ship",
    when: "by 2203",
    note: "Needs the New Worlds Protocol tech. Colonies are the engine of your economy — the earlier the first one lands, the better.",
    group: "Expansion",
  },
  {
    id: "first-colony",
    title: "Found your first colony",
    when: "by 2206",
    note: "Pick a planet with high habitability (80%+) so the colony pays off quickly. Send 5–10 pops to seed it.",
    group: "Expansion",
  },
  {
    id: "research-labs",
    title: "Research labs on your capital",
    when: "by 2205",
    note: "Build a lab or two as soon as you have the Scientific Method tech. Research snowballs — every year without labs compounds.",
    group: "Science",
  },
  {
    id: "traditions",
    title: "Start a tradition tree and finish it",
    when: "finish by ~2215",
    note: "Unity buys tradition trees right from day one — pick Discovery for research or Expansion for growth and finish the whole tree before spreading out.",
    group: "Society",
  },
  {
    id: "second-colony",
    title: "Second colony founded",
    when: "by 2208",
    note: "Aim for 3–4 colonies by 2215. Wide growth in the first two decades is the strongest advantage in the game.",
    group: "Expansion",
  },
  {
    id: "alloy-income",
    title: "Alloy income above +20/month",
    when: "by 2210",
    note: "Alloys build ships and starbases. A small, steady surplus lets you react to threats instead of scrambling when war starts.",
    group: "Economy",
  },
  {
    id: "destroyers",
    title: "Destroyers researched before your first war",
    when: "2205–2210",
    note: "Destroyers are the first real military power spike. Having them before an enemy (or rival) attacks you is the difference between a skirmish and a loss.",
    group: "Military",
  },
  {
    id: "capital-starbase",
    title: "Upgrade your capital's starbase",
    when: "by 2210",
    note: "Starport and above add shipyards, crew quarters and naval capacity — it is your main fleet anchor for the first decades.",
    group: "Military",
  },
];

export const MILESTONE_GROUPS = [
  "Economy",
  "Expansion",
  "Military",
  "Science",
  "Society",
] as const;

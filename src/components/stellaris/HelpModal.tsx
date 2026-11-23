"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Term } from "./Term";
import { GLOSSARY_LIST } from "@/lib/glossary";
import { TIER_UNLOCK_COUNT } from "@/lib/myEmpire";

const SHORTCUTS: [string, string][] = [
  ["1 – 8", "Switch tabs (All → Empire Creator)"],
  ["/", "Focus the search box"],
  ["Esc", "Clear search / close dialogs"],
  ["?", "Open this help"],
  ["Ctrl+Z", "Undo last research change"],
  ["Ctrl+Shift+Z / Ctrl+Y", "Redo"],
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-800 pt-3 first:border-t-0 first:pt-0">
      <h3 className="mb-1.5 text-[13px] font-bold uppercase tracking-wider text-amber-300">
        {title}
      </h3>
      <div className="space-y-1.5 text-[12.5px] leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

export function HelpModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-slate-700 bg-[#0b1120] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-slate-50">
            How Stellaris research works
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            The 2-minute primer for new emperors — plus every shortcut and
            term used on this site.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-3.5">
          <Section title="The draw">
            <p>
              Each of your three research areas (Physics, Society,
              Engineering) works on exactly one technology at a time. When you
              pick one, the game draws{" "}
              <strong className="text-slate-100">
                3 research options
              </strong>{" "}
              from everything you currently qualify for — like a card game
              hand. Every tech has a hidden{" "}
              <Term k="weight">weight</Term>: high-weight techs show up in the
              hand more often. The <span className="font-semibold text-cyan-300">odds badge</span>{" "}
              on each card here shows the chance that tech appears in your
              next hand, including all modifiers of your applied empire.
            </p>
            <p>
              You can bank a hand: picking an{" "}
              <Term k="research alternative" /> lets you keep a drawn option
              for later — more alternatives means more control.
            </p>
          </Section>

          <Section title="Tiers and gating">
            <p>
              Techs are grouped in <Term k="tier">tiers</Term> (left to right
              in the tree). A tier-N tech can only appear once{" "}
              <strong className="text-slate-100">
                {TIER_UNLOCK_COUNT} techs of tier N-1
              </strong>{" "}
              in the same area are researched — the{" "}
              <span className="font-semibold" style={{ color: "#34d399" }}>
                N/N
              </span>{" "}
              counters in each column header track exactly that.
            </p>
            <p>
              Some techs are <Term k="rare tech" /> (low weight, unique
              rewards) and a few are <Term k="dangerous tech" /> — powerful,
              but they can trigger a late-game <Term k="crisis" />. The
              checkboxes on cards follow the real rules: you cannot research a
              tech before its prerequisites, and clicking a locked card takes
              you to what you need first.
            </p>
          </Section>

          <Section title="Playstyles and ratings">
            <p>
              Pick a playstyle below the tab bar (Tech Rush, Wide Expansion,
              Rush Battleships…) and every tech important to that path gets a
              rating icon in its top-right corner:
            </p>
            <ul className="ml-1 space-y-1">
              <li>
                <span
                  className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] border px-1 text-[9px] font-extrabold"
                  style={{
                    color: "#fde047",
                    borderColor: "#fde04799",
                    background: "#fde0471f",
                  }}
                >
                  S
                </span>
                core — grab it as soon as you can
              </li>
              <li>
                <span
                  className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] border px-1 text-[9px] font-extrabold"
                  style={{
                    color: "#67e8f9",
                    borderColor: "#67e8f999",
                    background: "#67e8f91f",
                  }}
                >
                  A
                </span>
                strong — supports the path well
              </li>
              <li>
                <span
                  className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] border px-1 text-[9px] font-extrabold"
                  style={{
                    color: "#cbd5e1",
                    borderColor: "#cbd5e199",
                    background: "#cbd5e11f",
                  }}
                >
                  B
                </span>
                situational — later or specific spots
              </li>
            </ul>
            <p>
              Ratings are editorial guidance for that path, not gospel — the
              &ldquo;Next up&rdquo; chips suggest the best currently available
              picks.
            </p>
          </Section>

          <Section title="Planning and estimates">
            <p>
              Hover a card and click the{" "}
              <span className="font-semibold text-amber-300">flag</span> to
              plan a path to it: every missing prerequisite lights up with a
              dashed outline, and the banner above the tree counts the
              remaining techs and research cost.
            </p>
            <p>
              Enter your monthly research output in the My Empire tab and each
              card&rsquo;s hover panel estimates the research time —&ldquo;16,000
              pts ≈ 10 months at 40/mo&rdquo;.
            </p>
          </Section>

          <Section title="Keyboard shortcuts">
            <table className="w-full text-[12px]">
              <tbody>
                {SHORTCUTS.map(([key, desc]) => (
                  <tr key={key}>
                    <td className="w-40 py-0.5 pr-3 align-top">
                      <kbd className="rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-200">
                        {key}
                      </kbd>
                    </td>
                    <td className="py-0.5 text-slate-300">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Glossary">
            <dl className="space-y-1.5">
              {GLOSSARY_LIST.map((g) => (
                <div key={g.term}>
                  <dt className="text-[12px] font-semibold text-cyan-300">
                    {g.term}
                  </dt>
                  <dd className="text-[11.5px] leading-snug text-slate-400">
                    {g.def}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

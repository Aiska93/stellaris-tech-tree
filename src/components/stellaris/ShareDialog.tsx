"use client";

import { useEffect, useState } from "react";
import { Check, ClipboardCopy, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ShareDialog({
  open,
  onOpenChange,
  getCode,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** builds the current share code (called when the dialog opens) */
  getCode: () => string;
  /** applies a pasted code; returns an error message or null on success */
  onImport: (code: string) => string | null;
}) {
  const [code, setCode] = useState("");
  const [paste, setPaste] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(getCode());
      setPaste("");
      setCopied(false);
    }
  }, [open, getCode]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not access the clipboard", {
        description: "Select the code box and copy manually (Ctrl+A, Ctrl+C).",
      });
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stellaris-tech-progress.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importCode = () => {
    const err = onImport(paste);
    if (err) {
      toast.error("Import failed", { description: err });
    } else {
      toast.success("Progress imported from share code");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-slate-700 bg-[#0b1120]">
        <DialogHeader>
          <DialogTitle className="text-slate-50">Share progress</DialogTitle>
          <DialogDescription className="text-slate-400">
            One code carries everything: researched techs, applied empire,
            research rates, milestones, goal and playstyle. Nothing is
            uploaded anywhere — it all stays in this code.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Your code — copy and send it
            </p>
            <textarea
              readOnly
              value={code}
              onFocus={(e) => e.currentTarget.select()}
              className="h-28 w-full resize-none rounded-md border border-slate-700 bg-slate-950/80 p-2 font-mono text-[10px] leading-snug text-slate-300 outline-none focus:border-cyan-400/60"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={copy}
                className="h-8 bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardCopy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy code"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={download}
                className="h-8 border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <FileDown className="h-3.5 w-3.5" />
                Save as file
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Import a code — paste and apply
            </p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="STT1:…"
              className="h-20 w-full resize-none rounded-md border border-slate-700 bg-slate-950/80 p-2 font-mono text-[10px] leading-snug text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
            />
            <Button
              size="sm"
              onClick={importCode}
              disabled={paste.trim() === ""}
              className="mt-2 h-8 border border-cyan-400/50 bg-cyan-400/15 font-semibold text-cyan-100 hover:bg-cyan-400/25 disabled:opacity-40"
            >
              Apply code
            </Button>
            <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
              Applying overwrites the current slot&rsquo;s progress. Use the
              slot switcher first if you want to keep it.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

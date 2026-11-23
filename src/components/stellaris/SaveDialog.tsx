"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileJson } from "lucide-react";

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acquiredCount: number;
  onSave: (fileName: string) => void;
}

const DEFAULT_NAME = "stellaris-progress";

export function SaveDialog({
  open,
  onOpenChange,
  acquiredCount,
  onSave,
}: SaveDialogProps) {
  const [name, setName] = useState(DEFAULT_NAME);

  const clean = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim();
  const valid = clean.length > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave(clean);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-700 bg-[#0b1120] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <FileJson className="h-4 w-4 text-amber-300" />
            Save research progress
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Exports your {acquiredCount} researched{" "}
            {acquiredCount === 1 ? "technology" : "technologies"} to a JSON
            file you can import later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <label
            htmlFor="save-file-name"
            className="text-xs font-medium uppercase tracking-wider text-slate-300"
          >
            File name
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="save-file-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder={DEFAULT_NAME}
              className="border-slate-700 bg-slate-900/70 text-slate-100"
              autoFocus
            />
            <span className="shrink-0 text-sm text-slate-400">.json</span>
          </div>
          {valid ? (
            <p className="text-[11px] text-slate-400">
              Downloads as{" "}
              <span className="font-mono text-amber-300/90">
                {clean}.json
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-rose-400">
              Please enter a valid file name.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!valid}
            className="bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

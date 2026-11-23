#!/usr/bin/env python3
"""Copy the needed tech icon PNGs from the extracted fork repo into public/img/."""
import json
import os
import shutil

SRC = "/tmp/fork-repo/stellaris-tech-tree-master/assets/img"
DST = "/home/z/my-project/public/img"
DATA = "/home/z/my-project/src/data/techtree.json"

def main():
    techs = json.load(open(DATA))["techs"]
    keys = [t["k"] for t in techs]
    os.makedirs(DST, exist_ok=True)

    copied, missing = 0, []
    for k in keys:
        src = os.path.join(SRC, f"{k}.png")
        dst = os.path.join(DST, f"{k}.png")
        if os.path.exists(src):
            shutil.copyfile(src, dst)
            copied += 1
        else:
            missing.append(k)

    total = sum(os.path.getsize(os.path.join(DST, f)) for f in os.listdir(DST))
    print(f"copied: {copied}/{len(keys)}")
    print(f"missing: {missing}")
    print(f"total size in public/img: {total/1024/1024:.2f} MB, files: {len(os.listdir(DST))}")

if __name__ == "__main__":
    main()

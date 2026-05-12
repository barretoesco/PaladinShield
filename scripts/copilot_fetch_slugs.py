#!/usr/bin/env python3
"""Fetch Colosseum Copilot cards for benchmark slugs (WSL PAT ~/.colosseum_copilot_pat)."""
import json
import pathlib
import urllib.request

BASE = "https://copilot.colosseum.com/api/v1"


def main() -> None:
    pat = pathlib.Path.home().joinpath(".colosseum_copilot_pat").read_text(encoding="utf-8").strip()[:4096]
    hdr = {"Authorization": f"Bearer {pat}", "Accept": "application/json", "User-Agent": "Mozilla/5.0 Chrome/131"}

    for slug in ["guardsol", "chaingpt", "armor-wallet", "prism"]:
        req = urllib.request.Request(f"{BASE}/projects/by-slug/{slug}", headers=hdr, method="GET")
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.loads(r.read().decode("utf-8"))
        proj = d.get("project") or d
        name = proj.get("name") if isinstance(proj, dict) else slug
        line = (proj.get("oneLiner") or proj.get("summary") or "")[:350] if isinstance(proj, dict) else ""
        st = proj.get("solutionTags")[:8] if isinstance(proj, dict) and proj.get("solutionTags") else []
        pt = proj.get("problemTags")[:8] if isinstance(proj, dict) and proj.get("problemTags") else []
        print(f"=== {slug} | {name} ===")
        print(line or "(no oneLiner)")
        if pt:
            print("problemTags:", ", ".join(str(x) for x in pt))
        if st:
            print("solutionTags:", ", ".join(str(x) for x in st))
        print()


if __name__ == "__main__":
    main()

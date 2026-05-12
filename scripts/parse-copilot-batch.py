#!/usr/bin/env python3
"""Parse Colosseum batch output split by '=== LABEL ==='. Usage: python3 parse-copilot-batch.py <path.txt>"""
import json
import re
import sys


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else ""
    if not path:
        print("Usage: parse-copilot-batch.py <captures.txt>", file=sys.stderr)
        sys.exit(2)
    raw = open(path, encoding="utf-8").read().strip()
    chunks = re.split(r"\n=== ([^=\n]+) ===\n", raw)
    # chunks[0]: preamble text before first === (often empty)
    labels_and_bodies = list(zip(chunks[1::2], chunks[2::2]))
    for lab, body in labels_and_bodies:
        lab = lab.strip()
        body = body.strip()
        print(f"\n### {lab}")
        if lab == "GET /status":
            try:
                d = json.loads(body)
                print(json.dumps(d, indent=2, ensure_ascii=False))
            except json.JSONDecodeError:
                print(body[:500])
            continue
        try:
            d = json.loads(body)
        except json.JSONDecodeError as e:
            print("PARSE_ERR", e)
            print(body[:300])
            continue
        results = d.get("results") if isinstance(d, dict) else None
        if not isinstance(results, list):
            print(json.dumps(d, indent=2, ensure_ascii=False)[:800])
            continue
        print(f"hits={len(results)} totalFound={d.get('totalFound')} hasMore={d.get('hasMore')}")
        for r in results:
            slug = r.get("slug")
            name = r.get("name") or ""
            line = r.get("oneLiner") or ""
            prize = r.get("prize") or {}
            acc = r.get("accelerator") or {}
            ptn = prize.get("name") if prize else None
            accn = acc.get("companySlug") if acc else None
            suf = ""
            if ptn:
                suf += f" | prize: {ptn}"
            if accn:
                suf += f" | accel: {accn}"
            print(f"  - [{slug}] {name[:72]}{suf}")
            print(f"      oneLiner: {line[:160]}")


if __name__ == "__main__":
    main()

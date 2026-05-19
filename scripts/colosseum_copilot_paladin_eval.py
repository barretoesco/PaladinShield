#!/usr/bin/env python3
"""Post PaladinShield feature brief to Colosseum Copilot search API; print analogous corpus hits."""
from __future__ import annotations

import json
import pathlib
import urllib.error
import urllib.request

BASE = "https://copilot.colosseum.com/api/v1"


def load_pat() -> str:
    for rel in (
        pathlib.Path.home() / ".colosseum_copilot_pat",
        pathlib.Path.home() / ".config" / "colosseum" / "copilot_pat",
    ):
        if rel.is_file() and rel.stat().st_size > 0:
            raw = rel.read_text(encoding="utf-8").strip("\ufeff \t\r\n")
            if raw:
                return raw
    raise SystemExit("Missing PAT in ~/.colosseum_copilot_pat")


def api_get(path: str, headers: dict) -> dict:
    req = urllib.request.Request(BASE + path, headers=headers, method="GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def api_post(path: str, headers: dict, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError(f"HTTP {e.code} POST {path}: {body}") from e


def print_project_rows(rows: list[dict], limit: int = 8) -> None:
    for row in rows[:limit]:
        p = row.get("project") or row
        slug = p.get("slug")
        name = p.get("name")
        liner = (p.get("oneLiner") or p.get("summary") or "")[:140]
        print(f"  • [{slug}] {name}\n    {liner}")


def fetch_slug_card(headers: dict, slug: str) -> dict:
    return api_get(f"/projects/by-slug/{slug}", headers)


def main() -> None:
    pat = load_pat()
    headers = {
        "Authorization": f"Bearer {pat}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36 PaladinShield-CopilotEval/1",
    }

    print("=== GET /status ===")
    try:
        print(json.dumps(api_get("/status", headers), indent=2)[:1200])
    except urllib.error.HTTPError as e:
        print(e.read().decode("utf-8", errors="replace"))
        raise SystemExit(1) from None

    brief = (
        "PaladinShield MV3 Chromium extension Solana REL: Promise-gated signTransaction/signAllTransactions/"
        "signMessage until service worker verdict (default-deny), execution hold not simulation-only. OpenAI "
        "gpt-4o-mini JSON verdict riesgo/accion/mensaje; rejects origin-trust over payload; AyudaAdministrador; "
        "4s timeout Alto+Bloquear fail-safe. Forensic Evidence Hub SHA256 hash export. Popup GET_CURRENT_STATE."
    )
    if len(brief) > 500:
        brief = brief[:500]

    print("\n=== POST /search/projects (full brief) ===")
    r1 = api_post(
        "/search/projects",
        headers,
        {"query": brief, "limit": 12, "filters": {}, "includeDiagnostics": True},
    )
    out = pathlib.Path("/tmp/copilot_paladin_projects.json")
    out.write_text(json.dumps(r1, indent=2), encoding="utf-8")
    diag = r1.get("diagnostics") or {}
    print("totalFound:", r1.get("totalFound"), "| modeUsed:", diag.get("modeUsed"), "| queryExpanded:", diag.get("queryExpanded"))
    print_project_rows(r1.get("results") or [], limit=10)

    print("\n=== POST /search/projects (winnersOnly overlap) ===")
    r2 = api_post(
        "/search/projects",
        headers,
        {
            "query": (
                "Solana Chrome extension intercept wallet signing phishing drainer default deny "
                "forensic hash evidence MV3 promise gate LLM semantic verdict before sign"
            )[:500],
            "limit": 12,
            "filters": {"winnersOnly": True},
            "includeDiagnostics": True,
        },
    )
    pathlib.Path("/tmp/copilot_paladin_winners.json").write_text(json.dumps(r2, indent=2), encoding="utf-8")
    print_project_rows(r2.get("results") or [], limit=8)

    print("\n=== POST /search/projects (acceleratorOnly overlap) ===")
    r4 = api_post(
        "/search/projects",
        headers,
        {
            "query": (
                "browser extension wallet signing protection default deny drainer transaction explanation "
                "forensic evidence execution control"
            )[:500],
            "limit": 12,
            "filters": {"acceleratorOnly": True},
            "includeDiagnostics": True,
        },
    )
    pathlib.Path("/tmp/copilot_paladin_accelerator.json").write_text(json.dumps(r4, indent=2), encoding="utf-8")
    print_project_rows(r4.get("results") or [], limit=8)

    print("\n=== POST /search/archives ===")
    r3 = api_post(
        "/search/archives",
        headers,
        {
            "query": "browser wallet extension signing security phishing protection",
            "limit": 5,
            "maxChunksPerDoc": 1,
        },
    )
    pathlib.Path("/tmp/copilot_paladin_archives.json").write_text(json.dumps(r3, indent=2), encoding="utf-8")
    for row in (r3.get("results") or [])[:5]:
        title = row.get("title")
        src = row.get("source")
        snip = (row.get("snippet") or "")[:160]
        print(f"  • {title} ({src})\n    {snip}")

    print("\n=== GET /projects/by-slug benchmarks ===")
    for slug in ["guardsol", "chaingpt", "armor-wallet", "prism"]:
        card = fetch_slug_card(headers, slug)
        p = card.get("project") or card
        name = p.get("name")
        liner = (p.get("oneLiner") or p.get("summary") or "")[:180]
        hackathon = p.get("hackathon") or {}
        cohort = p.get("acceleratorBatch") or {}
        when = hackathon.get("startDate") or "unknown-date"
        acc = cohort.get("key") or cohort.get("name") or "no-accelerator-batch"
        print(f"  • [{slug}] {name} | hackathon={hackathon.get('slug')} | startDate={when} | accelerator={acc}")
        print(f"    {liner}")

    print(
        "\nWrote:",
        out,
        "| /tmp/copilot_paladin_winners.json | /tmp/copilot_paladin_accelerator.json | /tmp/copilot_paladin_archives.json",
    )


if __name__ == "__main__":
    main()

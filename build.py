#!/usr/bin/env python3
"""Génère index.html (page autonome) à partir de src/."""
from pathlib import Path

root = Path(__file__).parent
tpl = (root / "src" / "template.html").read_text(encoding="utf-8")
core = (root / "src" / "core.js").read_text(encoding="utf-8")
floor = (root / "src" / "floor.json").read_text(encoding="utf-8").strip()
out = tpl.replace("%%CORE%%", core).replace("%%F%%", floor)
(root / "index.html").write_text(out, encoding="utf-8")
print(f"index.html généré ({len(out)} octets)")

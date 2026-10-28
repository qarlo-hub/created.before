"""Build the paste-ready Qualtrics CSS from the readable source.

Qualtrics' Custom CSS field kept only the part of the source before the first
var() reference, so the output resolves every var(--st-*) to its literal value,
drops comments and keeps plain ASCII. Qualtrics' own variables (--mixes-*, ...)
are still set, with literal values.

Usage: python3 build.py   ->  writes survey-theme.qualtrics.css
"""
import re
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "survey-theme.css"
OUT = HERE / "survey-theme.qualtrics.css"

css = SRC.read_text(encoding="utf-8")
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

# token values: first html:root block only
root = re.search(r"html:root\s*\{(.*?)\}", css, re.S).group(1)
tokens = dict(re.findall(r"(--st-[\w-]+)\s*:\s*([^;]+);", root))

def resolve(value, depth=0):
    if depth > 5:
        raise ValueError("token cycle: " + value)
    out = re.sub(r"var\((--st-[\w-]+)\)", lambda m: tokens[m.group(1)], value)
    return resolve(out, depth + 1) if "var(--st-" in out else out

tokens = {k: resolve(v.strip()) for k, v in tokens.items()}
css = re.sub(r"\s*--st-[\w-]+\s*:[^;]+;", "", css)          # drop token declarations
css = re.sub(r"var\((--st-[\w-]+)\)", lambda m: tokens[m.group(1)], css)

leftover = re.findall(r"var\([^)]*\)", css)
if leftover:
    raise SystemExit("unresolved var(): %s" % sorted(set(leftover)))
if re.search(r"[<>]", css) or any(ord(c) > 127 for c in css):
    raise SystemExit("output must be plain ASCII without < or >")

css = re.sub(r"\n\s*\n+", "\n", css).strip() + "\n"
header = ("/* Survey theme - build of survey-theme.css (see README). "
          "Paste this whole file into Look & Feel > Style > Custom CSS. */\n")
OUT.write_text(header + css, encoding="ascii", newline="\n")
print("wrote", OUT.name, len(header + css), "chars,", len(tokens), "tokens resolved")

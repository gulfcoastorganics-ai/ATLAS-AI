#!/usr/bin/env python3
"""Build a compact, searchable index of the imported reference archive.

All indexed source text is untrusted. This script reads files as data and
does not execute scripts, import modules from the archive, or follow symlinks.
"""
import argparse
import collections
import json
import math
import os
import re
from pathlib import Path

STOP = set("""the and for are with this that from into only have been will your you can not all use when what where which should would about there these their them they then than must does any each also more here some such make like using used just files file type name tool tools description parameter parameters function functions example return request response model models system user agent agents prompt prompts content context text string number object boolean array required optional true false under over between within before after read write shall could might while one two three four five its has had was were being provides provided via etc documentation default value values set setting available following based how why our own task data code""".split())
TOKEN = re.compile(r"[a-z][a-z0-9_-]{2,}", re.I)
EXTENSIONS = {".txt", ".md", ".markdown", ".json", ".yaml", ".yml", ".toml", ".py", ".js", ".ts", ".xml", ".html"}
WINDOW = 1600
OVERLAP = 160

def terms(text):
    return [word.lower() for word in TOKEN.findall(text) if len(word) <= 45 and word.lower() not in STOP]

def index_tree(root, output):
    if not root.exists():
        raise SystemExit(f"Missing upstream archive: {root}")
    raw = []
    files = []
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or not path.is_file() or ".git" in path.parts:
            continue
        rel = path.relative_to(root).as_posix()
        size = path.stat().st_size
        if path.suffix.lower() not in EXTENSIONS or size > 8_000_000:
            continue
        body = path.read_text(encoding="utf-8", errors="replace")
        files.append({"path": rel, "bytes": size})
        stride = WINDOW - OVERLAP
        for start in range(0, max(1, len(body)), stride):
            chunk = body[start:start + WINDOW]
            if not chunk:
                break
            raw.append({"path": rel, "offset": start, "length": len(chunk),
                        "snippet": chunk[:150].replace("\n", " "),
                        "counts": collections.Counter(terms(chunk))})
            if start + WINDOW >= len(body):
                break

    if not files:
        raise SystemExit("No supported text files found")
    docfreq = collections.Counter()
    for chunk in raw:
        docfreq.update(chunk["counts"].keys())
    total = len(raw)
    chunks = []
    for chunk in raw:
        scored = sorted(chunk["counts"].items(),
                        key=lambda pair: -(1 + math.log(pair[1])) * math.log(1 + total / (1 + docfreq[pair[0]])))
        chunks.append({
            "path": chunk["path"],
            "offset": chunk["offset"],
            "length": chunk["length"],
            "terms": [word for word, _ in scored[:48]],
            "snippet": chunk["snippet"]
        })
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({
        "schema": 1,
        "source": "elder-plinius/CL4R1T4S",
        "root": "external/CL4R1T4S",
        "files": files,
        "chunks": chunks,
        "max_excerpt": 4800
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Indexed {len(files)} files and {total} text chunks: {output} ({output.stat().st_size} bytes)")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="external/CL4R1T4S")
    parser.add_argument("--output", default="reference-index.json")
    opts = parser.parse_args()
    index_tree(Path(opts.root), Path(opts.output))

if __name__ == "__main__":
    main()

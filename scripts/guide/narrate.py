"""Voices every line of the guide's chapters (edge-tts, Nigerian English) and records how long each is.

Usage: python scripts/guide/narrate.py   (reads out/lines.json from `node --experimental-strip-types dump.ts`)
Writes out/audio/<chapter>-<n>.mp3, out/audio/<chapter>-<n>.srt and out/narration.json.
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
AUDIO = OUT / 'audio'
VOICE = 'en-NG-EzinneNeural'
AUDIO.mkdir(parents=True, exist_ok=True)


def duration(path: Path) -> float:
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


lines = json.loads((OUT / 'lines.json').read_text(encoding='utf-8'))
result: dict[str, list[float]] = {}
for chapter in lines:
    result[chapter['id']] = []
    for n, say in enumerate(chapter['lines']):
        mp3 = AUDIO / f"{chapter['id']}-{n}.mp3"
        srt = AUDIO / f"{chapter['id']}-{n}.srt"
        for attempt in range(4):
            r = subprocess.run(['edge-tts', '--voice', VOICE, '--rate', '-4%', '--text', say, '--write-media', str(mp3), '--write-subtitles', str(srt)], capture_output=True, text=True)
            if r.returncode == 0 and mp3.exists() and mp3.stat().st_size > 1000:
                break
        else:
            sys.exit(f'could not voice {chapter["id"]} line {n}: {r.stderr[-300:]}')
        result[chapter['id']].append(round(duration(mp3), 3))
        print(chapter['id'], n, result[chapter['id']][-1])
(OUT / 'narration.json').write_text(json.dumps(result, indent=2), encoding='utf-8')

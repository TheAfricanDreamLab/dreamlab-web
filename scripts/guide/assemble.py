"""Puts each recorded chapter together with its narration: MP4 (H.264 + AAC), WebVTT captions and a poster.

Usage: python scripts/guide/assemble.py
Reads out/<chapter>.webm, out/<chapter>.timeline.json and out/audio/<chapter>-<n>.mp3/.srt;
writes public/guides/course-authoring/<chapter>.mp4, .vtt, .jpg and chapters.json (lengths for the page).
"""
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
DEST = HERE.parent.parent / 'public' / 'guides' / 'course-authoring'
DEST.mkdir(parents=True, exist_ok=True)
lines = json.loads((OUT / 'lines.json').read_text(encoding='utf-8'))


def srt_cues(path: Path):
    """(start, end, text) from an SRT file, in seconds."""
    def sec(t):
        h, m, s = t.replace(',', '.').split(':')
        return int(h) * 3600 + int(m) * 60 + float(s)
    out = []
    for block in re.split(r'\n\s*\n', path.read_text(encoding='utf-8').strip()):
        rows = [r for r in block.splitlines() if r.strip()]
        at = next((i for i, r in enumerate(rows) if '-->' in r), None)
        if at is None:
            continue
        a, b = [x.strip() for x in rows[at].split('-->')]
        out.append((sec(a), sec(b), ' '.join(rows[at + 1:]).strip()))
    return out


def vtt_time(s: float) -> str:
    ms = round(s * 1000)
    return f'{ms // 3600000:02}:{ms % 3600000 // 60000:02}:{ms % 60000 // 1000:02}.{ms % 1000:03}'


def group(cues, limit=84):
    """Word-level cues joined into readable caption lines (at most `limit` characters, ending at a sentence end when possible)."""
    out, cur = [], None
    for a, b, t in cues:
        if cur and (len(cur[2]) + 1 + len(t) > limit or cur[2].endswith(('.', '?', '!'))):
            out.append(cur)
            cur = None
        cur = [cur[0], b, f'{cur[2]} {t}'] if cur else [a, b, t]
    if cur:
        out.append(cur)
    return out


summary = []
for ch in lines:
    cid = ch['id']
    tl = json.loads((OUT / f'{cid}.timeline.json').read_text(encoding='utf-8'))
    length = tl['end']
    audio = [OUT / 'audio' / f'{cid}-{n}.mp3' for n in range(len(ch['lines']))]
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f"{tl['offset']:.3f}", '-i', str(OUT / f'{cid}.webm')]
    for a in audio:
        cmd += ['-i', str(a)]
    delays = ''.join(f"[{i + 1}:a]adelay={int(start * 1000)}|{int(start * 1000)}[a{i}];" for i, start in enumerate(tl['starts']))
    mix = ''.join(f'[a{i}]' for i in range(len(audio)))
    cmd += [
        '-filter_complex', f'{delays}{mix}amix=inputs={len(audio)}:normalize=0,apad[aout]',
        '-map', '0:v:0', '-map', '[aout]', '-t', f'{length:.3f}',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '96k', '-ac', '1',
        str(DEST / f'{cid}.mp4'),
    ]
    subprocess.run(cmd, check=True)
    cues = []
    for n, start in enumerate(tl['starts']):
        for a, b, t in group(srt_cues(OUT / 'audio' / f'{cid}-{n}.srt')):
            cues.append((start + a, start + b, t))
    (DEST / f'{cid}.vtt').write_text('WEBVTT\n\n' + '\n\n'.join(f'{vtt_time(a)} --> {vtt_time(b)}\n{t}' for a, b, t in cues) + '\n', encoding='utf-8')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '2.5', '-i', str(DEST / f'{cid}.mp4'), '-frames:v', '1', '-q:v', '4', str(DEST / f'{cid}.jpg')], check=True)
    size = (DEST / f'{cid}.mp4').stat().st_size
    summary.append({'id': cid, 'seconds': round(length)})
    print(f'{cid}: {length:.0f}s, {size // 1024} KB, {len(cues)} captions')
(DEST / 'chapters.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')

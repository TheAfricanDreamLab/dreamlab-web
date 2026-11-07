# Course-authoring guide videos

These scripts make the narrated videos on `/guide/course-authoring`. Each chapter in `chapters.ts` is a list of steps. A step has a line that is spoken (`say`) and what happens on screen while it is spoken (`act`). The page shows the same lines as its "Read it" text, so the video and the written guide always match.

Re-record after a change to the authoring screens, or after editing a chapter.

## What you need

- The local stack: the API with `EMAIL_PROVIDER=console`, and the web app built and started on port 3100. The catalog runs its video worker in development, so the sample upload is processed.
- Python 3 with `edge-tts` 7.3.1 or later (`pip install edge-tts`), and `ffmpeg` and `ffprobe` on the PATH.
- Chrome, which Playwright uses to record.

## Steps

From the web repository:

```powershell
pnpm guide:lines      # out/lines.json: every chapter's narration
pnpm guide:voice      # out/audio and out/narration.json: Nigerian English voice (en-NG-EzinneNeural)
$env:IAM_LOG = "../dreamlab-api/.logs/dev-api.log"
pnpm guide:record     # out/<chapter>.webm and timelines: signs up a demo company and records each chapter
pnpm guide:assemble   # public/guides/course-authoring: <chapter>.mp4, .vtt captions, .jpg poster, chapters.json
```

- `IAM_LOG` points at the API's log, where the console email provider writes sign-up codes.
- Recording takes about 6 minutes. Each step waits until its line has been spoken.
- The sample files (lesson video, captions, worksheet) come from `docs/UAT_Materials/Course_Authoring/files` in the dream-lab workspace, next to this repository.
- Commit the files in `public/guides/course-authoring`. Everything in `out/` is scratch and is ignored.

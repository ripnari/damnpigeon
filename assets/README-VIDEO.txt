HERO VIDEO
==========
Drop the downloaded hero video here as:   file.mp4

index.html loads it from  assets/file.mp4  first, and automatically falls back
to her Wix CDN copy if that file is missing, so the page works either way.

To confirm which one is being used: open the deployed site, open the browser
console, and look for "Hero video source in use: ..."
  - ends in /assets/file.mp4          -> local copy, correct
  - starts with video.wixstatic.com   -> local file missing or misnamed

Notes
-----
- Keep the filename exactly  file.mp4  (lowercase).
- 7.4 MB will work but is heavy for a hero. If you want it lighter, compress to
  ~2-3 MB: it is muted and looping, so the audio track can be stripped entirely.
- poster="assets/hero-poster.jpg" is frame 0 of the clip (the studio shot). If
  you want the dove-cap frame instead, save that still as hero-poster.jpg.

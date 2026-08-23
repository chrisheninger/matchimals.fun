# App Store previews

The App Preview videos for the App Store listing — a Cat vs. Gorilla game
recorded from the live web game on an emulated iPhone (`app-preview-iphone-6.5.mp4`,
886 × 1920 for the 6.5" slot) and iPad (`app-preview-ipad-13.mp4`,
1200 × 1600 for the 13" slot), with the app's soundtrack.

- The pair at the top of this folder is the en-US take and is committed; it is
  also the fallback for any storefront without its own.
- `<storefront>/` holds the take recorded in that storefront's language (the
  nameplates read "Katze" and "Gorilla" in de-DE, and so on). Those folders
  are gitignored — twenty 38 MB videos are too much for the repo — so
  regenerate them before uploading.

Regenerate from the marketing site repo (checked out beside this one):

```bash
cd ../matchimals.com/scripts/record-gameplay && npm install
./record-previews.sh --out ../../../matchimals.fun/store/previews   # all storefronts, ~20 min
./record-previews.sh --out ../../../matchimals.fun/store/previews ja ko   # a subset
```

Then upload with `bun run asc:previews`: a storefront with its own folder gets
that take, the rest get the en-US pair, and a preview already in App Store
Connect is re-uploaded only when the file on disk is another take (`--replace`
to re-upload them all, `--status` to see what is there).

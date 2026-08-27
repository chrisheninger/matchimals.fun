# Device frame art

Device bezels for `bun run screenshots:caption --frame device`, one per
display folder, named after the display they frame.

| file             | device                              | canvas    | screen               |
| ---------------- | ----------------------------------- | --------- | -------------------- |
| `iphone-6.5.png` | iPhone 14 Plus (Midnight)           | 1429×2902 | 1284×2778 at +74+60  |
| `ipad-13.png`    | iPad Pro 12.9″ 4th gen (Space Gray) | 2245×2930 | 2048×2732 at +96+102 |

From [fastlane/frameit-frames](https://github.com/fastlane/frameit-frames)
(`latest/`), which generates them from Apple's marketing resources for
exactly this use — showcasing an app in App Store screenshots. The screen
offsets come from that repo's `offsets.json`; a replacement frame needs its
offsets updated in `scripts/caption-screenshots.mjs`.

# Caption fonts

Faces used by `bun run screenshots:caption` (the app itself ships only
Dimbo). Dimbo has no CJK glyphs, so those storefronts set their captions in
rounded companions from [google/fonts](https://github.com/google/fonts), all
under the SIL Open Font License:

| file                      | face                    | storefronts   | license                  |
| ------------------------- | ----------------------- | ------------- | ------------------------ |
| `Dimbo.ttf`               | Dimbo (Jayvee Enaguas)  | Latin scripts | free (see font)          |
| `MPLUSRounded1c-Bold.ttf` | M PLUS Rounded 1c       | ja            | `OFL-MPLUSRounded1c.txt` |
| `Jua-Regular.ttf`         | Jua (Woowahan Brothers) | ko            | `OFL-Jua.txt`            |
| `ZCOOLKuaiLe-Regular.ttf` | ZCOOL KuaiLe            | zh-Hans       | `OFL-ZCOOLKuaiLe.txt`    |

Which storefront takes which face is `FONTS` in
`scripts/caption-screenshots.mjs`.

# Translations review

Every string in the app beside its English source, generated from `src/locales/` by `bun scripts/translations-review.mjs`. The translations are AI-written and pending review by native speakers: please read one column top to bottom, and fix the locale file rather than this table.

Titles and buttons are shown in CAPITALS in the app (applied at render with the locale's casing rules); `{name}`, `{animal}` and `{n}` are filled in at runtime. Animal names double as the players' names on the nameplates, so the shortest everyday word a kindergarten teacher would use is preferred. Keys starting with `a11y` are read by VoiceOver only.

| key | en | es | es-MX | pt-BR | de | fr | it | ja | ko | zh-Hans |
|---|---|---|---|---|---|---|---|---|---|---|
| `howManyPlayers` | How many players? | ¿Cuántos jugadores? | ¿Cuántos jugadores? | Quantos jogadores? | Wie viele Spieler? | Combien de joueurs ? | Quanti giocatori? | なんにんであそぶ？ | 몇 명이 놀까요? | 几个人玩？ |
| `easyMode` | Easy mode | Modo fácil | Modo fácil | Modo fácil | Leicht | Mode facile | Facile | かんたん | 쉬움 | 简单 |
| `classic` | Classic | Clásico | Clásico | Clássico | Klassisch | Classique | Classico | クラシック | 클래식 | 经典 |
| `easyCaption` | Always a match to make | Siempre hay un animal que encaja | Siempre hay un animal que encaja | Sempre tem um bicho que combina | Es passt immer eine Karte | Il y a toujours une carte à poser | C’è sempre una carta da mettere | いつもどこかにおけるよ | 언제나 놓을 수 있어요 | 总有一张牌能放 |
| `classicCaption` | Match if you can, pass if not | Empareja si puedes, si no, pasa | Empareja si puedes, si no, pasa | Combine se der, senão, passe | Passt nichts, musst du passen | Pose si tu peux, sinon passe | Abbina se puoi, altrimenti passa | おけないときはパス | 놓을 수 없으면 패스해요 | 能放就放，不能就过 |
| `settings` | Settings | Ajustes | Configuración | Ajustes | Einstellungen | Réglages | Impostazioni | 設定 | 설정 | 设置 |
| `music` | Music | Música | Música | Música | Musik | Musique | Musica | 音楽 | 음악 | 音乐 |
| `soundEffects` | Sound Effects | Efectos de sonido | Efectos de sonido | Efeitos sonoros | Soundeffekte | Effets sonores | Effetti sonori | 効果音 | 효과음 | 音效 |
| `vibration` | Vibration | Vibración | Vibración | Vibração | Vibration | Vibration | Vibrazione | バイブレーション | 진동 | 震动 |
| `appIcon` | App Icon | Icono de la app | Ícono de la app | Ícone do app | App-Symbol | Icône de l’app | Icona dell’app | アプリアイコン | 앱 아이콘 | 应用图标 |
| `yourAnimal` | Your animal | Tu animal | Tu animal | Seu bicho | Dein Tier | Ton animal | Il tuo animale | きみのどうぶつ | 내 동물 | 你的动物 |
| `done` | Done | Hecho | Listo | Pronto | Fertig | OK | Fatto | 完了 | 완료 | 完成 |
| `on` | On | Sí | Sí | Sim | An | Oui | Sì | オン | 켬 | 开 |
| `off` | Off | No | No | Não | Aus | Non | No | オフ | 끔 | 关 |
| `scrollToCenter` | Scroll to center | Ir al centro | Ir al centro | Ir para o centro | Zur Mitte | Recentrer | Vai al centro | 中央にもどる | 가운데로 | 回到中间 |
| `exitToMainMenu` | Exit to main menu | Salir al menú | Salir al menú | Sair para o menu | Zum Hauptmenü | Menu principal | Menu principale | メニューへ | 메인 메뉴로 | 回主菜单 |
| `wins` | {name} wins! | ¡{name} gana! | ¡{name} gana! | {name} venceu! | {name} gewinnt! | {name} a gagné ! | {name} vince! | {name}のかち！ | {name} 승리! | {name}赢了！ |
| `share` | Share | Compartir | Compartir | Compartilhar | Teilen | Partager | Condividi | 共有 | 공유 | 分享 |
| `shareMessage` | {name} won {scores} in Matchimals {emoji} Free, no ads: {url} | {name} ganó {scores} en Matchimals {emoji} Gratis y sin anuncios: {url} | {name} ganó {scores} en Matchimals {emoji} Gratis y sin anuncios: {url} | {name} venceu por {scores} no Matchimals {emoji} Grátis e sem anúncios: {url} | {name} gewinnt {scores} bei Matchimals {emoji} Kostenlos und ohne Werbung: {url} | {name} a gagné {scores} sur Matchimals {emoji} Gratuit et sans pub : {url} | {name} ha vinto {scores} a Matchimals {emoji} Gratis e senza pubblicità: {url} | Matchimalsで{name}が{scores}でかち！{emoji} 無料・広告なし：{url} | {name} Matchimals에서 {scores}로 승리! {emoji} 무료, 광고 없음: {url} | {name}在Matchimals中以{scores}获胜！{emoji} 免费、无广告：{url} |
| `shareFooter` | free · no ads | gratis · sin anuncios | gratis · sin anuncios | grátis · sem anúncios | kostenlos · ohne Werbung | gratuit · sans pub | gratis · senza pubblicità | 無料 · 広告なし | 무료 · 광고 없음 | 免费 · 无广告 |
| `pass` | Pass | Pasar | Pasar | Passar | Passen | Passer | Passa | パス | 패스 | 跳过 |
| `menu` | Menu | Menú | Menú | Menu | Menü | Menu | Menu | メニュー | 메뉴 | 菜单 |
| `exit` | Exit | Salir | Salir | Sair | Beenden | Quitter | Esci | やめる | 나가기 | 退出 |
| `center` | Center | Centrar | Centrar | Centralizar | Mitte | Centrer | Centra | 中央 | 가운데 | 居中 |
| `a11ySoundEffects` | Sound effects | Efectos de sonido | Efectos de sonido | Efeitos sonoros | Soundeffekte | Effets sonores | Effetti sonori | 効果音 | 효과음 | 音效 |
| `a11yAppIcon` | App icon, currently {animal} | Icono de la app, ahora {animal} | Ícono de la app, ahora {animal} | Ícone do app, agora {animal} | App-Symbol, aktuell {animal} | Icône de l’app, actuellement {animal} | Icona dell’app, attuale {animal} | アプリアイコン、現在は{animal} | 앱 아이콘, 현재 {animal} | 应用图标，当前为{animal} |
| `a11yChooseAppIcon` | Choose a different app icon | Elige otro icono para la app | Elige otro ícono para la app | Escolha outro ícone para o app | Ein anderes App-Symbol wählen | Choisir une autre icône | Scegli un’altra icona | 別のアプリアイコンを選ぶ | 다른 앱 아이콘 선택 | 选择其他应用图标 |
| `a11yUseAppIcon` | Use the {animal} app icon | Usar el icono de {animal} | Usar el ícono de {animal} | Usar o ícone de {animal} | {animal} als App-Symbol verwenden | Utiliser l’icône {animal} | Usa l’icona {animal} | {animal}のアイコンを使う | {animal} 아이콘 사용 | 使用{animal}图标 |
| `a11yPlayAs` | Play as the {animal} | Jugar como {animal} | Jugar como {animal} | Jogar como {animal} | Als {animal} spielen | Jouer avec {animal} | Gioca come {animal} | {animal}であそぶ | {animal} 선택 | 选择{animal} |
| `players.one` | {n} player | {n} jugador | {n} jugador | {n} jogador | {n} Spieler | {n} joueur | {n} giocatore | {n}人 | {n}명 | {n}人 |
| `players.other` | {n} players | {n} jugadores | {n} jugadores | {n} jogadores | {n} Spieler | {n} joueurs | {n} giocatori | {n}人 | {n}명 | {n}人 |
| `animals.Bat` | Bat | Murciélago | Murciélago | Morcego | Fledermaus | Chauve-souris | Pipistrello | コウモリ | 박쥐 | 蝙蝠 |
| `animals.Bear` | Bear | Oso | Oso | Urso | Bär | Ours | Orso | クマ | 곰 | 熊 |
| `animals.Boar` | Boar | Jabalí | Jabalí | Javali | Wildschwein | Sanglier | Cinghiale | イノシシ | 멧돼지 | 野猪 |
| `animals.Bunny` | Bunny | Conejo | Conejo | Coelho | Hase | Lapin | Coniglio | ウサギ | 토끼 | 兔子 |
| `animals.Butterfly` | Butterfly | Mariposa | Mariposa | Borboleta | Schmetterling | Papillon | Farfalla | チョウチョ | 나비 | 蝴蝶 |
| `animals.Cat` | Cat | Gato | Gato | Gato | Katze | Chat | Gatto | ネコ | 고양이 | 猫 |
| `animals.Chick` | Chick | Pollito | Pollito | Pintinho | Küken | Poussin | Pulcino | ヒヨコ | 병아리 | 小鸡 |
| `animals.Chicken` | Chicken | Gallina | Gallina | Galinha | Huhn | Poule | Gallina | ニワトリ | 닭 | 母鸡 |
| `animals.Cow` | Cow | Vaca | Vaca | Vaca | Kuh | Vache | Mucca | ウシ | 소 | 牛 |
| `animals.Dog` | Dog | Perro | Perro | Cachorro | Hund | Chien | Cane | イヌ | 강아지 | 狗 |
| `animals.Fox` | Fox | Zorro | Zorro | Raposa | Fuchs | Renard | Volpe | キツネ | 여우 | 狐狸 |
| `animals.Frog` | Frog | Rana | Rana | Sapo | Frosch | Grenouille | Rana | カエル | 개구리 | 青蛙 |
| `animals.Giraffe` | Giraffe | Jirafa | Jirafa | Girafa | Giraffe | Girafe | Giraffa | キリン | 기린 | 长颈鹿 |
| `animals.Gorilla` | Gorilla | Gorila | Gorila | Gorila | Gorilla | Gorille | Gorilla | ゴリラ | 고릴라 | 大猩猩 |
| `animals.Hamster` | Hamster | Hámster | Hámster | Hamster | Hamster | Hamster | Criceto | ハムスター | 햄스터 | 仓鼠 |
| `animals.Hedgehog` | Hedgehog | Erizo | Erizo | Ouriço | Igel | Hérisson | Riccio | ハリネズミ | 고슴도치 | 刺猬 |
| `animals.Koala` | Koala | Koala | Koala | Coala | Koala | Koala | Koala | コアラ | 코알라 | 考拉 |
| `animals.Lion` | Lion | León | León | Leão | Löwe | Lion | Leone | ライオン | 사자 | 狮子 |
| `animals.Monkey` | Monkey | Mono | Mono | Macaco | Affe | Singe | Scimmia | サル | 원숭이 | 猴子 |
| `animals.Mouse` | Mouse | Ratón | Ratón | Rato | Maus | Souris | Topo | ネズミ | 생쥐 | 老鼠 |
| `animals.Owl` | Owl | Búho | Búho | Coruja | Eule | Hibou | Gufo | フクロウ | 부엉이 | 猫头鹰 |
| `animals.Panda` | Panda | Panda | Panda | Panda | Panda | Panda | Panda | パンダ | 판다 | 熊猫 |
| `animals.Penguin` | Penguin | Pingüino | Pingüino | Pinguim | Pinguin | Pingouin | Pinguino | ペンギン | 펭귄 | 企鹅 |
| `animals.Pig` | Pig | Cerdo | Cerdo | Porco | Schwein | Cochon | Maiale | ブタ | 돼지 | 猪 |
| `animals.Tiger` | Tiger | Tigre | Tigre | Tigre | Tiger | Tigre | Tigre | トラ | 호랑이 | 老虎 |
| `animals.Turtle` | Turtle | Tortuga | Tortuga | Tartaruga | Schildkröte | Tortue | Tartaruga | カメ | 거북이 | 乌龟 |
| `animals.Wolf` | Wolf | Lobo | Lobo | Lobo | Wolf | Loup | Lupo | オオカミ | 늑대 | 狼 |
| `animals.Zebra` | Zebra | Cebra | Cebra | Zebra | Zebra | Zèbre | Zebra | シマウマ | 얼룩말 | 斑马 |

## Notes on choices

### es

- Spain's words where iOS itself differs by region: «Ajustes», «Hecho», «icono».
- The on/off switch is 40 px wide, so «Sí»/«No» stand in for ON/OFF.
- «Cerdo» over regional «cochino»/«chancho» — understood everywhere.

### es-MX

- Only the words that differ from Spain: «Configuración», «Listo», «ícono» (as iOS uses them in Latin America).
- Chosen for every Spanish-speaking region of the Americas (and es-419), not only Mexico.

### pt-BR

- «bicho» rather than «animal» where the app talks to children («Seu bicho») — warmer, and the usual nursery word.
- «Cachorro» over «Cão»; «Coala» in the Portuguese spelling; «Sim»/«Não» on the switch.

### de

- Mode toggle segments are 150 px, so «Leicht»/«Klassisch» rather than «Einfacher Modus».
- «Schmetterling» kept over «Falter» (it is the children's word); the nameplate widens for it and the victory title wraps onto two lines. «Wildschwein» and «Schildkröte» also widen the plate.
- «An»/«Aus» on the switch; «Fertig» for Done; «App-Symbol» is Apple's term.

### fr

- «Pingouin» instead of the zoologically correct «Manchot» — it is what children (and most adults) say.
- «Chauve-souris» widens the nameplate and wraps the victory title; «Grenouille» fits.
- «OK» for Done and «Réglages» for Settings, as on iOS; «Oui»/«Non» on the switch; French spacing before «?» and «!».

### it

- «Mucca» over «Vacca»; «Sì»/«No» on the switch; «Fatto» for Done; «Impostazioni» as on iOS.

### ja

- Platform font: Dimbo has no kana or kanji.
- Animal names in katakana, as in picture books. Strings aimed at children stay in kana («なんにんであそぶ？», «きみのどうぶつ», «〜のかち！»); settings use the kanji iOS uses (設定, 音楽, 効果音, 完了).
- «メニューへ» is deliberately short — the measured «メニューにもどる» overflows the 224 px button.
- ハムスター / ハリネズミ / チョウチョ widen the nameplate; their chooser labels shrink slightly to fit.

### ko

- Platform font. Polite-casual -요 endings, suited to parents reading with children.
- «강아지» (puppy) over «개», as in children's media; «생쥐» for Mouse, «부엉이» for Owl; «켬»/«끔» are iOS's own switch words.

### zh-Hans

- Platform font. «母鸡» for Chicken (the card shows a hen) next to «小鸡» for Chick; «考拉»; «开»/«关»; «跳过» for Pass.

## Store listing

`store/metadata/<locale>/` holds each storefront's name, subtitle, keywords, promotional text, description and release notes. Keywords were written for how parents search in each market (for example «sin anuncios», «ohne Werbung», «sans pub», «広告なし», «광고없음», «无广告») rather than translated word for word, and avoid repeating words already in the name or subtitle. `bun run check:locales` enforces App Store Connect's character limits.

import type { Translations } from "./types";

// Animal names in katakana, as in picture books; the rest mostly in kana so
// the youngest players can sound it out
const ja: Translations = {
  font: "system",

  howManyPlayers: "なんにんであそぶ？",
  easyMode: "かんたん",
  classic: "クラシック",
  easyCaption: "いつもどこかにおけるよ",
  classicCaption: "おけないときはパス",

  settings: "設定",
  music: "音楽",
  soundEffects: "効果音",
  vibration: "バイブレーション",
  appIcon: "アプリアイコン",
  yourAnimal: "きみのどうぶつ",
  done: "完了",
  on: "オン",
  off: "オフ",

  scrollToCenter: "中央にもどる",
  exitToMainMenu: "メニューへ",
  wins: "{name}のかち！",

  pass: "パス",
  menu: "メニュー",
  exit: "やめる",
  center: "中央",

  a11ySoundEffects: "効果音",
  a11yAppIcon: "アプリアイコン、現在は{animal}",
  a11yChooseAppIcon: "別のアプリアイコンを選ぶ",
  a11yUseAppIcon: "{animal}のアイコンを使う",
  a11yPlayAs: "{animal}であそぶ",

  players: { one: "{n}人", other: "{n}人" },
  animals: {
    Bat: "コウモリ",
    Bear: "クマ",
    Boar: "イノシシ",
    Bunny: "ウサギ",
    Butterfly: "チョウチョ",
    Cat: "ネコ",
    Chick: "ヒヨコ",
    Chicken: "ニワトリ",
    Cow: "ウシ",
    Dog: "イヌ",
    Fox: "キツネ",
    Frog: "カエル",
    Giraffe: "キリン",
    Gorilla: "ゴリラ",
    Hamster: "ハムスター",
    Hedgehog: "ハリネズミ",
    Koala: "コアラ",
    Lion: "ライオン",
    Monkey: "サル",
    Mouse: "ネズミ",
    Owl: "フクロウ",
    Panda: "パンダ",
    Penguin: "ペンギン",
    Pig: "ブタ",
    Tiger: "トラ",
    Turtle: "カメ",
    Wolf: "オオカミ",
    Zebra: "シマウマ",
  },
};

export default ja;

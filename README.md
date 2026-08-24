# ਸ਼ਬਦ — Punjabi word game

A Gurmukhi word-guessing game: pick a word length, type with an on-screen Punjabi keyboard, and keep playing new words.

This project is original code. It does **not** copy New York Times Wordle assets, trademarks, or source. The lexicon is built only from **open-source** corpora.

## Play

Open `index.html` in a browser, or serve the folder (this layout works on GitHub Pages from the repo root).

1. Choose word size (2–6 Gurmukhi akshars — a letter plus its matra counts as one, e.g. ਗ + ੁ = ਗੁ).
2. Type with the full on-screen Gurmukhi keyboard.
3. Press **ਠੀਕ** to submit a guess. You get six tries.
4. **ਸੰਕੇਤ** reveals one correct letter position at a time, up to n−1 letters.
5. **ਸ਼ਬਦ ਵਿਖਾਓ ਤੇ ਖੇਡ ਖਤਮ** shows the answer and ends the round.
6. After a round, choose **ਅਗਲੀ ਖੇਡ** for another word of the same length.

## Word list (open source only)

About **59,800** allowed guesses (2–6 akshars) are bundled, with about **14,500** dictionary-style secret answers, from:

| Source | License |
| --- | --- |
| Punjabi Wikipedia article titles | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Punjabi Wiktionary article titles | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| LibreOffice Hunspell `pa_IN` dictionary | [MPL-2.0](https://mozilla.org/MPL/2.0/) |

Details and URLs: [`data/NOTICE.txt`](data/NOTICE.txt).

Rebuild the bank after placing dumps in `data/raw/`:

```text
python scripts/build_wordlist.py
```

Expected raw files (not shipped in git):

- `data/raw/pawiki-titles.gz`
- `data/raw/pawiktionary-titles.gz`
- `data/raw/pa_IN.dic`

## License

- Game code (HTML/CSS/JS/Python): MIT — see [`LICENSE`](LICENSE)
- Bundled word list: CC BY-SA 4.0 + MPL-2.0 as listed in [`data/NOTICE.txt`](data/NOTICE.txt)

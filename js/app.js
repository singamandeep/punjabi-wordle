(() => {
  const MAX_GUESSES = 6;
  const LENGTHS = ["2", "3", "4", "5", "6"];

  const INDEPENDENT = new Set("ਅਆਇਈਉਊਏਐਓਔੲੳ");
  const CONSONANTS = new Set("ਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਲ਼ਵਸ਼ਸਹੜਖ਼ਗ਼ਜ਼ਫ਼");
  const MATRAS = new Set("ਾਿੀੁੂੇੈੋੌ");
  const SIGNS = new Set("ਂਃੰੱੑੵ");
  const NUKTA = "਼";
  const VIRAMA = "੍";

  const KEYBOARD = [
    ["ਅ", "ਆ", "ਇ", "ਈ", "ਉ", "ਊ", "ਏ", "ਐ", "ਓ", "ਔ"],
    ["ਾ", "ਿ", "ੀ", "ੁ", "ੂ", "ੇ", "ੈ", "ੋ", "ੌ", "੍"],
    ["ਕ", "ਖ", "ਗ", "ਘ", "ਙ", "ਚ", "ਛ", "ਜ", "ਝ", "ਞ"],
    ["ਟ", "ਠ", "ਡ", "ਢ", "ਣ", "ਤ", "ਥ", "ਦ", "ਧ", "ਨ"],
    ["ਪ", "ਫ", "ਬ", "ਭ", "ਮ", "ਯ", "ਰ", "ਲ", "ਵ", "ੜ"],
    ["ਸ", "ਹ", "ਸ਼", "ਲ਼", "ਖ਼", "ਗ਼", "ਜ਼", "ਫ਼", "ੲ", "ੳ"],
    ["ਂ", "ੰ", "ੱ", "਼", "ਃ", "ੑ", "ੵ", "back", "enter"],
  ];

  const RANK = { correct: 3, present: 2, absent: 1 };
  const THEME_KEY = "shabad-bg-theme";
  const SCORE_KEY = "shabad-total-score";
  const POINTS_PER_LETTER = 25;
  const PENALTY_PER_EXTRA_GUESS = 5;
  const PENALTY_PER_HINT = 5;
  const THEMES = [
    { id: "purple", label: "ਜਾਮਨੀ", swatch: "#6b3d8c", meta: "#1b1024" },
    { id: "green", label: "ਹਰਾ", swatch: "#2f8f62", meta: "#102418" },
    { id: "blue", label: "ਨੀਲਾ", swatch: "#3d6db5", meta: "#101828" },
    { id: "maroon", label: "ਮਰੂਨ", swatch: "#8e2f3a", meta: "#241014" },
    { id: "teal", label: "ਸਮੁੰਦਰੀ", swatch: "#2a8a86", meta: "#102422" },
    { id: "night", label: "ਕਾਲਾ", swatch: "#3a3a42", meta: "#121214" },
    { id: "saffron", label: "ਕੇਸਰੀ", swatch: "#c47a12", meta: "#24180c" },
  ];

  const els = {
    board: document.getElementById("board"),
    keyboard: document.getElementById("keyboard"),
    status: document.getElementById("status"),
    setup: document.getElementById("setup-modal"),
    help: document.getElementById("help-modal"),
    end: document.getElementById("end-modal"),
    lengthGrid: document.getElementById("length-grid"),
    endTitle: document.getElementById("end-title"),
    endAnswer: document.getElementById("end-answer"),
    endScore: document.getElementById("end-score"),
    scoreLine: document.getElementById("score-line"),
    setupTitle: document.getElementById("setup-title"),
    setupCopy: document.getElementById("setup-copy"),
  };

  const state = {
    length: 4,
    answer: "",
    guesses: [],
    current: [],
    keyColors: {},
    playing: false,
    allowed: new Set(),
    gaveUp: false,
    hinted: [],
    wasPlaying: false,
    setupFromEnd: false,
    setupMode: "single",
    setupStep: "mode",
    setupEntryStep: "mode",
    modeLocked: false,
    syncSeed: "",
    syncIndex: 0,
    syncLength: null,
  };

  const lists = {};
  function bankFor(length, kind = "guesses") {
    const key = String(length);
    const cacheKey = `${key}:${kind}`;
    if (!lists[cacheKey]) {
      const entry = window.WORD_BANK && window.WORD_BANK[key];
      if (Array.isArray(entry)) lists[cacheKey] = entry;
      else lists[cacheKey] = (entry && entry[kind]) || [];
    }
    return lists[cacheKey];
  }

  function isCombining(ch) {
    return MATRAS.has(ch) || SIGNS.has(ch) || ch === NUKTA || ch === VIRAMA;
  }

  function isBase(ch) {
    return CONSONANTS.has(ch) || INDEPENDENT.has(ch);
  }

  function akshars(word) {
    const clusters = [];
    for (const ch of word) {
      if (!clusters.length) {
        clusters.push(ch);
        continue;
      }
      const last = clusters[clusters.length - 1];
      if (isCombining(ch)) {
        clusters[clusters.length - 1] = last + ch;
        continue;
      }
      if (CONSONANTS.has(ch) && last.endsWith(VIRAMA)) {
        clusters[clusters.length - 1] = last + ch;
        continue;
      }
      clusters.push(ch);
    }
    return clusters;
  }

  function hasMatra(cluster) {
    return Array.from(cluster).some((ch) => MATRAS.has(ch));
  }

  function hasConsonant(cluster) {
    return Array.from(cluster).some((ch) => CONSONANTS.has(ch));
  }

  function attachToCluster(cluster, ch) {
    if (MATRAS.has(ch) && hasMatra(cluster)) {
      return cluster.replace(/[ਾਿੀੁੂੇੈੋੌ]/, ch);
    }
    return cluster + ch;
  }

  function canAttach(cluster, ch) {
    if (!cluster) return false;
    if (ch === NUKTA) {
      const chars = Array.from(cluster);
      return CONSONANTS.has(chars[chars.length - 1]);
    }
    if (ch === VIRAMA) {
      const chars = Array.from(cluster);
      const last = chars[chars.length - 1];
      return CONSONANTS.has(last) || last === NUKTA;
    }
    if (MATRAS.has(ch)) return hasConsonant(cluster);
    if (SIGNS.has(ch)) return true;
    if (CONSONANTS.has(ch) && cluster.endsWith(VIRAMA)) return true;
    return false;
  }

  function setStatus(message) {
    els.status.textContent = message || "";
  }

  function answerParts() {
    return akshars(state.answer);
  }

  function blankRow() {
    return Array(state.length).fill("");
  }

  function isHinted(index) {
    return state.hinted.includes(index);
  }

  function maxHints() {
    return Math.max(0, state.length - 1);
  }

  function applyHints(row) {
    const parts = answerParts();
    const next = row.slice();
    state.hinted.forEach((index) => {
      next[index] = parts[index] || "";
    });
    return next;
  }

  function lastEditableIndex() {
    for (let i = state.current.length - 1; i >= 0; i -= 1) {
      if (!isHinted(i) && state.current[i]) return i;
    }
    return -1;
  }

  function firstEmptyEditable() {
    for (let i = 0; i < state.length; i += 1) {
      if (!isHinted(i) && !state.current[i]) return i;
    }
    return -1;
  }

  function rowFilled() {
    return state.current.length === state.length && state.current.every(Boolean);
  }

  function updateHintButton() {
    const btn = document.getElementById("hint-btn");
    const used = state.hinted.length;
    const max = maxHints();
    btn.textContent = `ਸੰਕੇਤ (${used}/${max})`;
    btn.disabled = !state.playing || used >= max;
  }

  function setPlayActionsVisible(visible) {
    document.getElementById("giveup-btn").classList.toggle("hidden", !visible);
    document.getElementById("hint-btn").classList.toggle("hidden", !visible);
    if (visible) updateHintButton();
  }

  let forcedWord = new URLSearchParams(location.search).get("word");
  const sequenceCache = {};

  function normalizeSeed(raw) {
    return String(raw || "").normalize("NFC").trim();
  }

  function hashSeed(str) {
    let hash = 2166136261;
    for (const ch of str) {
      hash ^= ch.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffledAnswers(list, seed, length) {
    const rng = mulberry32(hashSeed(`${seed}|${length}`));
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const swap = arr[i];
      arr[i] = arr[j];
      arr[j] = swap;
    }
    return arr;
  }

  function syncSequence(length) {
    const key = `${state.syncSeed}|${length}`;
    if (!sequenceCache[key]) {
      sequenceCache[key] = shuffledAnswers(bankFor(length, "answers"), state.syncSeed, length);
    }
    return sequenceCache[key];
  }

  function readSyncSeed() {
    const input = document.getElementById("sync-seed");
    return normalizeSeed(input ? input.value : "");
  }

  function applySyncSettings(length) {
    const seed = state.setupMode === "multi" ? readSyncSeed() : "";
    const size = Number(length);
    if (seed !== state.syncSeed || size !== state.syncLength) {
      state.syncSeed = seed;
      state.syncLength = seed ? size : null;
      state.syncIndex = 0;
    }
  }

  function pickAnswer(length) {
    const list = bankFor(length, "answers");
    if (!list.length) return "";
    if (forcedWord && bankFor(length, "guesses").includes(forcedWord)) {
      const word = forcedWord;
      forcedWord = null;
      return word;
    }
    if (state.syncSeed) {
      const sequence = syncSequence(length);
      if (!sequence.length) return "";
      return sequence[state.syncIndex % sequence.length];
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  function evaluate(guess, answer) {
    const g = akshars(guess);
    const a = akshars(answer);
    const result = Array(g.length).fill("absent");
    const remaining = {};

    for (let i = 0; i < a.length; i += 1) {
      if (g[i] === a[i]) result[i] = "correct";
      else remaining[a[i]] = (remaining[a[i]] || 0) + 1;
    }
    for (let i = 0; i < g.length; i += 1) {
      if (result[i] === "correct") continue;
      if (remaining[g[i]] > 0) {
        result[i] = "present";
        remaining[g[i]] -= 1;
      }
    }
    return result;
  }

  function upgradeKey(letter, color) {
    const prev = state.keyColors[letter];
    if (!prev || RANK[color] > RANK[prev]) state.keyColors[letter] = color;
  }

  function upgradeKeysFromAkshar(cluster, color) {
    for (const ch of cluster) {
      if (isCombining(ch) && color === "absent") continue;
      upgradeKey(ch, color);
    }
  }

  function tileSize(length) {
    const max = Math.min(58, Math.floor((Math.min(window.innerWidth, 540) - 48) / length) - 6);
    return Math.max(36, max);
  }

  function renderBoard() {
    const n = state.length;
    const size = tileSize(n);
    els.board.style.setProperty("--tile", `${size}px`);
    els.board.innerHTML = "";

    for (let r = 0; r < MAX_GUESSES; r += 1) {
      const row = document.createElement("div");
      row.className = "row";
      row.style.gridTemplateColumns = `repeat(${n}, var(--tile))`;

      let letters = [];
      let colors = [];
      if (r < state.guesses.length) {
        letters = akshars(state.guesses[r].word);
        colors = state.guesses[r].colors;
      } else if (r === state.guesses.length && state.gaveUp) {
        letters = akshars(state.answer);
        colors = Array(n).fill("revealed");
      } else if (r === state.guesses.length) {
        letters = state.current.slice();
      }

      for (let c = 0; c < n; c += 1) {
        const tile = document.createElement("div");
        tile.className = "tile";
        if (letters[c]) {
          tile.textContent = letters[c];
          tile.classList.add("filled");
        }
        if (colors[c]) tile.classList.add(colors[c]);
        if (r === state.guesses.length && !state.gaveUp && isHinted(c) && letters[c]) {
          tile.classList.add("hinted");
        }
        row.appendChild(tile);
      }
      els.board.appendChild(row);
    }
  }

  function renderKeyboard() {
    els.keyboard.innerHTML = "";
    KEYBOARD.forEach((rowKeys) => {
      const row = document.createElement("div");
      row.className = "key-row";
      rowKeys.forEach((key) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        if (key === "enter") {
          btn.classList.add("wide");
          btn.textContent = "ਠੀਕ";
        } else if (key === "back") {
          btn.classList.add("wide");
          btn.textContent = "⌫";
        } else {
          btn.textContent = key;
          if (isCombining(key)) btn.classList.add("matra");
          const color = state.keyColors[key];
          if (color) btn.classList.add(color);
        }
        btn.addEventListener("click", () => onKey(key));
        row.appendChild(btn);
      });
      els.keyboard.appendChild(row);
    });
  }

  function shakeCurrentRow() {
    const row = els.board.children[state.guesses.length];
    if (!row) return;
    row.classList.remove("shake");
    void row.offsetWidth;
    row.classList.add("shake");
  }

  function submitGuess() {
    if (!state.playing) return;
    if (!rowFilled()) {
      setStatus("ਪਹਿਲਾਂ ਪੂਰੀ ਕਤਾਰ ਭਰੋ");
      shakeCurrentRow();
      return;
    }
    const word = state.current.join("");
    if (!state.allowed.has(word)) {
      setStatus("ਇਹ ਸ਼ਬਦ ਸੂਚੀ ਵਿੱਚ ਨਹੀਂ");
      shakeCurrentRow();
      return;
    }

    const colors = evaluate(word, state.answer);
    state.guesses.push({ word, colors });
    colors.forEach((color, i) => upgradeKeysFromAkshar(state.current[i], color));
    state.current = applyHints(blankRow());
    setStatus("");
    renderBoard();
    renderKeyboard();
    updateHintButton();

    const won = colors.every((c) => c === "correct");
    if (won) {
      finish("win");
      return;
    }
    if (state.guesses.length >= MAX_GUESSES) finish("lose");
  }

  function revealHint() {
    if (!state.playing) return;
    if (state.hinted.length >= maxHints()) {
      setStatus("ਇੱਕ ਅੱਖਰ ਖੁਦ ਲੱਭਣਾ ਪਵੇਗਾ");
      return;
    }
    const parts = answerParts();
    const open = [];
    for (let i = 0; i < state.length; i += 1) {
      if (!isHinted(i)) open.push(i);
    }
    if (!open.length) return;
    const unknown = open.filter((i) => state.current[i] !== parts[i]);
    const pool = unknown.length ? unknown : open;
    const index = pool[Math.floor(Math.random() * pool.length)];
    state.hinted.push(index);
    state.current[index] = parts[index];
    setStatus(`ਸੰਕੇਤ: ਥਾਂ ${index + 1} — ${parts[index]}`);
    updateHintButton();
    renderBoard();
  }

  function giveUp() {
    if (!state.playing) return;
    state.gaveUp = true;
    renderBoard();
    finish("gaveup");
  }

  function loadTotalScore() {
    const value = Number(localStorage.getItem(SCORE_KEY));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function saveTotalScore(value) {
    localStorage.setItem(SCORE_KEY, String(value));
  }

  function renderTotalScore() {
    const total = loadTotalScore();
    if (els.scoreLine) {
      els.scoreLine.textContent = `ਕੁੱਲ ਅੰਕ: ${total.toLocaleString("pa-Guru")}`;
    }
  }

  function roundScore(result) {
    if (result !== "win") return 0;
    const base = POINTS_PER_LETTER * state.length;
    const extraGuesses = Math.max(0, state.guesses.length - 1);
    const hints = state.hinted.length;
    return Math.max(
      0,
      base - PENALTY_PER_EXTRA_GUESS * extraGuesses - PENALTY_PER_HINT * hints
    );
  }

  function finish(result) {
    state.playing = false;
    setPlayActionsVisible(false);
    const titles = {
      win: "ਵਧਾਈਆਂ!",
      lose: "ਅਗਲੀ ਵਾਰੀ!",
      gaveup: "ਖੇਡ ਖਤਮ",
    };
    const earned = roundScore(result);
    let total = loadTotalScore();
    if (earned > 0) {
      total += earned;
      saveTotalScore(total);
    }
    renderTotalScore();

    els.endTitle.textContent = titles[result] || titles.lose;
    els.endAnswer.textContent = `ਸ਼ਬਦ ਸੀ: ${state.answer}`;
    const extraGuesses = Math.max(0, state.guesses.length - 1);
    const hints = state.hinted.length;
    const base = POINTS_PER_LETTER * state.length;
    const breakLine =
      result === "win"
        ? `ਅਧਾਰ ${base} · ਵਾਧੂ ਕੋਸ਼ਿਸ਼ −${PENALTY_PER_EXTRA_GUESS * extraGuesses} · ਸੰਕੇਤ −${PENALTY_PER_HINT * hints}`
        : "ਸ਼ਬਦ ਨਾ ਲੱਭਣ ਤੇ ਇਸ ਖੇਡ ਦੇ ਅੰਕ 0 ਰਹਿੰਦੇ ਹਨ";
    els.endScore.innerHTML =
      `<p class="round-score">ਇਸ ਖੇਡ: ${earned.toLocaleString("pa-Guru")}</p>` +
      `<p class="score-break">${breakLine}</p>` +
      `<p class="total-score">ਕੁੱਲ ਅੰਕ: ${total.toLocaleString("pa-Guru")}</p>`;
    els.end.classList.remove("hidden");
    if (state.syncSeed) state.syncIndex += 1;
  }

  function onKey(key) {
    if (!state.playing) return;
    if (key === "enter") {
      submitGuess();
      return;
    }
    if (key === "back") {
      const index = lastEditableIndex();
      if (index < 0) return;
      const chars = Array.from(state.current[index]);
      state.current[index] = chars.length > 1 ? chars.slice(0, -1).join("") : "";
      setStatus("");
      renderBoard();
      return;
    }

    const editIndex = lastEditableIndex();
    const cluster = editIndex >= 0 ? state.current[editIndex] : "";
    if (editIndex >= 0 && canAttach(cluster, key)) {
      state.current[editIndex] = attachToCluster(cluster, key);
      setStatus("");
      renderBoard();
      return;
    }

    if (isCombining(key)) {
      setStatus("ਪਹਿਲਾਂ ਵਿਅੰਜਨ ਚੁਣੋ, ਫਿਰ ਮਾਤਰਾ");
      return;
    }

    if (!isBase(key)) return;
    const empty = firstEmptyEditable();
    if (empty < 0) return;
    state.current[empty] = key;
    setStatus("");
    renderBoard();
  }

  function startGame(length) {
    const list = bankFor(length, "guesses");
    if (!list.length) {
      setStatus("ਇਸ ਲੰਬਾਈ ਲਈ ਸ਼ਬਦ ਨਹੀਂ ਮਿਲੇ");
      return;
    }
    state.length = Number(length);
    applySyncSettings(length);
    state.allowed = new Set(list);
    state.answer = pickAnswer(length);
    state.guesses = [];
    state.hinted = [];
    state.current = blankRow();
    state.keyColors = {};
    state.playing = true;
    state.gaveUp = false;
    state.modeLocked = true;
    els.setup.classList.add("hidden");
    els.end.classList.add("hidden");
    setPlayActionsVisible(true);
    const syncLabel = state.syncSeed
      ? `ਸਾਂਝੀ · ਕ੍ਰਮ ${state.syncIndex + 1}`
      : "";
    setStatus(
      [syncLabel, `${state.length} ਅੱਖਰ`, `${list.length.toLocaleString("pa-Guru")} ਸ਼ਬਦ`]
        .filter(Boolean)
        .join(" · ")
    );
    renderTotalScore();
    renderBoard();
    renderKeyboard();
  }

  function renderLengthChoices() {
    els.lengthGrid.innerHTML = "";
    LENGTHS.forEach((len) => {
      const count = bankFor(len, "guesses").length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "length-btn";
      btn.innerHTML = `<strong>${len}</strong><span>${count.toLocaleString("pa-Guru")} ਸ਼ਬਦ</span>`;
      btn.addEventListener("click", () => startGame(len));
      els.lengthGrid.appendChild(btn);
    });
  }

  function gameHasStarted() {
    return state.modeLocked || Boolean(state.answer);
  }

  function setupOptions(value) {
    if (!value || typeof value !== "object") return {};
    if ("startStep" in value) return value;
    if ("target" in value && "type" in value) return {};
    return value;
  }

  function goSetupStep(step) {
    const allowed = new Set(["mode", "seed", "length"]);
    if (state.modeLocked && step === "mode") step = "length";
    if (!allowed.has(step)) step = state.modeLocked ? "length" : "mode";
    state.setupStep = step;
    if (els.setup) els.setup.dataset.phase = step;
    ["mode", "seed", "length"].forEach((name) => {
      const el = document.getElementById(`step-${name}`);
      if (!el) return;
      const on = name === step;
      el.hidden = !on;
      el.classList.toggle("is-active", on);
    });
    const copy = {
      mode: {
        title: "ਖੇਡ ਚੁਣੋ",
        text: "ਪਹਿਲਾਂ ਚੁਣੋ: ਇਕੱਲੇ ਖੇਡਣਾ ਹੈ ਜਾਂ ਦੋਸਤਾਂ ਨਾਲ ਇੱਕੋ ਸ਼ਬਦ-ਕ੍ਰਮ ਤੇ।",
      },
      seed: {
        title: "ਸਾਂਝੀ ਕੁੰਜੀ",
        text: "ਇੱਕੋ ਲਿਖਤ ਸਾਰੇ ਖਿਡਾਰੀ ਲਿਖਣ। ਇਸ ਤੋਂ ਉਹੀ ਸ਼ਬਦ ਉਸੇ ਕ੍ਰਮ ਵਿੱਚ ਮਿਲਣਗੇ।",
      },
      length: {
        title: "ਸ਼ਬਦ ਦੀ ਲੰਬਾਈ ਚੁਣੋ",
        text:
          state.setupMode === "multi"
            ? "ਹੁਣ ਲੰਬਾਈ ਚੁਣੋ। ਸਾਰੇ ਖਿਡਾਰੀ ਇਹੀ ਲੰਬਾਈ ਰੱਖਣ।"
            : "ਹਰ ਟਾਈਲ ਇੱਕ ਪੂਰਾ ਅੱਖਰ ਹੈ (ਜਿਵੇਂ ਗ + ੁ = ਗੁ)। ਲੰਬਾਈ ਚੁਣ ਕੇ ਖੇਡ ਸ਼ੁਰੂ ਕਰੋ।",
      },
    };
    const page = copy[step] || copy.mode;
    els.setupTitle.textContent = page.title;
    els.setupCopy.textContent = page.text;
    const err = document.getElementById("sync-error");
    if (err) err.textContent = "";
    if (step === "seed") {
      const input = document.getElementById("sync-seed");
      if (input) input.focus();
    }
  }

  function showSetup(options) {
    const opts = setupOptions(options);
    state.wasPlaying = state.playing;
    state.setupFromEnd = !els.end.classList.contains("hidden");
    if (state.playing) {
      state.playing = false;
      setPlayActionsVisible(false);
    }
    els.end.classList.add("hidden");
    els.setup.classList.remove("hidden");
    document.getElementById("setup-close").hidden = !gameHasStarted();
    let startStep = opts.startStep || (state.modeLocked ? "length" : "mode");
    if (state.modeLocked && startStep === "mode") startStep = "length";
    const themeSection = document.getElementById("setup-themes-section");
    if (themeSection) themeSection.hidden = state.modeLocked || startStep === "length";
    renderLengthChoices();
    state.setupEntryStep = startStep;
    goSetupStep(startStep);
  }

  function showLengthSetup() {
    showSetup({ startStep: "length" });
  }

  function dismissSetup() {
    if (!gameHasStarted()) return;
    els.setup.classList.add("hidden");
    if (state.setupFromEnd) {
      els.end.classList.remove("hidden");
      return;
    }
    if (state.wasPlaying) {
      state.playing = true;
      setPlayActionsVisible(true);
    }
  }

  document.getElementById("help-btn").addEventListener("click", () => {
    els.help.classList.remove("hidden");
  });
  document.getElementById("help-close").addEventListener("click", () => {
    els.help.classList.add("hidden");
  });
  document.getElementById("setup-close").addEventListener("click", dismissSetup);
  els.setup.addEventListener("click", (event) => {
    if (event.target === els.setup) dismissSetup();
  });
  document.getElementById("length-btn").addEventListener("click", () => {
    if (state.modeLocked) showLengthSetup();
    else showSetup({ startStep: "mode" });
  });
  document.getElementById("mode-single").addEventListener("click", () => {
    state.setupMode = "single";
    goSetupStep("length");
  });
  document.getElementById("mode-multi").addEventListener("click", () => {
    state.setupMode = "multi";
    goSetupStep("seed");
  });
  document.getElementById("seed-back").addEventListener("click", () => goSetupStep("mode"));
  document.getElementById("length-back").addEventListener("click", () => {
    if (state.modeLocked || state.setupEntryStep === "length") {
      dismissSetup();
      return;
    }
    goSetupStep(state.setupMode === "multi" ? "seed" : "mode");
  });
  document.getElementById("seed-next").addEventListener("click", () => {
    const seed = readSyncSeed();
    const err = document.getElementById("sync-error");
    if (!seed) {
      if (err) err.textContent = "ਸਾਂਝੀ ਖੇਡ ਲਈ ਕੁੰਜੀ ਲਿਖੋ।";
      return;
    }
    if (err) err.textContent = "";
    goSetupStep("length");
  });
  document.getElementById("sync-seed").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("seed-next").click();
    }
  });
  document.getElementById("again-btn").addEventListener("click", () => startGame(state.length));
  document.getElementById("change-len-btn").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showLengthSetup();
  });
  document.getElementById("giveup-btn").addEventListener("click", giveUp);
  document.getElementById("hint-btn").addEventListener("click", revealHint);

  function currentThemeId() {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.some((theme) => theme.id === saved) ? saved : "purple";
  }

  function applyTheme(id) {
    const theme = THEMES.find((item) => item.id === id) || THEMES[0];
    document.documentElement.setAttribute("data-theme", theme.id);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.meta);
    localStorage.setItem(THEME_KEY, theme.id);
    renderThemeDots();
    if (state.playing || state.guesses.length) {
      renderBoard();
      renderKeyboard();
    }
  }

  function renderThemeDots() {
    const selected = currentThemeId();
    const fill = (host) => {
      if (!host) return;
      host.innerHTML = "";
      THEMES.forEach((theme) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "theme-dot" + (theme.id === selected ? " selected" : "");
        btn.style.background = theme.swatch;
        btn.title = theme.label;
        btn.setAttribute("aria-label", theme.label);
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          applyTheme(theme.id);
          document.getElementById("theme-menu").classList.add("hidden");
          document.getElementById("theme-btn").setAttribute("aria-expanded", "false");
        });
        host.appendChild(btn);
      });
    };
    fill(document.getElementById("setup-themes"));
    fill(document.getElementById("theme-menu"));
  }

  document.getElementById("theme-btn").addEventListener("click", (event) => {
    event.stopPropagation();
    const menu = document.getElementById("theme-menu");
    const open = menu.classList.toggle("hidden") === false;
    document.getElementById("theme-btn").setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", () => {
    document.getElementById("theme-menu").classList.add("hidden");
    document.getElementById("theme-btn").setAttribute("aria-expanded", "false");
  });

  els.help.addEventListener("click", (event) => {
    if (event.target === els.help) els.help.classList.add("hidden");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter") onKey("enter");
    else if (event.key === "Backspace") {
      event.preventDefault();
      onKey("back");
    }
  });

  window.addEventListener("resize", () => {
    if (state.playing || state.guesses.length) renderBoard();
  });

  applyTheme(currentThemeId());
  renderTotalScore();
  renderLengthChoices();
  showSetup();
})();

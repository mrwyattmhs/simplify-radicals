// ============================================================================
// Prime Pairs — radical simplification game
//
// Warmup + Basic are untimed practice. Advanced + Extreme are 90-second
// sprints: solve as many as you can, wrong pool picks cost 3 seconds.
// ============================================================================

const SPRINT_SECONDS = 90;
const WRONG_PICK_PENALTY = 3; // seconds, sprint placing phase only

// Paste your Apps Script Web App URL here to turn on the leaderboard.
// Leave it blank and the game runs exactly the same, just with no
// leaderboard button — nothing breaks, nothing calls out to the network.
const LEADERBOARD_URL = "";

// ----------------------------------------------------------------------------
// Difficulty configuration
//
//   sprint   true = 90-second sprint mode with score; false = untimed practice
//   pool     factors the student can click. Also the candidate set the
//            generator draws from, so the two can never drift apart.
//   bigPool  factors allowed as the base of a group of 3 or 4.
//   shapes   group sizes. [2,1] = one pair + one single. The first number is
//            replaced by the root degree, so [2,1] under a cube root is [3,1].
//   roots    which root degrees to draw from (repeat to weight).
//   varBias  chance (0-1) of forcing at least one variable into the problem.
//   maxNum   retry generation if the numeric part exceeds this.
// ----------------------------------------------------------------------------
const MODES = {
  warmup: {
    label: "Warmup",
    sprint: false,
    hasPool: false,
    pool: [2, 3, 5, 7],
    bigPool: [2, 3],
    shapes: [[2, 1], [2, 1], [2, 2]],
    roots: [2],
    varBias: 0,
    maxNum: 250,
    hint: "match two — pairs escape the radical and multiply into the coefficient.",
  },
  basic: {
    label: "Basic",
    sprint: false,
    hasPool: true,
    pool: [2, 3, 5, 7],
    bigPool: [2, 3],
    shapes: [[2, 1], [2, 2], [2, 1, 1]],
    roots: [2],
    varBias: 0,
    maxNum: 300,
    hint: "practice mode — build the radicand from the pool, then pair the primes out. no clock.",
  },
  advanced: {
    label: "Advanced",
    sprint: true,
    hasPool: true,
    pool: [2, 3, 5, 7, "x", "y"],
    bigPool: [2, 3, "x", "y"],
    shapes: [[2, 1], [2, 2], [2, 2, 1], [2, 1, 1]],
    roots: [2],
    varBias: 0.8,
    maxNum: 400,
    hint: "90-second sprint. wrong pool picks cost 3 seconds. variables factor like primes.",
  },
  extreme: {
    label: "Extreme",
    sprint: true,
    hasPool: true,
    pool: [2, 3, 5, 7, "x", "y"],
    bigPool: [2, 3, 5, 7, "x", "y"],
    shapes: [[2, 1], [2, 2], [2, 1, 1]],
    roots: [2, 3, 3, 4],
    varBias: 0.6,
    maxNum: 1000,
    hint: "90-second sprint with square, cube (∛), and 4th (∜) roots. group 2, 3, or 4 to match.",
  },
};

// ----------------------------------------------------------------------------
// Chip colors — each factor gets its own identity so matches read at a glance
// ----------------------------------------------------------------------------
const CHIP_STYLE = {
  2:  { bg: "#F0857A", text: "#4A160D", border: "#D25546" },
  3:  { bg: "#5FA995", text: "#183A2F", border: "#3D8570" },
  5:  { bg: "#E0B76A", text: "#5A3C08", border: "#B58A34" },
  7:  { bg: "#9578C4", text: "#291944", border: "#6E4FA0" },
  11: { bg: "#A6B073", text: "#333C1A", border: "#7F8C4B" },
  13: { bg: "#CC7267", text: "#4E140D", border: "#A64D42" },
  x:  { bg: "#E8DAB2", text: "#3A2F0F", border: "#B3A275" },
  y:  { bg: "#B8D0DC", text: "#1F3948", border: "#7A9AA9" },
  a:  { bg: "#DDBAC8", text: "#3E1B2A", border: "#A97992" },
  b:  { bg: "#B7C6A6", text: "#2A3618", border: "#7E9067" },
};

const ROOT_MARK = { 2: "√", 3: "∛", 4: "∜" };
const SUPS = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

// Modes with a leaderboard — derived from MODES so it can never drift out
// of sync with which modes are actually sprints.
const VALID_SPRINT_MODES = Object.keys(MODES).filter((m) => MODES[m].sprint);

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------
const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];
const isNumeric = (v) => typeof v === "number";
const isVar = (v) => typeof v === "string";
const getStyle = (v) => CHIP_STYLE[v] || CHIP_STYLE[2];
const sup = (n) => (n === 1 ? "" : String(n).split("").map((d) => SUPS[+d] || "").join(""));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

let idCounter = 0;
const uid = () => "c" + ++idCounter;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countFactors(factors) {
  const counts = {};
  factors.forEach((f) => (counts[f] = (counts[f] || 0) + 1));
  return counts;
}

// Split factors into what escapes the radical vs what stays inside
function factorize(factors, root) {
  const counts = countFactors(factors);
  const outside = {};
  const inside = {};
  Object.keys(counts).forEach((k) => {
    const n = counts[k];
    const out = Math.floor(n / root);
    const rem = n % root;
    if (out) outside[k] = out;
    if (rem) inside[k] = rem;
  });
  return { outside, inside };
}

// Turn a { base: power } map into a display string like "50x²"
function formatMap(map) {
  let num = 1;
  const vars = [];
  Object.keys(map).sort().forEach((k) => {
    if (/^\d+$/.test(k)) num *= Math.pow(+k, map[k]);
    else vars.push(k + sup(map[k]));
  });
  if (!vars.length) return String(num);
  return (num > 1 ? String(num) : "") + vars.join("");
}

const buildDisplay = (factors) => formatMap(countFactors(factors));

function numericValue(factors) {
  return factors.reduce((acc, f) => (isNumeric(f) ? acc * f : acc), 1);
}

// ----------------------------------------------------------------------------
// Problem generation
// ----------------------------------------------------------------------------
function generateProblem(mode, avoidDisplay) {
  const cfg = MODES[mode];

  for (let attempt = 0; attempt < 80; attempt++) {
    const root = pick(cfg.roots);
    const shape = pick(cfg.shapes).slice();
    shape[0] = root; // the escaping group always matches the root degree

    // A leftover exponent r under index n is only fully simplified when
    // gcd(r, n) === 1 — otherwise the "answer" would still reduce (∜9 = √3).
    if (shape.slice(1).some((g) => gcd(g, root) > 1)) continue;

    // Assign a distinct base to each group; groups of 3+ draw from bigPool
    const used = [];
    const bases = [];
    let ok = true;
    for (const size of shape) {
      const source = size >= 3 ? cfg.bigPool : cfg.pool;
      const available = source.filter((v) => !used.includes(v));
      if (!available.length) { ok = false; break; }
      const base = pick(available);
      used.push(base);
      bases.push(base);
    }
    if (!ok) continue;

    const factors = [];
    bases.forEach((base, i) => {
      for (let n = 0; n < shape[i]; n++) factors.push(base);
    });

    if (numericValue(factors) > cfg.maxNum) continue;

    const hasVar = factors.some(isVar);
    if (cfg.varBias > 0 && !hasVar && Math.random() < cfg.varBias) continue;

    const display = buildDisplay(factors);
    if (display === avoidDisplay) continue;

    return { display, factors: shuffle(factors), root };
  }

  return { display: "50", factors: [2, 5, 5], root: 2 };
}

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------
const state = {
  mode: "warmup",
  problem: null,
  phase: "pairing",        // placing | pairing | done
  placedChips: [],
  coefficient: { num: 1, vars: {} },
  selectedIds: [],
  pairingIds: [],
  wrongPoolValue: null,
  wrongPlacedId: null,
  pairsMade: 0,
  coefPulse: false,
  revealed: false,
  // practice stats
  solved: 0,
  streak: 0,
  best: 0,
  // sprint
  sprintActive: false,     // a sprint has been started and not abandoned
  sprintOver: false,       // the 90 seconds have elapsed
  sprintTime: 0,
  sprintScore: 0,
  sprintSubmitted: false,  // guards against double-submitting one sprint
  sprintBest: { advanced: 0, extreme: 0 }, // session bests
  // leaderboard
  leaderboardOpen: false,
  leaderboardLoading: false,
  leaderboardError: null,
  leaderboards: { advanced: null, extreme: null }, // null = not fetched yet
};

// Bumped on every new problem / mode switch so stale callbacks can bail out
let token = 0;

const cfg = () => MODES[state.mode];
const rootDeg = () => state.problem.root;
const rootSym = () => ROOT_MARK[rootDeg()] || "√";
const inSprint = () => cfg().sprint && state.sprintActive;

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------
function loadProblem(fresh) {
  token++;
  if (fresh) {
    state.problem = generateProblem(state.mode, state.problem && state.problem.display);
  }
  const p = state.problem;

  if (cfg().hasPool) {
    state.placedChips = [];
    state.phase = "placing";
  } else {
    state.placedChips = p.factors.map((v) => ({ id: uid(), value: v }));
    state.phase = "pairing";
  }

  state.coefficient = { num: 1, vars: {} };
  state.selectedIds = [];
  state.pairingIds = [];
  state.wrongPoolValue = null;
  state.wrongPlacedId = null;
  state.pairsMade = 0;
  state.coefPulse = false;
  state.revealed = false;

  render();
}

function switchMode(m) {
  if (m === state.mode) return;
  state.mode = m;
  state.streak = 0;
  state.sprintActive = false;
  state.sprintOver = false;
  token++;
  if (cfg().sprint) {
    // Sprint modes open on the start panel, not a live problem
    state.problem = generateProblem(m, null);
    state.placedChips = [];
    state.phase = "placing";
    state.selectedIds = [];
    state.pairingIds = [];
    state.coefficient = { num: 1, vars: {} };
    state.pairsMade = 0;
    render();
  } else {
    loadProblem(true);
  }
}

function startSprint() {
  state.sprintActive = true;
  state.sprintOver = false;
  state.sprintTime = SPRINT_SECONDS;
  state.sprintScore = 0;
  state.sprintSubmitted = false;
  loadProblem(true);
}

function endSprintEarly() {
  state.sprintActive = false;
  state.sprintOver = false;
  token++;
  render();
}

// Called from every place the clock can hit zero. Idempotent — only the
// first call actually submits, so it's safe to call from multiple spots.
function finishSprint() {
  if (state.sprintOver) return;
  state.sprintOver = true;
  if (!state.sprintSubmitted) {
    state.sprintSubmitted = true;
    submitScore(state.mode, state.sprintScore);
  }
}

// Sprint: skip the current problem (clock keeps running).
// Practice: reveal, then next.
function handlePrimaryAction() {
  if (inSprint()) {
    if (state.sprintOver) return; // no new problems after time
    loadProblem(true);
    return;
  }
  if (state.phase === "done") { loadProblem(true); return; }

  // Practice reveal — jump the board to the answer state
  token++;
  const { outside, inside } = factorize(state.problem.factors, rootDeg());
  const coef = { num: 1, vars: {} };
  Object.keys(outside).forEach((k) => {
    if (/^\d+$/.test(k)) coef.num *= Math.pow(+k, outside[k]);
    else coef.vars[k] = outside[k];
  });
  const chips = [];
  Object.keys(inside).forEach((k) => {
    const value = /^\d+$/.test(k) ? +k : k;
    for (let i = 0; i < inside[k]; i++) chips.push({ id: uid(), value });
  });
  state.coefficient = coef;
  state.placedChips = chips;
  state.selectedIds = [];
  state.pairingIds = [];
  state.phase = "done";
  state.revealed = true;
  state.streak = 0;
  render();
}

function handlePoolClick(value) {
  if (state.phase !== "placing" || state.pairingIds.length) return;
  if (cfg().sprint && !state.sprintActive) return;

  const needed = state.problem.factors.filter((f) => f === value).length;
  const placed = state.placedChips.filter((c) => c.value === value).length;

  if (placed < needed) {
    state.placedChips.push({ id: uid(), value });
    if (state.placedChips.length === state.problem.factors.length) {
      state.phase = "pairing";
    }
    render();
  } else {
    state.wrongPoolValue = value;
    if (inSprint() && !state.sprintOver) {
      state.sprintTime = Math.max(0, state.sprintTime - WRONG_PICK_PENALTY);
      if (state.sprintTime <= 0) finishSprint();
    }
    render();
    const myToken = token;
    setTimeout(() => {
      if (myToken !== token) return;
      state.wrongPoolValue = null;
      render();
    }, 400);
  }
}

function handlePlacedClick(id) {
  if (state.phase !== "pairing" || state.pairingIds.length) return;
  if (cfg().sprint && !state.sprintActive) return;

  const chip = state.placedChips.find((c) => c.id === id);
  if (!chip) return;

  if (state.selectedIds.includes(id)) {
    state.selectedIds = state.selectedIds.filter((i) => i !== id);
    return render();
  }
  if (!state.selectedIds.length) {
    state.selectedIds = [id];
    return render();
  }

  const first = state.placedChips.find((c) => c.id === state.selectedIds[0]);
  if (!first || first.value !== chip.value) {
    // Pairing-phase mistakes shake but cost nothing, in every mode
    state.wrongPlacedId = id;
    render();
    const myToken = token;
    setTimeout(() => {
      if (myToken !== token) return;
      state.wrongPlacedId = null;
      render();
    }, 400);
    return;
  }

  const selection = state.selectedIds.concat(id);
  if (selection.length < rootDeg()) {
    state.selectedIds = selection;
    return render();
  }

  // Full group — animate out, fold the value into the coefficient
  state.pairingIds = selection;
  state.selectedIds = [];
  render();

  const value = chip.value;
  const myToken = token;
  setTimeout(() => {
    if (myToken !== token) return;
    state.placedChips = state.placedChips.filter((c) => !selection.includes(c.id));
    if (isNumeric(value)) state.coefficient.num *= value;
    else state.coefficient.vars[value] = (state.coefficient.vars[value] || 0) + 1;
    state.pairsMade++;
    state.pairingIds = [];
    state.coefPulse = true;
    render();
    checkCompletion();
    setTimeout(() => {
      if (myToken !== token) return;
      state.coefPulse = false;
      render();
    }, 350);
  }, 600);
}

function checkCompletion() {
  if (state.phase !== "pairing" || !state.pairsMade) return;

  const counts = countFactors(state.placedChips.map((c) => c.value));
  const anyGroupLeft = Object.values(counts).some((n) => n >= rootDeg());
  if (state.placedChips.length && anyGroupLeft) return;

  state.phase = "done";

  if (inSprint()) {
    // Only counts if finished before the clock ran out
    if (!state.sprintOver) {
      state.sprintScore++;
      state.sprintBest[state.mode] = Math.max(state.sprintBest[state.mode], state.sprintScore);
      // Brief answer flash, then auto-advance to keep the sprint moving
      const myToken = token;
      setTimeout(() => {
        if (myToken !== token) return;
        if (state.sprintOver) { render(); return; }
        loadProblem(true);
      }, 900);
    }
    render();
    return;
  }

  // Practice bookkeeping
  state.solved++;
  const clean = !state.revealed;
  state.streak = clean ? state.streak + 1 : 0;
  state.best = Math.max(state.best, state.streak);
  render();
}

// ----------------------------------------------------------------------------
// Sprint clock — one interval for the whole app, gated by state
// ----------------------------------------------------------------------------
setInterval(() => {
  if (!inSprint() || state.sprintOver || state.sprintTime <= 0) return;
  state.sprintTime = Math.max(0, +(state.sprintTime - 0.1).toFixed(1));
  if (state.sprintTime <= 0) {
    finishSprint();
    render(); // full render: banner appears, actions change
  } else {
    updateTimer();
  }
}, 100);

// ----------------------------------------------------------------------------
// Leaderboard — talks to a Google Apps Script Web App (see leaderboard-script.gs)
//
// Everything here is best-effort. If LEADERBOARD_URL is blank, or the
// network call fails for any reason, the game keeps working exactly as if
// the leaderboard didn't exist — no thrown errors, no blocked UI.
// ----------------------------------------------------------------------------
const leaderboardConfigured = () => LEADERBOARD_URL.trim().length > 0;

function submitScore(mode, score) {
  if (!leaderboardConfigured()) return;
  if (!VALID_SPRINT_MODES.includes(mode)) return;
  if (!(score > 0)) return; // don't bother logging zeroes

  // text/plain avoids a CORS preflight that Apps Script doesn't handle well
  fetch(LEADERBOARD_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ mode, score }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data && Array.isArray(data.scores)) {
        state.leaderboards[mode] = data.scores;
        if (state.leaderboardOpen) render();
      }
    })
    .catch(() => {
      // Silent — a failed submission shouldn't interrupt the game.
      // The score still counted in-session; it just won't be on the board.
    });
}

function fetchLeaderboard(mode) {
  if (!leaderboardConfigured()) return;
  if (!VALID_SPRINT_MODES.includes(mode)) return;

  state.leaderboardLoading = true;
  state.leaderboardError = null;
  render();

  fetch(`${LEADERBOARD_URL}?mode=${mode}`)
    .then((r) => r.json())
    .then((data) => {
      state.leaderboardLoading = false;
      if (data && Array.isArray(data.scores)) {
        state.leaderboards[mode] = data.scores;
      } else {
        state.leaderboardError = "couldn't load scores";
      }
      render();
    })
    .catch(() => {
      state.leaderboardLoading = false;
      state.leaderboardError = "couldn't load scores";
      render();
    });
}

function toggleLeaderboard() {
  state.leaderboardOpen = !state.leaderboardOpen;
  if (state.leaderboardOpen && leaderboardConfigured()) {
    VALID_SPRINT_MODES.forEach((m) => {
      if (state.leaderboards[m] === null) fetchLeaderboard(m);
    });
  }
  render();
}

// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------
const SKELETON = `
  <div class="app">
    <button class="leaderboard-btn" id="leaderboard-btn" data-action="toggle-leaderboard" aria-label="leaderboard">🏆</button>
    <div class="app-header">
      <div class="title-block">
        <div class="app-title">Prime Pairs</div>
        <div class="app-sub">simplify radicals, one pair at a time</div>
      </div>
      <div class="level-badge" id="badge"></div>
    </div>
    <div class="tabs" id="tabs" role="tablist" aria-label="difficulty"></div>
    <div id="sprint-start-area"></div>
    <div id="game-area">
      <div class="prompt-row">
        <div class="prompt" id="prompt"></div>
        <div class="timer" id="timer"><span id="timer-value"></span><span class="timer-unit">s</span></div>
      </div>
      <div class="timer-bar-wrap" id="timer-bar-wrap"><div class="timer-bar" id="timer-bar"></div></div>
      <div class="stage">
        <div class="radical-row">
          <div class="coefficient" id="coefficient"></div>
          <div class="radical-mark" id="radical-mark"></div>
          <div class="radicand-box" id="radicand-box"></div>
        </div>
        <div id="feedback-area"></div>
        <div id="pool-area"></div>
        <div class="actions" id="actions"></div>
      </div>
    </div>
    <div class="instructions" id="instructions"></div>
    <div id="leaderboard-panel"></div>
  </div>
`;

function render() {
  const root = document.getElementById("root");
  if (!root.querySelector(".app")) root.innerHTML = SKELETON;

  const sprintIdle = cfg().sprint && !state.sprintActive;

  renderBadge();
  renderTabs();
  renderLeaderboardButton();
  renderLeaderboardPanel();
  document.getElementById("sprint-start-area").innerHTML = sprintIdle ? sprintStartPanel() : "";
  document.getElementById("game-area").style.display = sprintIdle ? "none" : "";

  if (!sprintIdle) {
    document.getElementById("prompt").innerHTML =
      `simplify<span class="target">${rootSym()}${state.problem.display}</span>`;
    renderTimerSection();
    renderRadical();
    renderFeedback();
    renderPool();
    renderActions();
  }

  document.getElementById("instructions").textContent = cfg().hint;
}

function sprintStartPanel() {
  const best = state.sprintBest[state.mode];
  return `
    <div class="sprint-start">
      <div class="sprint-start-title">${cfg().label} sprint</div>
      <div class="sprint-start-body">
        ${SPRINT_SECONDS} seconds on the clock. Solve as many as you can.<br>
        Wrong pool picks cost ${WRONG_PICK_PENALTY} seconds.
      </div>
      ${best ? `<div class="sprint-start-best">session best: ${best}</div>` : ""}
      <button class="btn primary big" data-action="start-sprint">start sprint</button>
    </div>`;
}

function renderBadge() {
  const badge = document.getElementById("badge");
  if (cfg().sprint) {
    if (state.sprintActive) {
      badge.textContent = `score ${state.sprintScore}`;
    } else {
      const best = state.sprintBest[state.mode];
      badge.textContent = best ? `best ${best}` : "sprint";
    }
  } else {
    const parts = [`solved ${state.solved}`];
    if (state.streak > 1) parts.push(`streak ${state.streak}`);
    else if (state.best > 1) parts.push(`best ${state.best}`);
    badge.textContent = parts.join(" · ");
  }
}

function renderTabs() {
  document.getElementById("tabs").innerHTML = Object.keys(MODES).map((m) => {
    const active = state.mode === m;
    return `<button role="tab" aria-selected="${active}" class="tab${active ? " active" : ""}"
      data-action="mode" data-value="${m}">${MODES[m].label}</button>`;
  }).join("");
}

function renderLeaderboardButton() {
  const btn = document.getElementById("leaderboard-btn");
  if (!btn) return;
  btn.classList.toggle("open", state.leaderboardOpen);
}

function renderLeaderboardPanel() {
  const panel = document.getElementById("leaderboard-panel");
  if (!panel) return;

  if (!state.leaderboardOpen) {
    panel.innerHTML = "";
    panel.className = "";
    return;
  }
  panel.className = "leaderboard-overlay";

  if (!leaderboardConfigured()) {
    panel.innerHTML = `
      <div class="leaderboard-card">
        <button class="leaderboard-close" data-action="toggle-leaderboard" aria-label="close">×</button>
        <div class="leaderboard-title">Leaderboard</div>
        <div class="leaderboard-empty">not connected yet — ask your teacher to finish setup</div>
      </div>`;
    return;
  }

  const section = (mode) => {
    const scores = state.leaderboards[mode];
    let body;
    if (state.leaderboardLoading && scores === null) {
      body = `<div class="leaderboard-empty">loading…</div>`;
    } else if (state.leaderboardError && scores === null) {
      body = `<div class="leaderboard-empty">${state.leaderboardError}</div>`;
    } else if (!scores || !scores.length) {
      body = `<div class="leaderboard-empty">no scores yet — be the first</div>`;
    } else {
      body = `<ol class="leaderboard-list">` +
        scores.map((s) => `<li>${s}</li>`).join("") +
        `</ol>`;
    }
    return `
      <div class="leaderboard-section">
        <div class="leaderboard-section-title">${MODES[mode].label}</div>
        ${body}
      </div>`;
  };

  panel.innerHTML = `
    <div class="leaderboard-card">
      <button class="leaderboard-close" data-action="toggle-leaderboard" aria-label="close">×</button>
      <div class="leaderboard-title">Leaderboard</div>
      <div class="leaderboard-sections">
        ${VALID_SPRINT_MODES.map(section).join("")}
      </div>
    </div>`;
}

function renderTimerSection() {
  const show = inSprint();
  document.getElementById("timer").style.display = show ? "" : "none";
  document.getElementById("timer-bar-wrap").style.display = show ? "" : "none";
  if (show) updateTimer();
}

function updateTimer() {
  const value = document.getElementById("timer-value");
  const bar = document.getElementById("timer-bar");
  const timer = document.getElementById("timer");
  if (!value || !bar || !timer) return;

  value.textContent = state.sprintTime.toFixed(1);
  bar.style.width = `${(state.sprintTime / SPRINT_SECONDS) * 100}%`;
  const warn = state.sprintTime <= 10;
  timer.classList.toggle("warn", warn);
  bar.classList.toggle("warn", warn);
}

function renderRadical() {
  const coefEl = document.getElementById("coefficient");
  const markEl = document.getElementById("radical-mark");
  const boxEl = document.getElementById("radicand-box");

  const showRadical = state.phase === "placing" || state.placedChips.length > 0;
  const coefStr = formatMap(coefMap()) || (!showRadical ? "1" : "");

  coefEl.textContent = showRadical && coefStr === "1" ? "" : coefStr;
  coefEl.className = `coefficient${state.coefPulse ? " pulse" : ""}${showRadical ? "" : " solo"}`;

  markEl.style.display = showRadical ? "" : "none";
  boxEl.style.display = showRadical ? "" : "none";
  if (!showRadical) return;

  markEl.textContent = rootSym();
  boxEl.className = `radicand-box${state.phase === "placing" ? " placing" : ""}`;
  reconcileChips(boxEl);
}

function coefMap() {
  const map = {};
  if (state.coefficient.num > 1) map[state.coefficient.num] = 1;
  Object.keys(state.coefficient.vars).forEach((v) => {
    if (state.coefficient.vars[v] > 0) map[v] = state.coefficient.vars[v];
  });
  return map;
}

// Update chip nodes in place rather than rebuilding — preserves CSS animations
function reconcileChips(container) {
  const existing = {};
  Array.from(container.children).forEach((el) => {
    if (el.dataset && el.dataset.id) existing[el.dataset.id] = el;
  });

  const seen = new Set();
  state.placedChips.forEach((chip) => {
    seen.add(chip.id);
    let el = existing[chip.id];
    if (!el) {
      el = document.createElement("button");
      el.className = "chip placed";
      el.dataset.action = "chip";
      el.dataset.id = chip.id;
      const s = getStyle(chip.value);
      el.style.backgroundColor = s.bg;
      el.style.color = s.text;
      el.style.borderColor = s.border;
      el.textContent = chip.value;
      el.setAttribute("aria-label", `factor ${chip.value}`);
      container.appendChild(el);
    }
    el.classList.toggle("selected", state.selectedIds.includes(chip.id));
    el.classList.toggle("wrong", state.wrongPlacedId === chip.id);
    el.classList.toggle("pairing", state.pairingIds.includes(chip.id));
    el.disabled = state.phase !== "pairing";
  });

  Object.keys(existing).forEach((id) => { if (!seen.has(id)) existing[id].remove(); });

  const placeholder = container.querySelector(".radicand-empty");
  if (!state.placedChips.length && state.phase === "placing") {
    if (!placeholder) {
      const el = document.createElement("span");
      el.className = "radicand-empty";
      el.textContent = "place primes below";
      container.appendChild(el);
    }
  } else if (placeholder) {
    placeholder.remove();
  }
}

function renderFeedback() {
  const area = document.getElementById("feedback-area");
  const rd = rootDeg();
  const sym = rootSym();

  // Sprint time's-up banner takes priority
  if (inSprint() && state.sprintOver) {
    const finishNote = state.phase !== "done"
      ? `<span class="bonus">you can finish this one, but it won't count</span>`
      : "";
    area.innerHTML =
      `<div class="answer revealed">time! final score: ${state.sprintScore}${finishNote}</div>`;
    return;
  }

  if (state.phase !== "done") {
    let text;
    if (state.phase === "placing") {
      text = `tap primes from the pool to build ${sym}${state.problem.display}`;
    } else if (!state.selectedIds.length) {
      text = rd === 2 ? "tap two matching factors"
                      : `tap ${rd} matching factors to group them`;
    } else {
      text = `${state.selectedIds.length} of ${rd} — pick ${rd - state.selectedIds.length} more matching`;
    }
    area.innerHTML = `<div class="feedback">${text}</div>`;
    return;
  }

  const { outside, inside } = factorize(state.problem.factors, rd);
  const coefStr = formatMap(outside);
  const radStr = Object.keys(inside).length ? formatMap(inside) : "";
  const answer = radStr ? `${coefStr === "1" ? "" : coefStr}${sym}${radStr}` : coefStr;

  let bonus = "";
  if (state.revealed) bonus = "answer shown";
  else if (inSprint()) bonus = "+1";

  area.innerHTML =
    `<div class="answer${state.revealed ? " revealed" : ""}">` +
    `${sym}${state.problem.display}<span class="eq">=</span>${answer}` +
    (bonus ? `<span class="bonus">${bonus}</span>` : "") +
    `</div>`;
}

function renderPool() {
  const area = document.getElementById("pool-area");
  if (!cfg().hasPool || state.phase !== "placing") {
    area.innerHTML = "";
    return;
  }
  const chips = cfg().pool.map((v) => {
    const s = getStyle(v);
    return `<button class="chip${state.wrongPoolValue === v ? " wrong" : ""}"
      data-action="pool" data-value="${v}"
      style="background-color:${s.bg};color:${s.text};border-color:${s.border}"
      aria-label="pool ${v}">${v}</button>`;
  }).join("");
  area.innerHTML = `<div class="pool"><div class="pool-label">pool</div>
    <div class="pool-chips">${chips}</div></div>`;
}

function renderActions() {
  const el = document.getElementById("actions");

  if (inSprint()) {
    if (state.sprintOver) {
      el.innerHTML = `<button class="btn primary" data-action="start-sprint">new sprint</button>` +
                     `<button class="btn" data-action="end-sprint">exit</button>`;
    } else {
      el.innerHTML = `<button class="btn" data-action="skip">skip →</button>`;
    }
    return;
  }

  el.innerHTML =
    `<button class="btn" data-action="reset">reset</button>` +
    `<button class="btn primary" data-action="next">${state.phase === "done" ? "next →" : "reveal →"}</button>`;
}

// ----------------------------------------------------------------------------
// Events — one delegated listener for the whole app
// ----------------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, value, id } = el.dataset;

  if (action === "mode") switchMode(value);
  else if (action === "pool") handlePoolClick(/^\d+$/.test(value) ? +value : value);
  else if (action === "chip") handlePlacedClick(id);
  else if (action === "reset") loadProblem(false);
  else if (action === "next") handlePrimaryAction();
  else if (action === "skip") handlePrimaryAction();
  else if (action === "start-sprint") startSprint();
  else if (action === "end-sprint") endSprintEarly();
  else if (action === "toggle-leaderboard") toggleLeaderboard();
});

// ----------------------------------------------------------------------------
// Init
// ----------------------------------------------------------------------------
state.problem = generateProblem(state.mode, null);
loadProblem(false);

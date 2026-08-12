// ============================================================================
// Prime Pairs — radical simplification game
//
// Problems are generated randomly. See MODES below to tune each difficulty.
// ============================================================================

// ----------------------------------------------------------------------------
// Difficulty configuration
//
//   pool     factors the student can click. Also the candidate set the
//            generator draws from, so the two can never drift apart.
//   bigPool  factors allowed as the base of a group of 3 or 4 (keeps a
//            4th-root problem from generating something like 5⁴ = 625).
//   shapes   group sizes. [2,1] = one pair + one single (3 chips).
//            [2,2] = two pairs (4 chips). The first number is replaced by
//            the root degree, so [2,1] under a cube root becomes [3,1].
//   roots    which root degrees to draw from.
//   varBias  chance (0-1) of forcing at least one variable into the problem.
//   maxNum   retry generation if the numeric part exceeds this.
// ----------------------------------------------------------------------------
const MODES = {
  warmup: {
    label: "Warmup",
    hasTimer: false,
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
    hasTimer: true,
    hasPool: true,
    pool: [2, 3, 5, 7],
    bigPool: [2, 3],
    shapes: [[2, 1], [2, 2], [2, 1, 1]],
    roots: [2],
    varBias: 0,
    maxNum: 300,
    hint: "build the radicand from the pool, then pair the primes out. wrong picks cost a second.",
  },
  advanced: {
    label: "Advanced",
    hasTimer: true,
    hasPool: true,
    pool: [2, 3, 5, 7, "x", "y"],
    bigPool: [2, 3, "x", "y"],
    shapes: [[2, 1], [2, 2], [2, 2, 1]],
    roots: [2],
    varBias: 0.8,
    maxNum: 200,
    hint: "variables factor like primes. x² is two x's. pair them just the same.",
  },
  extreme: {
    label: "Extreme",
    hasTimer: true,
    hasPool: true,
    pool: [2, 3, 5, 7, "x", "y"],
    bigPool: [2, 3, "x", "y"],
    shapes: [[2, 1], [2, 2], [2, 1, 1]],
    roots: [3, 3, 4],
    varBias: 0.6,
    maxNum: 250,
    hint: "cube root (∛) groups three matching. fourth root (∜) groups four.",
  },
};

// Seconds on the clock, scaled by how many chips the problem has.
// Return a flat 10 here if you'd rather every problem get the same time.
function timeLimitFor(chipCount) {
  return Math.max(10, Math.round(4 + chipCount * 2));
}

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

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------
const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];
const isNumeric = (v) => typeof v === "number";
const isVar = (v) => typeof v === "string";
const getStyle = (v) => CHIP_STYLE[v] || CHIP_STYLE[2];
const sup = (n) => (n === 1 ? "" : String(n).split("").map((d) => SUPS[+d] || "").join(""));

let idCounter = 0;
const uid = () => "c" + ++idCounter;

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Group a flat factor list into { "2": 3, "x": 2 } counts
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

// The radicand as the student sees it, e.g. "50x²"
const buildDisplay = (factors) => formatMap(countFactors(factors));

// Numeric part only — used to keep generated numbers from blowing up
function numericValue(factors) {
  return factors.reduce((acc, f) => (isNumeric(f) ? acc * f : acc), 1);
}

// ----------------------------------------------------------------------------
// Problem generation
// ----------------------------------------------------------------------------
function generateProblem(mode, avoidDisplay) {
  const cfg = MODES[mode];

  for (let attempt = 0; attempt < 60; attempt++) {
    const root = pick(cfg.roots);
    const shape = pick(cfg.shapes).slice();
    shape[0] = root; // the leading group always matches the root degree

    // A leftover exponent r under index n is only fully simplified when
    // gcd(r, n) === 1. Without this, a 4th root with a leftover square would
    // produce something like ∜9, which still reduces to √3.
    if (shape.slice(1).some((g) => gcd(g, root) > 1)) continue;

    // Assign a distinct base to each group. Groups of 3+ draw from bigPool
    // so we don't end up with something like 5⁴.
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

    // Build the flat factor list
    const factors = [];
    bases.forEach((base, i) => {
      for (let n = 0; n < shape[i]; n++) factors.push(base);
    });

    // Constraint: numeric part stays readable
    if (numericValue(factors) > cfg.maxNum) continue;

    // Constraint: honor the variable bias
    const hasVar = factors.some(isVar);
    if (cfg.varBias > 0 && !hasVar && Math.random() < cfg.varBias) continue;

    const display = buildDisplay(factors);

    // Constraint: don't repeat the problem we just showed
    if (display === avoidDisplay) continue;

    return { display, factors: shuffle(factors), root };
  }

  // Fallback if constraints were somehow unsatisfiable
  return { display: "50", factors: [2, 5, 5], root: 2 };
}

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------
const state = {
  mode: "warmup",
  problem: null,
  phase: "pairing",       // placing | pairing | done
  placedChips: [],
  coefficient: { num: 1, vars: {} },
  selectedIds: [],
  pairingIds: [],
  wrongPoolValue: null,
  wrongPlacedId: null,
  pairsMade: 0,
  coefPulse: false,
  timeLeft: 0,
  timeLimit: 0,
  revealed: false,
  solved: 0,
  streak: 0,
  best: 0,
};

// Bumped on every new problem so stale animation callbacks can bail out
let token = 0;

const cfg = () => MODES[state.mode];
const rootDeg = () => state.problem.root;
const rootSym = () => ROOT_MARK[rootDeg()] || "√";

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------
function loadProblem(newProblem) {
  token++;
  if (newProblem) {
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
  state.timeLimit = timeLimitFor(p.factors.length);
  state.timeLeft = state.timeLimit;

  render();
}

function switchMode(m) {
  if (m === state.mode) return;
  state.mode = m;
  state.streak = 0;
  loadProblem(true);
}

function handleNextOrReveal() {
  if (state.phase === "done") { loadProblem(true); return; }

  token++; // cancel any in-flight pair animation
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
    if (cfg().hasTimer) state.timeLeft = Math.max(0, state.timeLeft - 1);
    render();
    setTimeout(() => { state.wrongPoolValue = null; render(); }, 400);
  }
}

function handlePlacedClick(id) {
  if (state.phase !== "pairing" || state.pairingIds.length) return;

  const chip = state.placedChips.find((c) => c.id === id);
  if (!chip) return;

  // Tapping a selected chip deselects it — free, no penalty
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
    state.wrongPlacedId = id;
    if (cfg().hasTimer) state.timeLeft = Math.max(0, state.timeLeft - 1);
    render();
    setTimeout(() => { state.wrongPlacedId = null; render(); }, 400);
    return;
  }

  const selection = state.selectedIds.concat(id);
  if (selection.length < rootDeg()) {
    state.selectedIds = selection;
    return render();
  }

  // Full group — animate it out, then fold the value into the coefficient
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
  state.solved++;
  const clean = !state.revealed && (!cfg().hasTimer || state.timeLeft > 0);
  state.streak = clean ? state.streak + 1 : 0;
  state.best = Math.max(state.best, state.streak);
  render();
}

// ----------------------------------------------------------------------------
// Timer — one interval for the whole app, gated by state
// ----------------------------------------------------------------------------
setInterval(() => {
  if (!cfg().hasTimer || state.phase === "done" || state.timeLeft <= 0) return;
  state.timeLeft = Math.max(0, +(state.timeLeft - 0.1).toFixed(1));
  updateTimer();
}, 100);

// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------
const SKELETON = `
  <div class="app">
    <div class="app-header">
      <div class="title-block">
        <div class="app-title">Prime Pairs</div>
        <div class="app-sub">simplify radicals, one pair at a time</div>
      </div>
      <div class="level-badge" id="badge"></div>
    </div>
    <div class="tabs" id="tabs" role="tablist" aria-label="difficulty"></div>
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
    <div class="instructions" id="instructions"></div>
  </div>
`;

function render() {
  const root = document.getElementById("root");
  if (!root.querySelector(".app")) root.innerHTML = SKELETON;

  renderBadge();
  renderTabs();
  document.getElementById("prompt").innerHTML =
    `simplify<span class="target">${rootSym()}${state.problem.display}</span>`;
  renderTimerSection();
  renderRadical();
  renderFeedback();
  renderPool();
  renderActions();
  document.getElementById("instructions").textContent = cfg().hint;
}

function renderBadge() {
  const parts = [`solved ${state.solved}`];
  if (state.streak > 1) parts.push(`streak ${state.streak}`);
  else if (state.best > 1) parts.push(`best ${state.best}`);
  document.getElementById("badge").textContent = parts.join(" · ");
}

function renderTabs() {
  document.getElementById("tabs").innerHTML = Object.keys(MODES).map((m) => {
    const active = state.mode === m;
    return `<button role="tab" aria-selected="${active}" class="tab${active ? " active" : ""}"
      data-action="mode" data-value="${m}">${MODES[m].label}</button>`;
  }).join("");
}

function renderTimerSection() {
  const show = cfg().hasTimer;
  document.getElementById("timer").style.display = show ? "" : "none";
  document.getElementById("timer-bar-wrap").style.display = show ? "" : "none";
  if (show) updateTimer();
}

function updateTimer() {
  const value = document.getElementById("timer-value");
  const bar = document.getElementById("timer-bar");
  const timer = document.getElementById("timer");
  if (!value || !bar || !timer) return;

  value.textContent = state.timeLeft.toFixed(1);
  bar.style.width = `${(state.timeLeft / state.timeLimit) * 100}%`;
  const warn = state.timeLeft <= 3;
  timer.classList.toggle("warn", warn);
  bar.classList.toggle("warn", warn);
}

function renderRadical() {
  const coefEl = document.getElementById("coefficient");
  const markEl = document.getElementById("radical-mark");
  const boxEl = document.getElementById("radicand-box");

  const showRadical = state.phase === "placing" || state.placedChips.length > 0;
  const coefStr = formatMap(coefVarsAsMap()) || (!showRadical ? "1" : "");

  coefEl.textContent = showRadical && coefStr === "1" ? "" : coefStr;
  coefEl.className = `coefficient${state.coefPulse ? " pulse" : ""}${showRadical ? "" : " solo"}`;

  markEl.style.display = showRadical ? "" : "none";
  boxEl.style.display = showRadical ? "" : "none";
  if (!showRadical) return;

  markEl.textContent = rootSym();
  boxEl.className = `radicand-box${state.phase === "placing" ? " placing" : ""}`;
  reconcileChips(boxEl);
}

// Present the live coefficient in the same { base: power } shape formatMap wants
function coefVarsAsMap() {
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
  if (state.revealed) bonus = "answer shown — reset to try again";
  else if (cfg().hasTimer && state.timeLeft > 0) bonus = `nice — ${state.timeLeft.toFixed(1)}s to spare`;
  else if (cfg().hasTimer) bonus = "solved with no time to spare";

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
  document.getElementById("actions").innerHTML =
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
  else if (action === "next") handleNextOrReveal();
});

// ----------------------------------------------------------------------------
// Init
// ----------------------------------------------------------------------------
loadProblem(true);

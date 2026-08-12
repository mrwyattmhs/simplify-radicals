// ============================================================================
// Problem sets — one array per difficulty
// ============================================================================
const WARMUP = [
  { display: "8",   factors: [2, 2, 2] },
  { display: "12",  factors: [2, 2, 3] },
  { display: "18",  factors: [2, 3, 3] },
  { display: "50",  factors: [2, 5, 5] },
  { display: "72",  factors: [2, 2, 2, 3, 3] },
];

const BASIC = [
  { display: "50",  factors: [2, 5, 5] },
  { display: "45",  factors: [3, 3, 5] },
  { display: "75",  factors: [3, 5, 5] },
  { display: "98",  factors: [2, 7, 7] },
  { display: "147", factors: [3, 7, 7] },
  { display: "36",  factors: [2, 2, 3, 3] },
  { display: "100", factors: [2, 2, 5, 5] },
  { display: "225", factors: [3, 3, 5, 5] },
];

const ADVANCED = [
  { display: "4x²",     factors: [2, 2, "x", "x"] },
  { display: "9y²",     factors: [3, 3, "y", "y"] },
  { display: "25x²",    factors: [5, 5, "x", "x"] },
  { display: "20x²",    factors: [2, 2, 5, "x", "x"] },
  { display: "50x²",    factors: [2, 5, 5, "x", "x"] },
  { display: "45y²",    factors: [3, 3, 5, "y", "y"] },
  { display: "18x²y²",  factors: [2, 3, 3, "x", "x", "y", "y"] },
  { display: "72x²",    factors: [2, 2, 2, 3, 3, "x", "x"] },
];

const EXTREME = [
  { display: "8",       root: 3, factors: [2, 2, 2] },
  { display: "27",      root: 3, factors: [3, 3, 3] },
  { display: "54",      root: 3, factors: [2, 3, 3, 3] },
  { display: "8x³",     root: 3, factors: [2, 2, 2, "x", "x", "x"] },
  { display: "24x³",    root: 3, factors: [2, 2, 2, 3, "x", "x", "x"] },
  { display: "16",      root: 4, factors: [2, 2, 2, 2] },
  { display: "48y⁴",    root: 4, factors: [2, 2, 2, 2, 3, "y", "y", "y", "y"] },
  { display: "81x⁴y⁴",  root: 4, factors: [3, 3, 3, 3, "x", "x", "x", "x", "y", "y", "y", "y"] },
];

const MODES = {
  warmup: {
    label: "Warmup",
    problems: WARMUP,
    hasTimer: false,
    hasPool: false,
    pool: [],
    hint: "match two — pairs escape the radical and multiply into the coefficient.",
  },
  basic: {
    label: "Basic",
    problems: BASIC,
    hasTimer: true,
    hasPool: true,
    pool: [2, 3, 5, 7],
    hint: "break the radicand into primes first, then pair them out. wrong picks cost a second.",
  },
  advanced: {
    label: "Advanced",
    problems: ADVANCED,
    hasTimer: true,
    hasPool: true,
    pool: [2, 3, 5, 7, "x", "y"],
    hint: "variables factor like primes. x² is two x's. pair them just the same.",
  },
  extreme: {
    label: "Extreme",
    problems: EXTREME,
    hasTimer: true,
    hasPool: true,
    pool: [2, 3, 5, 7, "x", "y"],
    hint: "cube root (∛) groups three matching. fourth root (∜) groups four.",
  },
};

// ============================================================================
// Chip color palette
// ============================================================================
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

// ============================================================================
// Helpers
// ============================================================================
const ROOT_MARK = { 2: "√", 3: "∛", 4: "∜" };
const SUPS = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function sup(n) {
  if (n === 1) return "";
  return String(n).split("").map(d => SUPS[+d] || "").join("");
}

function isNumeric(v) { return typeof v === "number"; }
function getStyle(v) { return CHIP_STYLE[v] || CHIP_STYLE[2]; }

let idCounter = 0;
function uid() { return "c" + (++idCounter); }

function factorize(factors, root) {
  const counts = {};
  factors.forEach(f => counts[f] = (counts[f] || 0) + 1);
  const outside = {};
  const inside = {};
  Object.keys(counts).forEach(k => {
    const key = /^\d+$/.test(k) ? +k : k;
    const n = counts[k];
    const out = Math.floor(n / root);
    const rem = n % root;
    if (out) outside[key] = out;
    if (rem) inside[key] = rem;
  });
  return { outside, inside };
}

function formatFactored(map) {
  let num = 1;
  const varParts = [];
  Object.keys(map).sort().forEach(k => {
    const p = map[k];
    if (/^\d+$/.test(k)) num *= Math.pow(+k, p);
    else varParts.push(k + sup(p));
  });
  return { num, varString: varParts.join("") };
}

function formatCoef(coef) {
  const varParts = [];
  Object.keys(coef.vars).sort().forEach(v => {
    if (coef.vars[v] > 0) varParts.push(v + sup(coef.vars[v]));
  });
  let s = "";
  if (coef.num > 1) s = String(coef.num);
  s += varParts.join("");
  return s;
}

// Jump directly to the final simplified state (used by the reveal button)
function computeFinal(problem, rootDeg) {
  const { outside, inside } = factorize(problem.factors, rootDeg);
  const coef = { num: 1, vars: {} };
  Object.keys(outside).forEach(k => {
    if (/^\d+$/.test(k)) coef.num *= Math.pow(+k, outside[k]);
    else coef.vars[k] = (coef.vars[k] || 0) + outside[k];
  });
  const chips = [];
  Object.keys(inside).forEach(k => {
    const key = /^\d+$/.test(k) ? +k : k;
    for (let i = 0; i < inside[k]; i++) chips.push({ id: uid(), value: key });
  });
  return { coef, chips };
}

// ============================================================================
// State
// ============================================================================
const state = {
  mode: "warmup",
  levelIdx: 0,
  phase: "pairing", // placing | pairing | done
  placedChips: [],
  coefficient: { num: 1, vars: {} },
  selectedIds: [],
  pairingIds: [],
  wrongPoolValue: null,
  wrongPlacedId: null,
  pairsMade: 0,
  coefPulse: false,
  timeLeft: 10,
  revealed: false,
};

// Increments on every level reset — used to invalidate stale setTimeout callbacks
let levelToken = 0;

// Accessors that read state derivatives
function config()      { return MODES[state.mode]; }
function problem()     { return config().problems[state.levelIdx] || config().problems[0]; }
function rootDeg()     { return state.mode === "extreme" ? (problem().root || 2) : 2; }
function rootSym()     { return ROOT_MARK[rootDeg()] || "√"; }

// ============================================================================
// Actions
// ============================================================================
function resetLevel() {
  levelToken++;
  const p = problem();
  if (state.mode === "warmup") {
    state.placedChips = p.factors.map(v => ({ id: uid(), value: v }));
    state.phase = "pairing";
  } else {
    state.placedChips = [];
    state.phase = "placing";
  }
  state.coefficient = { num: 1, vars: {} };
  state.selectedIds = [];
  state.pairingIds = [];
  state.wrongPoolValue = null;
  state.wrongPlacedId = null;
  state.pairsMade = 0;
  state.coefPulse = false;
  state.timeLeft = 10;
  state.revealed = false;
  render();
}

function switchMode(m) {
  if (m === state.mode) return;
  state.mode = m;
  state.levelIdx = 0;
  resetLevel();
}

function goNext() {
  const total = config().problems.length;
  state.levelIdx = (state.levelIdx + 1) % total;
  resetLevel();
}

function restart() { resetLevel(); }

function handleNextOrReveal() {
  if (state.phase === "done") { goNext(); return; }
  levelToken++; // invalidate any pending pair-out setTimeouts
  const { coef, chips } = computeFinal(problem(), rootDeg());
  state.coefficient = coef;
  state.placedChips = chips;
  state.selectedIds = [];
  state.pairingIds = [];
  state.phase = "done";
  state.revealed = true;
  render();
}

function handlePoolClick(value) {
  if (state.phase !== "placing") return;
  if (state.pairingIds.length > 0) return;
  const p = problem();
  const required = p.factors.filter(f => f === value).length;
  const placed = state.placedChips.filter(c => c.value === value).length;
  if (placed < required) {
    state.placedChips.push({ id: uid(), value });
    if (state.placedChips.length === p.factors.length) {
      state.phase = "pairing";
    }
    render();
  } else {
    state.wrongPoolValue = value;
    if (config().hasTimer) state.timeLeft = Math.max(0, state.timeLeft - 1);
    render();
    setTimeout(() => {
      state.wrongPoolValue = null;
      render();
    }, 400);
  }
}

function handlePlacedClick(id) {
  if (state.phase !== "pairing") return;
  if (state.pairingIds.length > 0) return;
  const chip = state.placedChips.find(c => c.id === id);
  if (!chip) return;

  if (state.selectedIds.includes(id)) {
    state.selectedIds = state.selectedIds.filter(i => i !== id);
    render();
    return;
  }
  if (state.selectedIds.length === 0) {
    state.selectedIds = [id];
    render();
    return;
  }
  const first = state.placedChips.find(c => c.id === state.selectedIds[0]);
  if (!first || first.value !== chip.value) {
    state.wrongPlacedId = id;
    if (config().hasTimer) state.timeLeft = Math.max(0, state.timeLeft - 1);
    render();
    setTimeout(() => {
      state.wrongPlacedId = null;
      render();
    }, 400);
    return;
  }

  const newSelection = state.selectedIds.concat(id);
  const rd = rootDeg();
  if (newSelection.length === rd) {
    state.pairingIds = newSelection;
    state.selectedIds = [];
    render();
    const val = chip.value;
    const myToken = levelToken;
    setTimeout(() => {
      if (myToken !== levelToken) return; // Level was reset — abort
      state.placedChips = state.placedChips.filter(c => !newSelection.includes(c.id));
      if (isNumeric(val)) state.coefficient.num *= val;
      else state.coefficient.vars[val] = (state.coefficient.vars[val] || 0) + 1;
      state.pairsMade++;
      state.pairingIds = [];
      state.coefPulse = true;
      render();
      checkCompletion();
      setTimeout(() => {
        if (myToken !== levelToken) return;
        state.coefPulse = false;
        render();
      }, 350);
    }, 600);
  } else {
    state.selectedIds = newSelection;
    render();
  }
}

function checkCompletion() {
  if (state.phase !== "pairing") return;
  const rd = rootDeg();
  if (state.placedChips.length === 0) {
    if (state.pairsMade > 0) {
      state.phase = "done";
      render();
    }
    return;
  }
  const counts = {};
  state.placedChips.forEach(c => counts[c.value] = (counts[c.value] || 0) + 1);
  const anyGroup = Object.values(counts).some(c => c >= rd);
  if (!anyGroup) {
    state.phase = "done";
    render();
  }
}

// ============================================================================
// Timer — one global interval, gated by state
// ============================================================================
setInterval(() => {
  if (!config().hasTimer) return;
  if (state.phase === "done") return;
  if (state.timeLeft <= 0) return;
  state.timeLeft = Math.max(0, +(state.timeLeft - 0.1).toFixed(1));
  updateTimerDisplay();
}, 100);

// ============================================================================
// Rendering
// ============================================================================
function render() {
  const root = document.getElementById("root");

  // On first call, build the skeleton once
  if (!root.querySelector(".app")) {
    root.innerHTML = `
      <div class="app">
        <div class="app-header">
          <div class="title-block">
            <div class="app-title">Prime Pairs</div>
            <div class="app-sub">simplify radicals, one pair at a time</div>
          </div>
          <div class="level-badge" id="level-badge"></div>
        </div>
        <div class="tabs" id="tabs" role="tablist" aria-label="difficulty"></div>
        <div class="prompt-row">
          <div class="prompt" id="prompt"></div>
          <div class="timer" id="timer">
            <span id="timer-value"></span><span class="timer-unit">s</span>
          </div>
        </div>
        <div class="timer-bar-wrap" id="timer-bar-wrap">
          <div class="timer-bar" id="timer-bar"></div>
        </div>
        <div class="stage">
          <div class="radical-row" id="radical-row">
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
  }

  renderHeader();
  renderTabs();
  renderPrompt();
  renderTimerSection();
  renderRadicalRow();
  renderFeedback();
  renderPool();
  renderButtons();
  renderInstructions();
}

function renderHeader() {
  document.getElementById("level-badge").textContent =
    `${state.levelIdx + 1} / ${config().problems.length}`;
}

function renderTabs() {
  const html = Object.keys(MODES).map(m => {
    const active = state.mode === m;
    return `<button role="tab" aria-selected="${active}" ` +
           `class="tab${active ? " active" : ""}" ` +
           `data-action="switch-mode" data-value="${m}">${MODES[m].label}</button>`;
  }).join("");
  document.getElementById("tabs").innerHTML = html;
}

function renderPrompt() {
  document.getElementById("prompt").innerHTML =
    `simplify<span class="target">${rootSym()}${problem().display}</span>`;
}

function renderTimerSection() {
  const timer = document.getElementById("timer");
  const bar = document.getElementById("timer-bar-wrap");
  if (config().hasTimer) {
    timer.style.display = "";
    bar.style.display = "";
    updateTimerDisplay();
  } else {
    timer.style.display = "none";
    bar.style.display = "none";
  }
}

function updateTimerDisplay() {
  const value = document.getElementById("timer-value");
  const bar = document.getElementById("timer-bar");
  const timer = document.getElementById("timer");
  if (!value || !bar || !timer) return;
  value.textContent = state.timeLeft.toFixed(1);
  bar.style.width = `${Math.max(0, state.timeLeft) * 10}%`;
  const warn = state.timeLeft <= 3;
  timer.classList.toggle("warn", warn);
  bar.classList.toggle("warn", warn);
}

function renderRadicalRow() {
  const coefEl = document.getElementById("coefficient");
  const markEl = document.getElementById("radical-mark");
  const boxEl  = document.getElementById("radicand-box");

  const showRadical = state.phase === "placing" || state.placedChips.length > 0;
  const coefStr = formatCoef(state.coefficient) || (!showRadical ? "1" : "");

  coefEl.textContent = coefStr;
  coefEl.className = "coefficient" +
    (state.coefPulse ? " pulse" : "") +
    (!showRadical ? " solo" : "");

  markEl.style.display = showRadical ? "" : "none";
  boxEl.style.display = showRadical ? "" : "none";

  if (showRadical) {
    markEl.textContent = rootSym();
    boxEl.className = "radicand-box" + (state.phase === "placing" ? " placing" : "");
    reconcileChips(boxEl);
  }
}

// Add/update/remove chip DOM nodes without rebuilding — preserves CSS animations
function reconcileChips(container) {
  const existing = {};
  Array.from(container.children).forEach(el => {
    const id = el.dataset && el.dataset.id;
    if (id) existing[id] = el;
  });

  const seen = new Set();
  state.placedChips.forEach(chip => {
    seen.add(chip.id);
    let el = existing[chip.id];
    if (!el) {
      // New chip — build and append
      el = document.createElement("button");
      el.className = "chip placed";
      el.dataset.action = "placed-click";
      el.dataset.id = chip.id;
      const s = getStyle(chip.value);
      el.style.backgroundColor = s.bg;
      el.style.color = s.text;
      el.style.borderColor = s.border;
      el.textContent = chip.value;
      el.setAttribute("aria-label", `factor ${chip.value}`);
      container.appendChild(el);
    }
    // Update dynamic classes
    el.classList.toggle("selected", state.selectedIds.includes(chip.id));
    el.classList.toggle("wrong", state.wrongPlacedId === chip.id);
    el.classList.toggle("pairing", state.pairingIds.includes(chip.id));
    el.disabled = state.phase === "placing" || state.phase === "done";
  });

  // Remove any chips no longer in state
  Object.keys(existing).forEach(id => {
    if (!seen.has(id)) existing[id].remove();
  });

  // Placeholder inside the radicand during placing phase
  const empty = container.querySelector(".radicand-empty");
  if (state.placedChips.length === 0 && state.phase === "placing") {
    if (!empty) {
      const e = document.createElement("span");
      e.className = "radicand-empty";
      e.textContent = "place primes below";
      container.appendChild(e);
    }
  } else if (empty) {
    empty.remove();
  }
}

function renderFeedback() {
  const area = document.getElementById("feedback-area");
  const rd = rootDeg();
  const sym = rootSym();

  if (state.phase === "done") {
    const { outside, inside } = factorize(problem().factors, rd);
    const outParts = formatFactored(outside);
    const inParts = formatFactored(inside);
    let coefStr = outParts.num > 1 ? String(outParts.num) : "";
    coefStr += outParts.varString;
    let radStr = inParts.num > 1 ? String(inParts.num) : "";
    radStr += inParts.varString;
    const answer = !radStr ? (coefStr || "1") : `${coefStr}${sym}${radStr}`;

    let bonus = "";
    if (!state.revealed && config().hasTimer && state.timeLeft > 0) {
      bonus = `<span class="bonus">nice — ${state.timeLeft.toFixed(1)}s to spare</span>`;
    } else if (!state.revealed && config().hasTimer && state.timeLeft === 0) {
      bonus = `<span class="bonus">solved with no time to spare</span>`;
    } else if (state.revealed) {
      bonus = `<span class="bonus">answer shown — reset to try again</span>`;
    }

    area.innerHTML =
      `<div class="answer${state.revealed ? " revealed" : ""}">` +
      `${sym}${problem().display}<span class="eq">=</span>${answer}${bonus}` +
      `</div>`;
  } else {
    let text;
    if (state.phase === "placing") {
      text = `tap primes from the pool to build ${sym}${problem().display}`;
    } else if (state.selectedIds.length === 0) {
      text = rd === 2
        ? "tap two matching factors"
        : `tap ${rd} matching factors to group them`;
    } else {
      text = `${state.selectedIds.length} of ${rd} — pick ${rd - state.selectedIds.length} more matching`;
    }
    area.innerHTML = `<div class="feedback">${text}</div>`;
  }
}

function renderPool() {
  const area = document.getElementById("pool-area");
  if (!config().hasPool || state.phase !== "placing") {
    area.innerHTML = "";
    return;
  }
  const html = config().pool.map(v => {
    const s = getStyle(v);
    const wrong = state.wrongPoolValue === v ? " wrong" : "";
    return `<button class="chip${wrong}" ` +
           `data-action="pool-click" data-value="${v}" ` +
           `style="background-color: ${s.bg}; color: ${s.text}; border-color: ${s.border};" ` +
           `aria-label="pool ${v}">${v}</button>`;
  }).join("");
  area.innerHTML =
    `<div class="pool"><div class="pool-label">pool</div>` +
    `<div class="pool-chips">${html}</div></div>`;
}

function renderButtons() {
  const isLast = state.levelIdx === config().problems.length - 1;
  const nextLabel = state.phase === "done"
    ? (isLast ? "start over →" : "next →")
    : "reveal →";
  document.getElementById("actions").innerHTML =
    `<button class="btn" data-action="reset">reset</button>` +
    `<button class="btn primary" data-action="next">${nextLabel}</button>`;
}

function renderInstructions() {
  document.getElementById("instructions").textContent = config().hint;
}

// ============================================================================
// Event delegation — one listener handles every click
// ============================================================================
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const value = el.dataset.value;
  const id = el.dataset.id;

  if (action === "switch-mode") switchMode(value);
  else if (action === "pool-click") {
    const v = /^\d+$/.test(value) ? +value : value;
    handlePoolClick(v);
  }
  else if (action === "placed-click") handlePlacedClick(id);
  else if (action === "reset") restart();
  else if (action === "next") handleNextOrReveal();
});

// ============================================================================
// Init
// ============================================================================
resetLevel();

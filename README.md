# Prime Pairs

An interactive game for teaching students to simplify radicals by pairing prime factors.

Students break a radicand into its prime factors, then match pairs (or triples, or quadruples for higher roots). Each successful pair escapes the radical and multiplies into the coefficient. Unpaired primes stay inside.

> **Screenshot:** drop a `screenshot.png` next to this README and add:
> `![Prime Pairs](screenshot.png)`

## The game

Four difficulty modes across a segmented tab bar at the top:

- **Warmup** — the prime factors are already placed under the radical. Students just pair them out. Five problems, no timer.
- **Basic** — students click primes from a pool at the bottom to build the radicand themselves, then pair them. 10-second timer per problem; wrong picks shake and cost a second.
- **Advanced** — same as Basic, but the pool now includes variables (`x`, `y`). An expression like `4x²` means the student clicks `2` twice and `x` twice.
- **Extreme** — introduces cube roots (∛) and 4th roots (∜), with and without variables. Students must group **three** or **four** matching factors instead of two before they escape the radical.

If a student gets stuck, the **reveal →** button jumps straight to the correct answer state, then converts to **next →** to advance. The timer stops at 0 but the game keeps going.

## Running it

This is a plain static site — three files plus a favicon. No build step, no npm, nothing to install.

**To try it locally:** double-click `index.html`. It'll open in your browser and work.

**To put it on the web:** upload all four files (`index.html`, `style.css`, `app.js`, `favicon.svg`) to whatever hosting you use — same as any static site. GitHub Pages, Netlify, a school-hosted folder, whatever polar-battleship uses.

## Adding your own problems

Open `app.js` in any text editor. The problems live at the very top, one array per difficulty.

```js
const BASIC = [
  { display: "50",  factors: [2, 5, 5] },     // simplifies to 5√2
  { display: "45",  factors: [3, 3, 5] },     // simplifies to 3√5
  { display: "72",  factors: [2, 2, 2, 3, 3] }, // simplifies to 6√2
];
```

Each problem needs:

- **`display`** — the string shown to the student in the prompt (`"50"`, `"4x²"`, `"8x³"`)
- **`factors`** — the prime factorization as an array. Numbers are prime factors, strings are variables. Multiply everything together to sanity-check.
- **`root`** — Extreme mode only. Set to `3` for a cube root, `4` for a fourth root. Defaults to 2 (square root) if omitted.

Save the file, refresh the browser, done.

### Cheat sheet

| Radical | Display | Factors | Simplifies to |
|---|---|---|---|
| √50 | `"50"` | `[2, 5, 5]` | 5√2 |
| √72 | `"72"` | `[2, 2, 2, 3, 3]` | 6√2 |
| √(4x²) | `"4x²"` | `[2, 2, "x", "x"]` | 2x |
| √(50x²) | `"50x²"` | `[2, 5, 5, "x", "x"]` | 5x√2 |
| ∛54 | `"54"` | `[2, 3, 3, 3]` + `root: 3` | 3∛2 |
| ∛(8x³) | `"8x³"` | `[2, 2, 2, "x", "x", "x"]` + `root: 3` | 2x |
| ∜16 | `"16"` | `[2, 2, 2, 2]` + `root: 4` | 2 |

### Adjusting the pool

Each mode has a pool of factors the student can click during the placing phase. It lives on the mode config right below the problem arrays:

```js
basic:    { ..., pool: [2, 3, 5, 7] },
advanced: { ..., pool: [2, 3, 5, 7, "x", "y"] },
```

The pool intentionally includes distractors — if the correct radicand doesn't need a `7`, clicking `7` is a wrong pick. Add more variables (`"a"`, `"b"` are already color-styled in `CHIP_STYLE`) or higher primes (`11`, `13` are pre-styled too) if your problems need them.

### Adjusting the timer

Basic, Advanced, and Extreme all start at 10 seconds. Change the initial value in `app.js`:

```js
timeLeft: 10,   // in the `state` object
```

## Project layout

```
prime-pairs/
├── index.html      ← page shell, loads fonts + css + script
├── style.css       ← all styles
├── app.js          ← game state, logic, and rendering
├── favicon.svg     ← little radical mark
└── README.md
```

## License

MIT — do whatever you want with this, including using it in your classroom.

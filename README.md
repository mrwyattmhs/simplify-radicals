# Prime Pairs

An interactive game for teaching students to simplify radicals by pairing prime factors.

Students break a radicand into its prime factors, then match pairs (or triples, or quadruples for higher roots). Each successful pair escapes the radical and multiplies into the coefficient. Unpaired primes stay inside.

Problems are generated randomly, so the game never runs out.

## The game

Four difficulty modes across a segmented tab bar at the top:

- **Warmup** — the prime factors are already placed under the radical. Students just pair them out. No timer.
- **Basic** — students click primes from a pool at the bottom to build the radicand themselves, then pair them. Timed; wrong picks shake and cost a second.
- **Advanced** — same as Basic, but the pool now includes variables (`x`, `y`). An expression like `4x²` means the student clicks `2` twice and `x` twice.
- **Extreme** — cube roots (∛) and 4th roots (∜), with and without variables. Students must group **three** or **four** matching factors instead of two.

The header tracks how many problems you've solved and your current streak. Using **reveal →** breaks the streak; so does finishing after the clock hits zero.

If a student gets stuck, **reveal →** jumps straight to the correct answer, then becomes **next →** to move on. **reset** restarts the current problem. The timer stops at 0 but the game keeps going.

## Running it

Plain static site — three files plus a favicon. No build step, no npm, nothing to install.

**Locally:** double-click `index.html`.

**On the web:** upload `index.html`, `style.css`, `app.js`, and `favicon.svg` to your host. Same as any static site.

## Tuning the difficulties

Everything lives in the `MODES` object at the top of `app.js`. Each mode looks like this:

```js
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
  hint: "...",
},
```

| Field | What it does |
|---|---|
| `pool` | The factors students can click. The generator draws from this same list, so the two can never disagree. Add `11`, `13`, `"a"`, or `"b"` — they're already color-styled. |
| `bigPool` | Which factors are allowed as the base of a group of 3 or 4. Keeps a 4th-root problem from generating `5⁴ = 625`. |
| `shapes` | Group sizes. `[2,1]` = one pair plus one single (3 chips). `[2,2]` = two pairs (4 chips). `[2,1,1]` = one pair plus two singles (4 chips). List a shape twice to make it twice as likely. |
| `roots` | Which root degrees to draw from. `[2]` is square roots only; `[3,3,4]` gives cube roots twice as often as 4th roots. |
| `varBias` | Chance from 0 to 1 of forcing at least one variable into the problem. `0` = never, `0.8` = usually. |
| `maxNum` | Rejects a problem if the numeric part exceeds this. Keeps radicands small enough to factor mentally — raise it for a harder class, lower it for an easier one. |
| `hasPool` | `false` pre-places the factors (Warmup). `true` makes the student build the radicand. |
| `hasTimer` | Whether this mode is timed. |

**The first number in each shape is replaced by the root degree.** So `[2,1]` becomes `[3,1]` under a cube root and `[4,1]` under a 4th root. That's why the same shape list works for every mode.

### One constraint worth knowing about

The generator rejects any problem whose leftover would still be simplifiable. A leftover exponent `r` under index `n` is only fully simplified when `gcd(r, n) = 1` — so a 4th root can't be given a leftover square, because `∜9` would still reduce to `√3`. If you add new shapes and a combination seems to never appear, this is probably why.

### Timer length

The clock scales with how many chips the problem has:

```js
function timeLimitFor(chipCount) {
  return Math.max(10, Math.round(4 + chipCount * 2));
}
```

Three chips gets 10 seconds, four gets 12, six gets 16. Return a flat `10` if you'd rather every problem get the same time.

## Project layout

```
prime-pairs/
├── index.html      ← page shell, loads fonts + css + script
├── style.css       ← all styles
├── app.js          ← config, generator, game logic, rendering
├── favicon.svg
└── README.md
```

`app.js` reads top to bottom: difficulty config, helpers, the problem generator, state, actions, rendering, then a single delegated click listener.

## License

MIT — do whatever you want with this, including using it in your classroom.

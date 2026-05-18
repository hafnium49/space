// ============================================================================
// Space Invaders — vanilla JS
// ----------------------------------------------------------------------------
// Architecture:
//   - Fixed-timestep game loop (requestAnimationFrame + dt clamp)
//   - World state held in a single `state` object so it's easy to reset
//   - Entities are plain objects: { x, y, w, h, ...meta }
//   - Rendering is immediate-mode against a 2D canvas
// ============================================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const scoreEl   = document.getElementById("score");
const livesEl   = document.getElementById("lives");
const waveEl    = document.getElementById("wave");
const overlay   = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlaySub   = document.getElementById("overlay-sub");
const startBtn  = document.getElementById("start-btn");

// --- tuning knobs ----------------------------------------------------------
const PLAYER_SPEED   = 320;   // px / second
const BULLET_SPEED   = 520;
const ENEMY_BULLET_SPEED = 240;
const FIRE_COOLDOWN  = 0.35;  // seconds between player shots
const ENEMY_COLS     = 9;
const ENEMY_ROWS     = 4;
const ENEMY_GAP_X    = 18;
const ENEMY_GAP_Y    = 16;
const ENEMY_W        = 36;
const ENEMY_H        = 24;
const ENEMY_FIRE_CHANCE_PER_SEC = 0.6; // expected enemy shots per second (total)

// --- input -----------------------------------------------------------------
const keys = Object.create(null);
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") e.preventDefault();
  if (e.code === "KeyP" && state.phase === "play") togglePause();
});
addEventListener("keyup",   (e) => { keys[e.code] = false; });

// --- world state -----------------------------------------------------------
let state;
function freshState(wave = 1, score = 0, lives = 3) {
  return {
    phase: "menu",            // "menu" | "play" | "paused" | "won" | "lost"
    t: 0,
    wave, score, lives,
    player: {
      x: W / 2 - 22, y: H - 50, w: 44, h: 18,
      cooldown: 0,
    },
    bullets: [],              // player bullets
    enemyBullets: [],
    enemies: buildEnemies(wave),
    enemyDir: 1,              // 1 = right, -1 = left
    enemyStepTimer: 0,        // accumulator for the march
    particles: [],            // little explosion bits
  };
}

function buildEnemies(wave) {
  const enemies = [];
  const totalW = ENEMY_COLS * ENEMY_W + (ENEMY_COLS - 1) * ENEMY_GAP_X;
  const startX = (W - totalW) / 2;
  const startY = 70;
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      enemies.push({
        x: startX + c * (ENEMY_W + ENEMY_GAP_X),
        y: startY + r * (ENEMY_H + ENEMY_GAP_Y),
        w: ENEMY_W, h: ENEMY_H,
        row: r,
        points: (ENEMY_ROWS - r) * 10,   // top rows are worth more
        alive: true,
      });
    }
  }
  return enemies;
}

state = freshState();

// --- game phases -----------------------------------------------------------
function startGame() {
  state = freshState(1, 0, 3);
  state.phase = "play";
  hideOverlay();
}
function nextWave() {
  state = freshState(state.wave + 1, state.score, state.lives);
  state.phase = "play";
  hideOverlay();
}
function togglePause() {
  if (state.phase === "play")     { state.phase = "paused"; showOverlay("PAUSED", "press P or click START to resume"); }
  else if (state.phase === "paused") { state.phase = "play"; hideOverlay(); }
}
function gameOver(won) {
  state.phase = won ? "won" : "lost";
  showOverlay(
    won ? `WAVE ${state.wave} CLEARED` : "GAME OVER",
    won ? "press START for the next wave" : `final score: ${state.score} — press START to retry`,
    won ? "CONTINUE" : "RESTART",
  );
}

function showOverlay(title, sub, btn = "START") {
  overlayTitle.textContent = title;
  overlaySub.textContent = sub;
  startBtn.textContent = btn;
  overlay.classList.remove("hidden");
}
function hideOverlay() { overlay.classList.add("hidden"); }

startBtn.addEventListener("click", () => {
  if (state.phase === "won")        nextWave();
  else if (state.phase === "paused") togglePause();
  else                               startGame();
});

// --- update steps ----------------------------------------------------------
function updatePlayer(dt) {
  const p = state.player;
  const left  = keys.ArrowLeft  || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;
  if (left)  p.x -= PLAYER_SPEED * dt;
  if (right) p.x += PLAYER_SPEED * dt;
  p.x = Math.max(8, Math.min(W - p.w - 8, p.x));

  p.cooldown = Math.max(0, p.cooldown - dt);
  if ((keys.Space || keys.ArrowUp) && p.cooldown === 0) {
    state.bullets.push({ x: p.x + p.w / 2 - 2, y: p.y - 8, w: 4, h: 12 });
    p.cooldown = FIRE_COOLDOWN;
  }
}

function updateBullets(dt) {
  for (const b of state.bullets) b.y -= BULLET_SPEED * dt;
  for (const b of state.enemyBullets) b.y += ENEMY_BULLET_SPEED * dt;
  state.bullets       = state.bullets.filter(b => b.y + b.h > 0);
  state.enemyBullets  = state.enemyBullets.filter(b => b.y < H);
}

// ----------------------------------------------------------------------------
// >>> YOUR TURN: implement the iconic invader march <<<
// ----------------------------------------------------------------------------
// Classic Space Invaders behavior:
//   1. The whole formation steps SIDEWAYS in discrete ticks (not smooth).
//   2. When ANY living invader would cross the left/right wall on the next
//      step, the WHOLE formation drops down by one row and reverses direction.
//   3. The step interval shrinks as invaders die — fewer invaders = faster
//      march. This is what makes the late game tense.
//
// Inputs you can read/write on `state`:
//   - state.enemies        Array<{x, y, w, h, alive, ...}>
//   - state.enemyDir       1 (right) or -1 (left)
//   - state.enemyStepTimer accumulator in seconds (already declared)
//
// Constants you may use:
//   - W                    canvas width (right wall is W - 8, left wall is 8)
//   - A horizontal step of ~10px and vertical drop of ~16px feels right.
//
// Design choices to make:
//   - How does step interval scale with remaining invaders? Linear? Curve?
//   - Do you peek-ahead one step to detect wall hits, or react after crossing?
//   - When dropping, do you also nudge horizontally to stay inside the wall?
//
// Aim for ~5–10 lines inside the function body.
// ----------------------------------------------------------------------------
function updateEnemies(dt) {
  // TODO(you): implement the march. See notes above.
  // Hint skeleton (delete/replace as you like):
  //
  //   state.enemyStepTimer += dt;
  //   const alive = state.enemies.filter(e => e.alive);
  //   const interval = /* function of alive.length and state.wave */;
  //   if (state.enemyStepTimer < interval) return;
  //   state.enemyStepTimer = 0;
  //
  //   const stepX = 10 * state.enemyDir;
  //   const hitsWall = alive.some(e => {
  //     const nx = e.x + stepX;
  //     return nx < 8 || nx + e.w > W - 8;
  //   });
  //   if (hitsWall) {
  //     state.enemyDir *= -1;
  //     for (const e of alive) e.y += 16;
  //   } else {
  //     for (const e of alive) e.x += stepX;
  //   }
}

function updateEnemyFire(dt) {
  // Random shots from the bottom-most alive invader in each column.
  const cols = new Map();
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const key = Math.round(e.x);
    if (!cols.has(key) || cols.get(key).y < e.y) cols.set(key, e);
  }
  const shooters = [...cols.values()];
  if (shooters.length === 0) return;

  // Convert "expected shots per second" into a per-frame probability.
  const p = ENEMY_FIRE_CHANCE_PER_SEC * dt * (1 + (state.wave - 1) * 0.25);
  if (Math.random() < p) {
    const s = shooters[(Math.random() * shooters.length) | 0];
    state.enemyBullets.push({ x: s.x + s.w / 2 - 2, y: s.y + s.h, w: 4, h: 10 });
  }
}

// AABB overlap
function hit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveCollisions() {
  // player bullets vs enemies
  for (const b of state.bullets) {
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (hit(b, e)) {
        e.alive = false;
        b.y = -999;                  // mark for cleanup
        state.score += e.points;
        spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, "#6cf36c");
        break;
      }
    }
  }
  state.bullets = state.bullets.filter(b => b.y > -100);

  // enemy bullets vs player
  for (const b of state.enemyBullets) {
    if (hit(b, state.player)) {
      b.y = H + 999;
      state.lives -= 1;
      spawnExplosion(state.player.x + state.player.w / 2, state.player.y, "#ff4d6d");
      if (state.lives <= 0) { gameOver(false); return; }
    }
  }
  state.enemyBullets = state.enemyBullets.filter(b => b.y < H + 50);

  // invaders reaching the player line = game over
  for (const e of state.enemies) {
    if (e.alive && e.y + e.h >= state.player.y) { gameOver(false); return; }
  }

  // wave cleared?
  if (state.enemies.every(e => !e.alive)) gameOver(true);
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 120;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.3,
      color,
    });
  }
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

// --- render ---------------------------------------------------------------
function draw() {
  ctx.clearRect(0, 0, W, H);

  // starfield
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 60; i++) {
    const sx = (i * 97 + (state.t * 12)) % W;
    const sy = (i * 53) % H;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // player
  drawPlayer(state.player);

  // enemies
  for (const e of state.enemies) {
    if (e.alive) drawEnemy(e, state.t);
  }

  // bullets
  ctx.fillStyle = "#e6f0ff";
  for (const b of state.bullets) ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = "#ff4d6d";
  for (const b of state.enemyBullets) ctx.fillRect(b.x, b.y, b.w, b.h);

  // particles
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  // ground line
  ctx.strokeStyle = "#6cf36c";
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, H - 24);
  ctx.lineTo(W, H - 24);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPlayer(p) {
  ctx.fillStyle = "#6cf36c";
  // base
  ctx.fillRect(p.x, p.y + 8, p.w, 10);
  // turret
  ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 10);
}

function drawEnemy(e, t) {
  // two-frame animation tied to global clock — looks like the classic wiggle
  const frame = (Math.floor(t * 2) % 2) === 0;
  ctx.fillStyle = ["#9fffea", "#ffd86b", "#ff8bd1", "#c7a3ff"][e.row % 4];
  const x = e.x, y = e.y, w = e.w, h = e.h;
  // body
  ctx.fillRect(x + 4, y + 4, w - 8, h - 10);
  // eyes
  ctx.fillStyle = "#02030a";
  ctx.fillRect(x + 10, y + 10, 4, 4);
  ctx.fillRect(x + w - 14, y + 10, 4, 4);
  // legs (alternate per frame)
  ctx.fillStyle = ["#9fffea", "#ffd86b", "#ff8bd1", "#c7a3ff"][e.row % 4];
  if (frame) {
    ctx.fillRect(x, y + h - 6, 6, 6);
    ctx.fillRect(x + w - 6, y + h - 6, 6, 6);
  } else {
    ctx.fillRect(x + 6, y + h - 6, 6, 6);
    ctx.fillRect(x + w - 12, y + h - 6, 6, 6);
  }
}

// --- HUD ------------------------------------------------------------------
function syncHUD() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  waveEl.textContent  = state.wave;
}

// --- main loop ------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); // clamp to ~30fps minimum dt
  last = now;

  if (state.phase === "play") {
    state.t += dt;
    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateEnemyFire(dt);
    updateParticles(dt);
    resolveCollisions();
    syncHUD();
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

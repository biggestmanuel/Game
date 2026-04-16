// ── CANVAS SETUP ──────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Responsive canvas size
function setCanvasSize() {
  const maxW = Math.min(window.innerWidth - 32, 800);
  const maxH = Math.min(window.innerHeight - 120, 400);
  canvas.width = maxW;
  canvas.height = maxH;
}
setCanvasSize();
window.addEventListener("resize", () => { setCanvasSize(); resetGroundY(); });

// ── COLORS ───────────────────────────────────────────────
const BLUE  = "#1a73e8";
const WHITE = "#f5f5f5";
const BLACK = "#080808";
const GRAY  = "#1a1a1a";
const DARK  = "#111";
const RED   = "#ff4444";

// ── GAME STATE ───────────────────────────────────────────
let gameRunning = false;
let animId      = null;
let score       = 0;
let bestScore   = parseInt(localStorage.getItem("voidrunner_best") || "0");
let frameCount  = 0;
let gameSpeed   = 5;
let spawnRate   = 90; // frames between obstacles
let particles   = [];
let stars       = [];

// ── GROUND ───────────────────────────────────────────────
let GROUND_Y;
function resetGroundY() {
  GROUND_Y = canvas.height - 60;
}
resetGroundY();

// ── PLAYER ───────────────────────────────────────────────
const PLAYER_W = 30;
const PLAYER_H = 36;
const GRAVITY  = 0.55;
const JUMP_V   = -13;

let player = {};

function resetPlayer() {
  player = {
    x: 80,
    y: GROUND_Y - PLAYER_H,
    vy: 0,
    onGround: true,
    jumpCount: 0,   // allows double jump
    maxJumps: 2,
    isDead: false,
    trailTimer: 0,
  };
}

// ── OBSTACLES ────────────────────────────────────────────
let obstacles = [];

function spawnObstacle() {
  const types = ["low", "low", "low", "mid", "tall", "double"];
  const type  = types[Math.floor(Math.random() * types.length)];

  let w, h, y, color;

  if (type === "low") {
    w = 20 + Math.random() * 16;
    h = 24 + Math.random() * 20;
    y = GROUND_Y - h;
    color = WHITE;
  } else if (type === "mid") {
    w = 22;
    h = 44;
    y = GROUND_Y - h;
    color = "#aaa";
  } else if (type === "tall") {
    w = 18;
    h = 64;
    y = GROUND_Y - h;
    color = WHITE;
  } else if (type === "double") {
    // Two stacked blocks
    spawnObstacle(); // spawn one
    const w2 = 20;
    const h2 = 28;
    obstacles.push({
      x: canvas.width + 36,
      y: GROUND_Y - h2,
      w: w2, h: h2,
      color: BLUE,
      passed: false,
    });
    return;
  }

  obstacles.push({
    x: canvas.width + 10,
    y, w, h, color,
    passed: false,
  });
}

// ── STARS (background parallax) ──────────────────────────
function initStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * GROUND_Y,
      r: Math.random() * 1.5,
      speed: 0.3 + Math.random() * 1.2,
      alpha: 0.2 + Math.random() * 0.6,
    });
  }
}

// ── PARTICLES ────────────────────────────────────────────
function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      alpha: 1,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

// ── INPUT ─────────────────────────────────────────────────
function jump() {
  if (!gameRunning || player.isDead) return;
  if (player.jumpCount < player.maxJumps) {
    player.vy = JUMP_V;
    player.onGround = false;
    player.jumpCount++;
    spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H, BLUE, 6);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    jump();
  }
});

canvas.addEventListener("click", jump);
document.addEventListener("touchstart", (e) => {
  e.preventDefault();
  jump();
}, { passive: false });

// ── COLLISION DETECTION ───────────────────────────────────
function rectsOverlap(a, b) {
  const pad = 4; // slight forgiveness
  return (
    a.x + pad < b.x + b.w - pad &&
    a.x + a.w - pad > b.x + pad &&
    a.y + pad < b.y + b.h - pad &&
    a.y + a.h - pad > b.y + pad
  );
}

// ── UPDATE ────────────────────────────────────────────────
function update() {
  frameCount++;

  // Speed ramp — gets faster every 300 frames
  gameSpeed  = 5 + Math.floor(frameCount / 300) * 0.8;
  spawnRate  = Math.max(45, 90 - Math.floor(frameCount / 200) * 5);

  // Score
  score = Math.floor(frameCount / 6);

  // Update HUD
  document.getElementById("score-display").textContent = score;
  document.getElementById("best-display").textContent  = bestScore;
  document.getElementById("speed-display").textContent =
    `SPEED: ${(gameSpeed / 5).toFixed(1)}x`;

  // ── Stars
  stars.forEach(s => {
    s.x -= s.speed * (gameSpeed / 5);
    if (s.x < 0) s.x = canvas.width + 2;
  });

  // ── Player physics
  if (!player.onGround) {
    player.vy += GRAVITY;
    player.y  += player.vy;
  }

  // Land
  if (player.y >= GROUND_Y - PLAYER_H) {
    player.y        = GROUND_Y - PLAYER_H;
    player.vy       = 0;
    player.onGround = true;
    player.jumpCount = 0;
  }

  // Trail
  player.trailTimer++;
  if (player.trailTimer % 3 === 0 && !player.onGround) {
    particles.push({
      x: player.x + PLAYER_W / 2,
      y: player.y + PLAYER_H / 2,
      vx: -gameSpeed * 0.4,
      vy: (Math.random() - 0.5),
      alpha: 0.5,
      color: BLUE,
      size: 4,
    });
  }

  // ── Obstacles
  if (frameCount % spawnRate === 0) spawnObstacle();

  obstacles.forEach(ob => { ob.x -= gameSpeed; });
  obstacles = obstacles.filter(ob => ob.x + ob.w > -10);

  // Score milestone particles
  obstacles.forEach(ob => {
    if (!ob.passed && ob.x + ob.w < player.x) {
      ob.passed = true;
      spawnParticles(ob.x + ob.w / 2, ob.y, WHITE, 4);
    }
  });

  // ── Particles
  particles.forEach(p => {
    p.x     += p.vx;
    p.y     += p.vy;
    p.alpha -= 0.03;
  });
  particles = particles.filter(p => p.alpha > 0);

  // ── Collision
  for (const ob of obstacles) {
    if (rectsOverlap(player, ob)) {
      killPlayer();
      return;
    }
  }
}

// ── DRAW ──────────────────────────────────────────────────
function draw() {
  // Background
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines (subtle)
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }
  for (let y = 0; y < GROUND_Y; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Stars
  stars.forEach(s => {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle   = WHITE;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Ground
  ctx.fillStyle = GRAY;
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

  // Ground line glow
  ctx.shadowColor = BLUE;
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = BLUE;
  ctx.fillRect(0, GROUND_Y, canvas.width, 2);
  ctx.shadowBlur  = 0;

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  // Obstacles
  obstacles.forEach(ob => {
    // Glow
    ctx.shadowColor = ob.color === BLUE ? BLUE : "rgba(255,255,255,0.3)";
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = ob.color;
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

    // Top accent line
    ctx.fillStyle   = ob.color === BLUE ? "#6fb3ff" : "#fff";
    ctx.fillRect(ob.x, ob.y, ob.w, 3);
    ctx.shadowBlur  = 0;
  });

  // Player
  const px = player.x;
  const py = player.y;
  const pw = PLAYER_W;
  const ph = PLAYER_H;

  // Body glow
  ctx.shadowColor = BLUE;
  ctx.shadowBlur  = 16;

  // Body
  ctx.fillStyle = WHITE;
  ctx.fillRect(px, py + 8, pw, ph - 8);

  // Head
  ctx.fillStyle = WHITE;
  ctx.fillRect(px + 4, py, pw - 8, 12);

  // Eye
  ctx.fillStyle = BLUE;
  ctx.fillRect(px + pw - 10, py + 2, 6, 6);

  // Legs (animated)
  const legAnim = player.onGround ? Math.sin(frameCount * 0.25) * 5 : 0;
  ctx.fillStyle = "#ccc";
  ctx.fillRect(px + 4,      py + ph - 4, 8, 6 + legAnim);
  ctx.fillRect(px + pw - 12, py + ph - 4, 8, 6 - legAnim);

  ctx.shadowBlur = 0;

  // Score flash at milestones
  if (score > 0 && score % 100 === 0 && frameCount % 6 < 3) {
    ctx.fillStyle   = "rgba(26,115,232,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ── GAME LOOP ─────────────────────────────────────────────
function loop() {
  if (!gameRunning) return;
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

// ── KILL PLAYER ───────────────────────────────────────────
function killPlayer() {
  gameRunning      = false;
  player.isDead    = true;

  spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, RED, 20);
  spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, WHITE, 12);

  // One last draw with particles
  draw();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("voidrunner_best", bestScore);
  }

  setTimeout(() => {
    document.getElementById("final-score").textContent = score;
    document.getElementById("best-score").textContent  = bestScore;
    showScreen("gameover");
  }, 800);
}

// ── SCREEN MANAGER ────────────────────────────────────────
function showScreen(name) {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("gameover-screen").classList.add("hidden");
  document.getElementById("game-wrapper").classList.add("hidden");

  if (name === "start")    document.getElementById("start-screen").classList.remove("hidden");
  if (name === "gameover") document.getElementById("gameover-screen").classList.remove("hidden");
  if (name === "game")     document.getElementById("game-wrapper").classList.remove("hidden");
}

// ── START / RESTART ───────────────────────────────────────
function startGame() {
  cancelAnimationFrame(animId);
  score      = 0;
  frameCount = 0;
  gameSpeed  = 5;
  spawnRate  = 90;
  obstacles  = [];
  particles  = [];

  setCanvasSize();
  resetGroundY();
  resetPlayer();
  initStars();

  showScreen("game");
  gameRunning = true;
  loop();
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", startGame);

// Init best score display on load
document.getElementById("best-score").textContent = bestScore;
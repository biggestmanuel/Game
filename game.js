const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 600;

let player = {
  x: 180,
  y: 550,
  width: 40,
  height: 40,
  speed: 6
};

let enemies = [];
let score = 0;
let gameOver = false;

const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");

let keys = {};

// Controls
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Spawn enemies
function spawnEnemy() {
  let size = 30;
  let x = Math.random() * (canvas.width - size);

  enemies.push({
    x: x,
    y: -size,
    width: size,
    height: size,
    speed: 3 + Math.random() * 2
  });
}

// Draw player
function drawPlayer() {
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Draw enemies
function drawEnemies() {
  ctx.fillStyle = "red";
  enemies.forEach(enemy => {
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

// Update player
function updatePlayer() {
  if (keys["ArrowLeft"] && player.x > 0) {
    player.x -= player.speed;
  }
  if (keys["ArrowRight"] && player.x < canvas.width - player.width) {
    player.x += player.speed;
  }
}

// Update enemies
function updateEnemies() {
  enemies.forEach(enemy => {
    enemy.y += enemy.speed;
  });

  // Remove off-screen enemies
  enemies = enemies.filter(enemy => enemy.y < canvas.height);
}

// Collision detection
function checkCollision() {
  for (let enemy of enemies) {
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      endGame();
    }
  }
}

// End game
function endGame() {
  gameOver = true;
  gameOverScreen.classList.remove("hidden");
  finalScore.textContent = "Score: " + score;
}

// Restart game
function restartGame() {
  player.x = 180;
  enemies = [];
  score = 0;
  gameOver = false;
  gameOverScreen.classList.add("hidden");
  gameLoop();
}

// Game loop
function gameLoop() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePlayer();
  updateEnemies();
  checkCollision();

  drawPlayer();
  drawEnemies();

  score++;
  scoreDisplay.textContent = score;

  requestAnimationFrame(gameLoop);
}

// Spawn enemies every second
setInterval(() => {
  if (!gameOver) spawnEnemy();
}, 1000);

// Start game
gameLoop();
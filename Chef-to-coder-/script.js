const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const overlay = document.getElementById("gameOverOverlay");
const finalScoreEl = document.getElementById("finalScore");
const playAgainBtn = document.getElementById("playAgainBtn");

const player = {
  width: 38,
  height: 48,
  x: canvas.width / 2 - 19,
  y: canvas.height - 80,
  speed: 240,
  color: "#4fc3f7",
};

const state = {
  score: 0,
  lives: 3,
  running: true,
  lastShot: 0,
  bulletCooldown: 250,
  enemySpawn: 0,
  enemyInterval: 1400,
  difficultyTimer: 0,
};

const bullets = [];
const enemies = [];
const keys = new Set();

const enemyPool = {
  minSpeed: 60,
  maxSpeed: 140,
  maxSize: 48,
  minSize: 28,
};

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  keys.add(event.key.toLowerCase());

  if (event.code === "Space") {
    event.preventDefault();
    shoot();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

playAgainBtn.addEventListener("click", restartGame);

toggleOverlay(false);
let lastTime = performance.now();
requestAnimationFrame(gameLoop);

function gameLoop(timestamp) {
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (state.running) {
    update(delta);
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function update(delta) {
  handleMovement(delta);
  updateBullets(delta);
  spawnEnemies(delta);
  updateEnemies(delta);
  detectCollisions();
  updateDifficulty(delta);
}

function handleMovement(delta) {
  let dx = 0;
  let dy = 0;

  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    const norm = Math.sqrt(2) / 2;
    dx *= norm;
    dy *= norm;
  }

  player.x += dx * player.speed * delta;
  player.y += dy * player.speed * delta;

  player.x = Math.max(10, Math.min(canvas.width - player.width - 10, player.x));
  player.y = Math.max(canvas.height / 2, Math.min(canvas.height - player.height - 10, player.y));
}

function shoot() {
  const now = performance.now();
  if (now - state.lastShot < state.bulletCooldown || !state.running) return;

  state.lastShot = now;
  bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y - 10,
    width: 6,
    height: 18,
    speed: 420,
    color: "#facc15",
  });
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.y -= bullet.speed * delta;
    if (bullet.y + bullet.height < 0) {
      bullets.splice(i, 1);
    }
  }
}

function spawnEnemies(delta) {
  state.enemySpawn += delta * 1000;
  state.difficultyTimer += delta;

  if (state.enemySpawn >= state.enemyInterval) {
    const width = rand(enemyPool.minSize, enemyPool.maxSize);
    const speed = rand(enemyPool.minSpeed, enemyPool.maxSpeed);
    enemies.push({
      x: rand(16, canvas.width - width - 16),
      y: -width,
      width,
      height: width,
      speed,
      color: "#f97316",
      wobble: Math.random() * Math.PI * 2,
    });

    state.enemySpawn = 0;
  }
}

function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.y += enemy.speed * delta;
    enemy.wobble += delta * 2;
    enemy.x += Math.sin(enemy.wobble) * 30 * delta;

    if (enemy.y > canvas.height) {
      enemies.splice(i, 1);
      loseLife();
    }
  }
}

function detectCollisions() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];

    if (isColliding(enemy, player)) {
      enemies.splice(i, 1);
      loseLife();
      continue;
    }

    for (let j = bullets.length - 1; j >= 0; j -= 1) {
      const bullet = bullets[j];
      if (isColliding(enemy, bullet)) {
        bullets.splice(j, 1);
        enemies.splice(i, 1);
        addScore(10);
        break;
      }
    }
  }
}

function updateDifficulty(delta) {
  if (state.difficultyTimer >= 15) {
    state.enemyInterval = Math.max(600, state.enemyInterval - 120);
    enemyPool.minSpeed = Math.min(enemyPool.minSpeed + 6, 140);
    enemyPool.maxSpeed = Math.min(enemyPool.maxSpeed + 12, 220);
    state.difficultyTimer = 0;
  }
}

function addScore(amount) {
  state.score += amount;
  scoreEl.textContent = state.score.toString();
}

function loseLife() {
  if (!state.running) return;
  state.lives -= 1;
  livesEl.textContent = state.lives.toString();

  if (state.lives <= 0) {
    endGame();
  }
}

function endGame() {
  state.running = false;
  finalScoreEl.textContent = state.score.toString();
  toggleOverlay(true);
}

function restartGame() {
  bullets.length = 0;
  enemies.length = 0;
  state.score = 0;
  state.lives = 3;
  state.enemyInterval = 1400;
  enemyPool.minSpeed = 60;
  enemyPool.maxSpeed = 140;
  state.difficultyTimer = 0;
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 80;
  scoreEl.textContent = "0";
  livesEl.textContent = "3";
  state.running = true;
  toggleOverlay(false);
  state.lastShot = 0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlayer();
  drawBullets();
  drawEnemies();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(1, "#020617");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(79, 195, 247, 0.12)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  for (let y = 40; y < canvas.height; y += 60) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
  ctx.fillRect(player.x + player.width / 2 - 3, player.y + player.height - 8, 6, 10);
}

function drawBullets() {
  bullets.forEach((bullet) => {
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    ctx.fillStyle = enemy.color;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(enemy.x, enemy.y, enemy.width, enemy.height, 8);
      ctx.fill();
    } else {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
    ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.3, enemy.width * 0.6, enemy.height * 0.15);
  });
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function toggleOverlay(show) {
  overlay.hidden = !show;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

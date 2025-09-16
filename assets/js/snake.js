// Simple Snake game (vanilla JS). Drop-in and self-contained.
(() => {
  const canvas = document.getElementById('snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const tileSize = 20;
  const tilesX = Math.floor(canvas.width / tileSize);
  const tilesY = Math.floor(canvas.height / tileSize);

  let snake = [
    { x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) },
  ];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food = spawnFood();
  let score = 0;
  let speedMs = 140;
  let lastTick = 0;
  let isGameOver = false;

  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
        break;
      case ' ':
        if (isGameOver) restart();
        break;
    }
  });

  function spawnFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * tilesX),
        y: Math.floor(Math.random() * tilesY),
      };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
    }
  }

  function restart() {
    snake = [{ x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    food = spawnFood();
    score = 0;
    speedMs = 140;
    isGameOver = false;
  }

  function update() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wrap around edges
    if (head.x < 0) head.x = tilesX - 1;
    if (head.x >= tilesX) head.x = 0;
    if (head.y < 0) head.y = tilesY - 1;
    if (head.y >= tilesY) head.y = 0;

    // Self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      isGameOver = true;
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1;
      if (speedMs > 70) speedMs -= 3;
      food = spawnFood();
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (subtle)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(food.x * tileSize, food.y * tileSize, tileSize, tileSize);

    // Snake
    ctx.fillStyle = '#2ecc71';
    snake.forEach((s, i) => {
      ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);
    });

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText('Score: ' + score + '  (Space to restart)', 8, 18);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over - Press Space', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'start';
    }
  }

  function loop(ts) {
    if (!lastTick) lastTick = ts;
    const delta = ts - lastTick;
    if (!isGameOver && delta >= speedMs) {
      update();
      lastTick = ts;
    }
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();



// Simple Snake game (vanilla JS). Drop-in and self-contained.
(() => {
  const canvas = document.getElementById('snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Fixed canvas dimensions for reliability
  const canvasWidth = 420;
  const canvasHeight = 300;
  const tileSize = 20;
  const tilesX = Math.floor(canvasWidth / tileSize);
  const tilesY = Math.floor(canvasHeight / tileSize);

  let snake = [
    { x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) },
    { x: Math.floor(tilesX / 2) - 1, y: Math.floor(tilesY / 2) },
    { x: Math.floor(tilesX / 2) - 2, y: Math.floor(tilesY / 2) },
  ];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food = spawnFood();
  let score = 0;
  let speedMs = 140;
  let lastTick = 0;
  let isGameOver = false;

  // Touch/swipe support for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe right
          if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
        } else {
          // Swipe left
          if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          // Swipe down
          if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
        } else {
          // Swipe up
          if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
        }
      }
    }
  }

  // Add touch events
  function addTouchEvents() {
    if (canvas) {
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      });

      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;
        
        // Check if it's a tap in the middle area (not a swipe)
        const deltaX = Math.abs(touchEndX - touchStartX);
        const deltaY = Math.abs(touchEndY - touchStartY);
        const maxTapDistance = 10;
        
        if (deltaX < maxTapDistance && deltaY < maxTapDistance) {
          // It's a tap, check if it's in the middle area
          const rect = canvas.getBoundingClientRect();
          const tapX = touchEndX - rect.left;
          const tapY = touchEndY - rect.top;
          const middleX = canvasWidth / 2;
          const middleY = canvasHeight / 2;
          const middleRadius = 60; // Radius around center for restart tap
          
          const distanceFromCenter = Math.sqrt(
            Math.pow(tapX - middleX, 2) + Math.pow(tapY - middleY, 2)
          );
          
          if (distanceFromCenter <= middleRadius) {
            if (isGameOver) {
              restart();
            }
          }
        } else {
          // It's a swipe, handle normally
          handleSwipe();
        }
      });
      
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
      });
    }
  }

  // Add touch events
  addTouchEvents();

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
    snake = [
      { x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) },
      { x: Math.floor(tilesX / 2) - 1, y: Math.floor(tilesY / 2) },
      { x: Math.floor(tilesX / 2) - 2, y: Math.floor(tilesY / 2) },
    ];
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
    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid (subtle)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasWidth; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvasWidth, y + 0.5);
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
    ctx.fillText('Score: ' + score, 8, 18);

    if (isGameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvasWidth / 2, canvasHeight / 2 - 10);
      ctx.font = '14px sans-serif';
      ctx.fillText('Press Space or tap center', canvasWidth / 2, canvasHeight / 2 + 15);
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

  // Initialize the game
  restart();
  requestAnimationFrame(loop);
})();
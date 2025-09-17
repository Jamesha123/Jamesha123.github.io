// Simple Snake game (vanilla JS). Drop-in and self-contained.
(() => {
  const canvas = document.getElementById('snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Responsive canvas sizing for mobile
  function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = Math.min(420, container.clientWidth - 20);
    const aspectRatio = 420 / 300;
    const newWidth = maxWidth;
    const newHeight = newWidth / aspectRatio;
    
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Recalculate grid dimensions
    tilesX = Math.floor(canvas.width / tileSize);
    tilesY = Math.floor(canvas.height / tileSize);
    
    // Restart game with new dimensions
    restart();
  }
  
  // Initial resize
  resizeCanvas();
  
  // Resize on window resize
  window.addEventListener('resize', resizeCanvas);
  
  const tileSize = 20;
  let tilesX = Math.floor(canvas.width / tileSize);
  let tilesY = Math.floor(canvas.height / tileSize);

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

  // Touch/swipe support for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30; // Minimum distance for a swipe

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

  // Add touch events - try immediately and also after a delay
  function addTouchEvents() {
    if (canvas) {
      // Remove existing listeners to avoid duplicates
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchmove', handleTouchMove);
      
      // Add new listeners
      canvas.addEventListener('touchstart', handleTouchStart);
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchmove', handleTouchMove);
    }
  }

  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    handleSwipe();
  }

  function handleTouchMove(e) {
    e.preventDefault();
  }

  // Try to add events immediately
  addTouchEvents();
  
  // Also try after a delay in case canvas isn't visible yet
  setTimeout(addTouchEvents, 200);
  
  // Fallback: try again when the game loop starts
  let touchEventsAdded = false;

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
    ctx.fillText('Score: ' + score, 8, 18);

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
    // Try to add touch events if not already added
    if (!touchEventsAdded) {
      addTouchEvents();
      touchEventsAdded = true;
    }
    
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



// Simple Snake game (vanilla JS). Drop-in and self-contained.
(() => {
  const canvas = document.getElementById("snake-canvas");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("snake-score");

  const TILE = 16;
  const COLS = 28;
  const ROWS = 20;
  const PIX = 2;
  const canvasWidth = COLS * TILE;
  const canvasHeight = ROWS * TILE;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  ctx.imageSmoothingEnabled = false;

  const tilesX = COLS;
  const tilesY = ROWS;

  let snake = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };
  let score = 0;
  let speedMs = 140;
  let lastTick = 0;
  let isGameOver = false;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  const GRASS_LIGHT = "#6aad42";
  const GRASS_DARK = "#5c9638";
  const GRASS_SPECK = "#7bc04f";
  const GRID_LINE = "rgba(28, 56, 20, 0.28)";

  const SNAKE_OUTLINE = "#1a5c24";
  const SNAKE_BODY = "#3cb54a";
  const SNAKE_BELLY = "#6edc78";
  const SNAKE_HEAD = "#44d058";

  const APPLE_COLORS = {
    r: "#e74c3c",
    R: "#c0392b",
    g: "#27ae60",
    b: "#6d4c2a",
    B: "#4e342e",
  };

  const APPLE_SPRITE = [
    "..rr..",
    ".Rrrg.",
    "rrrrrr",
    "rrrrrr",
    ".RrrR.",
    "..rr..",
    "..bb..",
    "...B..",
  ];

  function setScore(value) {
    score = value;
    if (scoreEl) {
      scoreEl.textContent = String(score);
    }
  }

  function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          if (direction.x !== -1) {
            nextDirection = { x: 1, y: 0 };
          }
        } else if (direction.x !== 1) {
          nextDirection = { x: -1, y: 0 };
        }
      }
    } else if (Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY > 0) {
        if (direction.y !== -1) {
          nextDirection = { x: 0, y: 1 };
        }
      } else if (direction.y !== 1) {
        nextDirection = { x: 0, y: -1 };
      }
    }
  }

  function addTouchEvents() {
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    });

    canvas.addEventListener("touchend", function (e) {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchEndX = touch.clientX;
      touchEndY = touch.clientY;

      const deltaX = Math.abs(touchEndX - touchStartX);
      const deltaY = Math.abs(touchEndY - touchStartY);
      const maxTapDistance = 10;

      if (deltaX < maxTapDistance && deltaY < maxTapDistance) {
        const rect = canvas.getBoundingClientRect();
        const tapX = ((touchEndX - rect.left) / rect.width) * canvasWidth;
        const tapY = ((touchEndY - rect.top) / rect.height) * canvasHeight;
        const middleRadius = 70;

        const distanceFromCenter = Math.sqrt(
          Math.pow(tapX - canvasWidth / 2, 2) + Math.pow(tapY - canvasHeight / 2, 2)
        );

        if (distanceFromCenter <= middleRadius && isGameOver) {
          restart();
        }
      } else {
        handleSwipe();
      }
    });

    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
    });
  }

  addTouchEvents();

  window.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        if (direction.y !== 1) {
          nextDirection = { x: 0, y: -1 };
        }
        break;
      case "ArrowDown":
      case "s":
      case "S":
        if (direction.y !== -1) {
          nextDirection = { x: 0, y: 1 };
        }
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        if (direction.x !== 1) {
          nextDirection = { x: -1, y: 0 };
        }
        break;
      case "ArrowRight":
      case "d":
      case "D":
        if (direction.x !== -1) {
          nextDirection = { x: 1, y: 0 };
        }
        break;
      case " ":
        if (isGameOver) {
          restart();
        }
        break;
      default:
        break;
    }
  });

  function spawnFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * tilesX),
        y: Math.floor(Math.random() * tilesY),
      };
      if (!snake.some(function (s) { return s.x === f.x && s.y === f.y; })) {
        return f;
      }
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
    setScore(0);
    speedMs = 140;
    isGameOver = false;
  }

  function update() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (head.x < 0) {
      head.x = tilesX - 1;
    }
    if (head.x >= tilesX) {
      head.x = 0;
    }
    if (head.y < 0) {
      head.y = tilesY - 1;
    }
    if (head.y >= tilesY) {
      head.y = 0;
    }

    if (snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
      isGameOver = true;
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      setScore(score + 1);
      if (speedMs > 70) {
        speedMs -= 3;
      }
      food = spawnFood();
    } else {
      snake.pop();
    }
  }

  function drawGrassTile(x, y) {
    const light = (x + y) % 2 === 0;
    ctx.fillStyle = light ? GRASS_LIGHT : GRASS_DARK;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);

    if ((x * 5 + y * 3) % 7 === 0) {
      ctx.fillStyle = GRASS_SPECK;
      ctx.fillRect(x * TILE + 3, y * TILE + 5, PIX, PIX);
    }
    if ((x * 2 + y * 7) % 9 === 0) {
      ctx.fillStyle = light ? GRASS_DARK : GRASS_LIGHT;
      ctx.fillRect(x * TILE + 10, y * TILE + 8, PIX, PIX);
    }
  }

  function drawGrassBackground() {
    for (let y = 0; y < tilesY; y += 1) {
      for (let x = 0; x < tilesX; x += 1) {
        drawGrassTile(x, y);
      }
    }

    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    for (let x = 0; x <= tilesX; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * TILE + 0.5, 0);
      ctx.lineTo(x * TILE + 0.5, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= tilesY; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(canvasWidth, y * TILE + 0.5);
      ctx.stroke();
    }
  }

  function blitSprite(sprite, tileX, tileY, colorMap) {
    const offsetX = tileX * TILE + (TILE - sprite[0].length * PIX) / 2;
    const offsetY = tileY * TILE + (TILE - sprite.length * PIX) / 2;

    for (let row = 0; row < sprite.length; row += 1) {
      const line = sprite[row];
      for (let col = 0; col < line.length; col += 1) {
        const key = line.charAt(col);
        const color = colorMap[key];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(offsetX + col * PIX, offsetY + row * PIX, PIX, PIX);
        }
      }
    }
  }

  function drawPixelApple() {
    blitSprite(APPLE_SPRITE, food.x, food.y, APPLE_COLORS);
  }

  function drawEyes(px, py) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 8, py + 4, PIX, PIX);
    ctx.fillRect(px + 8, py + 8, PIX, PIX);

    ctx.fillStyle = "#111";
    if (direction.x === 1) {
      ctx.fillRect(px + 10, py + 4, PIX, PIX);
      ctx.fillRect(px + 10, py + 8, PIX, PIX);
    } else if (direction.x === -1) {
      ctx.fillRect(px + 6, py + 4, PIX, PIX);
      ctx.fillRect(px + 6, py + 8, PIX, PIX);
    } else if (direction.y === -1) {
      ctx.fillRect(px + 4, py + 6, PIX, PIX);
      ctx.fillRect(px + 8, py + 6, PIX, PIX);
    } else {
      ctx.fillRect(px + 4, py + 10, PIX, PIX);
      ctx.fillRect(px + 8, py + 10, PIX, PIX);
    }
  }

  function drawPixelSnakeSegment(seg, index, total) {
    const px = seg.x * TILE;
    const py = seg.y * TILE;
    const isHead = index === 0;
    const isTail = index === total - 1;

    ctx.fillStyle = SNAKE_OUTLINE;
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);

    if (isHead) {
      ctx.fillStyle = SNAKE_HEAD;
      ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
      ctx.fillStyle = SNAKE_BELLY;
      ctx.fillRect(px + 6, py + 8, TILE - 12, PIX);
      drawEyes(px, py);
      return;
    }

    if (isTail) {
      ctx.fillStyle = SNAKE_BODY;
      ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
      return;
    }

    ctx.fillStyle = SNAKE_BODY;
    ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = SNAKE_BELLY;
    ctx.fillRect(px + 6, py + 8, TILE - 12, PIX);
  }

  function drawPixelGameOver() {
    ctx.fillStyle = "rgba(20, 40, 14, 0.72)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const boxW = 176;
    const boxH = 72;
    const boxX = (canvasWidth - boxW) / 2;
    const boxY = (canvasHeight - boxH) / 2;

    ctx.fillStyle = "#2f5829";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = "#1e3a18";
    ctx.fillRect(boxX, boxY, boxW, 4);
    ctx.fillRect(boxX, boxY + boxH - 4, boxW, 4);
    ctx.fillRect(boxX, boxY, 4, boxH);
    ctx.fillRect(boxX + boxW - 4, boxY, 4, boxH);

    ctx.fillStyle = "#f4ffe8";
    ctx.font = "bold 16px Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvasWidth / 2, canvasHeight / 2 - 6);
    ctx.font = "11px Tahoma, sans-serif";
    ctx.fillStyle = "#d7f5b8";
    ctx.fillText("Space or tap center to restart", canvasWidth / 2, canvasHeight / 2 + 16);
    ctx.textAlign = "start";
  }

  function draw() {
    drawGrassBackground();
    drawPixelApple();
    for (let i = 0; i < snake.length; i += 1) {
      drawPixelSnakeSegment(snake[i], i, snake.length);
    }

    if (!scoreEl) {
      ctx.fillStyle = "#f4ffe8";
      ctx.font = "bold 12px Tahoma, sans-serif";
      ctx.fillText("Score: " + score, 8, 16);
    }

    if (isGameOver) {
      drawPixelGameOver();
    }
  }

  function loop(ts) {
    if (!lastTick) {
      lastTick = ts;
    }
    const delta = ts - lastTick;
    if (!isGameOver && delta >= speedMs) {
      update();
      lastTick = ts;
    }
    draw();
    requestAnimationFrame(loop);
  }

  restart();
  requestAnimationFrame(loop);
})();

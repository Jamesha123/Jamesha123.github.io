// Simple Snake game (vanilla JS). Drop-in and self-contained.
(() => {
  const canvas = document.getElementById("snake-canvas");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("snake-score");
  const gameShell = document.querySelector(".game-snake");
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  const narrowViewportQuery = window.matchMedia("(max-width: 900px)");

  function hasMobileParent() {
    try {
      let win = window;
      while (win && win.parent && win !== win.parent) {
        win = win.parent;
        if (win.document.documentElement.classList.contains("mobile-user")) {
          return true;
        }
      }
    } catch (_error) {
      // Ignore cross-origin parent access errors.
    }
    return false;
  }

  function isMobileLikeDevice() {
    if (document.documentElement.classList.contains("is-snake-mobile")) {
      return true;
    }

    if (hasMobileParent()) {
      return true;
    }

    if (new URLSearchParams(window.location.search).get("mobile") === "1") {
      return true;
    }

    if (coarsePointerQuery.matches) {
      return true;
    }

    if (/Android|iPhone|iPad|iPod|Mobile|Tablet|webOS|BlackBerry|IEMobile|Opera Mini|Silk|Kindle/i.test(navigator.userAgent)) {
      return true;
    }

    if (navigator.maxTouchPoints > 0 && narrowViewportQuery.matches) {
      return true;
    }

    return false;
  }

  function detectMobileControls() {
    const mobile = isMobileLikeDevice();
    if (gameShell) {
      gameShell.classList.toggle("is-mobile-controls", mobile);
    }
    if (mobile) {
      document.documentElement.classList.add("is-snake-mobile");
    } else {
      document.documentElement.classList.remove("is-snake-mobile");
    }
    return mobile;
  }

  let useMobileControls = detectMobileControls();

  function watchMobileControlQueries(listener) {
    if (coarsePointerQuery.addEventListener) {
      coarsePointerQuery.addEventListener("change", listener);
      narrowViewportQuery.addEventListener("change", listener);
    } else if (coarsePointerQuery.addListener) {
      coarsePointerQuery.addListener(listener);
      narrowViewportQuery.addListener(listener);
    }
  }

  watchMobileControlQueries(function () {
    useMobileControls = detectMobileControls();
  });

  const TILE = 24;
  const PIX = 3;
  const GRID_UNIT = TILE / 16;
  const MIN_COLS = 3;
  const MIN_ROWS = 2;

  let tilesX = 28;
  let tilesY = 20;

  ctx.imageSmoothingEnabled = false;

  function layoutGrid() {
    const field = canvas.parentElement;
    if (!field) {
      return false;
    }

    const availableW = field.clientWidth;
    const availableH = field.clientHeight;
    const nextCols = Math.max(MIN_COLS, Math.floor(availableW / TILE) - 5);
    const nextRows = Math.max(MIN_ROWS, Math.floor(availableH / TILE) - 5);

    if (nextCols === tilesX && nextRows === tilesY) {
      return false;
    }

    tilesX = nextCols;
    tilesY = nextRows;
    canvas.width = tilesX * TILE;
    canvas.height = tilesY * TILE;
    return true;
  }

  let snake = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let foods = [];
  let score = 0;
  const APPLES_PER_LEVEL = 10;
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
    if (score > 25 && typeof unlockWorldAchievement === "function") {
      unlockWorldAchievement("demo:snake-score-25");
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
        const tapX = ((touchEndX - rect.left) / rect.width) * canvas.width;
        const tapY = ((touchEndY - rect.top) / rect.height) * canvas.height;
        const middleRadius = 70 * GRID_UNIT;

        const distanceFromCenter = Math.sqrt(
          Math.pow(tapX - canvas.width / 2, 2) + Math.pow(tapY - canvas.height / 2, 2)
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

  function isOccupied(x, y) {
    if (snake.some(function (s) {
      return s.x === x && s.y === y;
    })) {
      return true;
    }
    return foods.some(function (f) {
      return f.x === x && f.y === y;
    });
  }

  function getAppleCount() {
    const desired = 1 + Math.floor(score / APPLES_PER_LEVEL);
    const maxFree = tilesX * tilesY - snake.length;
    return Math.max(1, Math.min(desired, Math.max(1, maxFree)));
  }

  function spawnFood() {
    const maxAttempts = tilesX * tilesY * 2;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const f = {
        x: Math.floor(Math.random() * tilesX),
        y: Math.floor(Math.random() * tilesY),
      };
      if (!isOccupied(f.x, f.y)) {
        return f;
      }
    }
    return null;
  }

  function ensureFoodCount() {
    const target = getAppleCount();
    while (foods.length < target) {
      const next = spawnFood();
      if (!next) {
        break;
      }
      foods.push(next);
    }
  }

  function createInitialSnake() {
    const headX = Math.floor(tilesX / 2);
    const headY = Math.floor(tilesY / 2);
    const segments = [];
    for (let i = 0; i < 5; i += 1) {
      segments.push({ x: headX - i, y: headY });
    }
    return segments;
  }

  function restart() {
    snake = createInitialSnake();
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    foods = [];
    setScore(0);
    ensureFoodCount();
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

    const eatenIndex = foods.findIndex(function (f) {
      return f.x === head.x && f.y === head.y;
    });

    if (eatenIndex !== -1) {
      foods.splice(eatenIndex, 1);
      setScore(score + 1);
      if (speedMs > 70) {
        speedMs -= 3;
      }
      ensureFoodCount();
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
      ctx.fillRect(x * TILE + 3 * GRID_UNIT, y * TILE + 5 * GRID_UNIT, PIX, PIX);
    }
    if ((x * 2 + y * 7) % 9 === 0) {
      ctx.fillStyle = light ? GRASS_DARK : GRASS_LIGHT;
      ctx.fillRect(x * TILE + 10 * GRID_UNIT, y * TILE + 8 * GRID_UNIT, PIX, PIX);
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
      ctx.lineTo(x * TILE + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= tilesY; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(canvas.width, y * TILE + 0.5);
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

  function drawPixelApples() {
    foods.forEach(function (apple) {
      blitSprite(APPLE_SPRITE, apple.x, apple.y, APPLE_COLORS);
    });
  }

  function drawEyes(px, py) {
    const u = GRID_UNIT;
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 8 * u, py + 4 * u, PIX, PIX);
    ctx.fillRect(px + 8 * u, py + 8 * u, PIX, PIX);

    ctx.fillStyle = "#111";
    if (direction.x === 1) {
      ctx.fillRect(px + 10 * u, py + 4 * u, PIX, PIX);
      ctx.fillRect(px + 10 * u, py + 8 * u, PIX, PIX);
    } else if (direction.x === -1) {
      ctx.fillRect(px + 6 * u, py + 4 * u, PIX, PIX);
      ctx.fillRect(px + 6 * u, py + 8 * u, PIX, PIX);
    } else if (direction.y === -1) {
      ctx.fillRect(px + 4 * u, py + 6 * u, PIX, PIX);
      ctx.fillRect(px + 8 * u, py + 6 * u, PIX, PIX);
    } else {
      ctx.fillRect(px + 4 * u, py + 10 * u, PIX, PIX);
      ctx.fillRect(px + 8 * u, py + 10 * u, PIX, PIX);
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
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boxW = Math.round(176 * GRID_UNIT);
    const boxH = Math.round(72 * GRID_UNIT);
    const boxX = (canvas.width - boxW) / 2;
    const boxY = (canvas.height - boxH) / 2;

    ctx.fillStyle = "#2f5829";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = "#1e3a18";
    ctx.fillRect(boxX, boxY, boxW, 4);
    ctx.fillRect(boxX, boxY + boxH - 4, boxW, 4);
    ctx.fillRect(boxX, boxY, 4, boxH);
    ctx.fillRect(boxX + boxW - 4, boxY, 4, boxH);

    ctx.fillStyle = "#f4ffe8";
    ctx.font = "bold " + Math.round(16 * GRID_UNIT) + "px Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 + 4);
    ctx.textAlign = "start";
  }

  function draw() {
    drawGrassBackground();
    drawPixelApples();
    for (let i = 0; i < snake.length; i += 1) {
      drawPixelSnakeSegment(snake[i], i, snake.length);
    }

    if (!scoreEl) {
      ctx.fillStyle = "#f4ffe8";
      ctx.font = "bold " + Math.round(12 * GRID_UNIT) + "px Tahoma, sans-serif";
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

  layoutGrid();
  restart();

  if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
    const resizeObserver = new ResizeObserver(function () {
      if (layoutGrid()) {
        restart();
      }
    });
    resizeObserver.observe(canvas.parentElement);
  } else {
    window.addEventListener("resize", function () {
      if (layoutGrid()) {
        restart();
      }
    });
  }

  requestAnimationFrame(loop);
})();

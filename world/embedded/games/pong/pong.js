// Pong Game Demo
(() => {
  const ARENA_W = 672;
  const ARENA_H = 288;
  const WIN_SCORE = 7;

  let gameRunning = false;
  let gamePaused = false;
  let animationId = null;
  let gameOver = false;
  let difficulty = "medium";

  let canvas;
  let ctx;
  let ball;
  let playerPaddle;
  let computerPaddle;
  let playerScore = 0;
  let computerScore = 0;

  let touchStartY = 0;

  const retroTheme = !!document.querySelector(".game-pong");

  let statusEl = document.getElementById("pong-status");
  let playerScoreEl = document.getElementById("pong-player-score");
  let computerScoreEl = document.getElementById("pong-computer-score");
  let startBtn = document.getElementById("pong-start-btn");
  let resetBtn = document.getElementById("pong-reset-btn");
  let difficultySelect = document.getElementById("pong-difficulty");

  function setStatus(message, tone) {
    if (!statusEl) {
      return;
    }

    if (!message || tone === "running") {
      statusEl.textContent = "";
      statusEl.hidden = true;
      statusEl.classList.remove("is-running", "is-win", "is-lose");
      return;
    }

    statusEl.hidden = false;
    statusEl.textContent = message;

    if (!retroTheme) {
      if (tone === "win") {
        statusEl.style.color = "#2ecc71";
      } else if (tone === "lose") {
        statusEl.style.color = "#e74c3c";
      } else {
        statusEl.style.color = "#2ecc71";
      }
      return;
    }

    statusEl.classList.remove("is-running", "is-win", "is-lose");
    if (tone === "win") {
      statusEl.classList.add("is-win");
    } else if (tone === "lose") {
      statusEl.classList.add("is-lose");
    }
  }

  function layoutObjects() {
    const w = canvas.width;
    const h = canvas.height;
    const paddleW = Math.max(10, Math.round(w * 0.016));
    const paddleH = Math.max(64, Math.round(h * 0.32));
    const margin = Math.round(w * 0.035);
    const ballSize = Math.max(10, Math.round(h * 0.048));
    const ballSpeed = Math.max(2.5, w * 0.0045);

    ball.size = ballSize;
    ball.half = ballSize / 2;
    ball.x = w / 2;
    ball.y = h / 2;
    if (!ball.dx && !ball.dy) {
      ball.dx = ballSpeed;
      ball.dy = ballSpeed * 0.85;
    } else {
      ball.dx = ball.dx > 0 ? ballSpeed : -ballSpeed;
      ball.dy = ball.dy > 0 ? ballSpeed * 0.85 : -(ballSpeed * 0.85);
    }

    playerPaddle.width = paddleW;
    playerPaddle.height = paddleH;
    playerPaddle.x = margin;
    playerPaddle.y = h / 2 - paddleH / 2;
    playerPaddle.speed = Math.max(4, h * 0.022);

    computerPaddle.width = paddleW;
    computerPaddle.height = paddleH;
    computerPaddle.x = w - margin - paddleW;
    computerPaddle.y = h / 2 - paddleH / 2;
    computerPaddle.speed = Math.max(3, h * 0.018);
  }

  function initCanvas() {
    canvas = document.getElementById("pong-canvas");
    if (!canvas) {
      return false;
    }

    ctx = canvas.getContext("2d");
    canvas.width = ARENA_W;
    canvas.height = ARENA_H;
    ctx.imageSmoothingEnabled = false;

    playerScoreEl = document.getElementById("pong-player-score");
    computerScoreEl = document.getElementById("pong-computer-score");
    statusEl = document.getElementById("pong-status");
    startBtn = document.getElementById("pong-start-btn");
    resetBtn = document.getElementById("pong-reset-btn");
    difficultySelect = document.getElementById("pong-difficulty");

    ball = { x: 0, y: 0, dx: 0, dy: 0, size: 12, half: 6 };
    playerPaddle = { x: 0, y: 0, width: 10, height: 80, dy: 0, speed: 5 };
    computerPaddle = {
      x: 0,
      y: 0,
      width: 10,
      height: 80,
      dy: 0,
      speed: 4,
      reactionTime: 0.8,
    };

    layoutObjects();
    return true;
  }

  function init() {
    if (!initCanvas()) {
      return;
    }
    resetGame();
    setupEventListeners();
    draw();
  }

  function setupEventListeners() {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    if (startBtn) {
      startBtn.addEventListener("click", startGame);
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", resetGame);
    }
    if (difficultySelect) {
      difficultySelect.addEventListener("change", updateDifficulty);
    }
  }

  function handleKeyDown(e) {
    if (!gameRunning) {
      return;
    }
    switch (e.key.toLowerCase()) {
      case "w":
        playerPaddle.dy = -playerPaddle.speed;
        break;
      case "s":
        playerPaddle.dy = playerPaddle.speed;
        break;
      default:
        break;
    }
  }

  function handleKeyUp(e) {
    if (!gameRunning) {
      return;
    }
    switch (e.key.toLowerCase()) {
      case "w":
      case "s":
        playerPaddle.dy = 0;
        break;
      default:
        break;
    }
  }

  function handleTouchStart(e) {
    e.preventDefault();
    if (!gameRunning) {
      return;
    }
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    if (!gameRunning) {
      return;
    }
    playerPaddle.dy = 0;
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (!gameRunning) {
      return;
    }

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = ((touch.clientY - rect.top) / rect.height) * canvas.height;
    const targetY = touchY - playerPaddle.height / 2;
    const paddleCenter = playerPaddle.y + playerPaddle.height / 2;
    const error = targetY - paddleCenter;

    if (Math.abs(error) > 5) {
      playerPaddle.dy = error < 0 ? -playerPaddle.speed : playerPaddle.speed;
    } else {
      playerPaddle.dy = 0;
    }
  }

  function updateDifficulty() {
    if (difficultySelect) {
      difficulty = difficultySelect.value;
    }

    switch (difficulty) {
      case "easy":
        computerPaddle.speed = Math.max(2, canvas.height * 0.012);
        computerPaddle.reactionTime = 0.3;
        break;
      case "hard":
        computerPaddle.speed = Math.max(5, canvas.height * 0.028);
        computerPaddle.reactionTime = 1.2;
        break;
      default:
        computerPaddle.speed = Math.max(3, canvas.height * 0.018);
        computerPaddle.reactionTime = 0.8;
        break;
    }
  }

  function startGame() {
    if (gameRunning) {
      return;
    }

    if (gameOver) {
      resetGame();
      return;
    }

    gameRunning = true;
    gamePaused = false;
    gameOver = false;
    setStatus("Playing", "running");

    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Start";
    }
    if (resetBtn) {
      resetBtn.disabled = false;
    }

    gameLoop();
  }

  function resetGame() {
    gameRunning = false;
    gamePaused = false;
    gameOver = false;

    layoutObjects();
    updateDifficulty();

    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    const speed = Math.abs(ball.dx) || canvas.width * 0.0045;
    ball.dx = speed;
    ball.dy = speed * 0.85;

    playerPaddle.y = canvas.height / 2 - playerPaddle.height / 2;
    computerPaddle.y = canvas.height / 2 - computerPaddle.height / 2;
    playerPaddle.dy = 0;
    computerPaddle.dy = 0;

    playerScore = 0;
    computerScore = 0;
    updateScores();

    setStatus("", "");

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = retroTheme ? "Start" : "Start Game";
    }
    if (resetBtn) {
      resetBtn.disabled = true;
    }

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    draw();
  }

  function gameLoop() {
    if (!gameRunning || gamePaused || gameOver) {
      return;
    }

    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  function update() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y - ball.half <= 0 || ball.y + ball.half >= canvas.height) {
      ball.dy = -ball.dy;
    }

    if (
      ball.dx < 0 &&
      ball.x - ball.half <= playerPaddle.x + playerPaddle.width &&
      ball.x - ball.half >= playerPaddle.x &&
      ball.y + ball.half >= playerPaddle.y &&
      ball.y - ball.half <= playerPaddle.y + playerPaddle.height
    ) {
      ball.dx = Math.abs(ball.dx);
      ball.dy += playerPaddle.dy * 0.5;
    }

    if (
      ball.dx > 0 &&
      ball.x + ball.half >= computerPaddle.x &&
      ball.x + ball.half <= computerPaddle.x + computerPaddle.width &&
      ball.y + ball.half >= computerPaddle.y &&
      ball.y - ball.half <= computerPaddle.y + computerPaddle.height
    ) {
      ball.dx = -Math.abs(ball.dx);
      ball.dy += computerPaddle.dy * 0.5;
    }

    if (ball.x < 0) {
      computerScore += 1;
      updateScores();
      checkGameOver();
      if (!gameOver) {
        resetBall();
      }
    } else if (ball.x > canvas.width) {
      playerScore += 1;
      updateScores();
      checkGameOver();
      if (!gameOver) {
        resetBall();
      }
    }

    playerPaddle.y += playerPaddle.dy;
    if (playerPaddle.y < 0) {
      playerPaddle.y = 0;
    }
    if (playerPaddle.y + playerPaddle.height > canvas.height) {
      playerPaddle.y = canvas.height - playerPaddle.height;
    }

    const paddleCenter = computerPaddle.y + computerPaddle.height / 2;
    const ballDistance = Math.abs(ball.x - computerPaddle.x);

    if (ball.dx > 0 && ballDistance < canvas.width * computerPaddle.reactionTime) {
      const error = ball.y - paddleCenter;
      if (Math.abs(error) > 5) {
        computerPaddle.dy = error < 0 ? -computerPaddle.speed : computerPaddle.speed;
      } else {
        computerPaddle.dy = 0;
      }
    } else if (difficulty === "hard") {
      const centerError = canvas.height / 2 - paddleCenter;
      if (Math.abs(centerError) > 10) {
        computerPaddle.dy = centerError > 0 ? computerPaddle.speed * 0.5 : -computerPaddle.speed * 0.5;
      } else {
        computerPaddle.dy = 0;
      }
    } else {
      computerPaddle.dy = 0;
    }

    computerPaddle.y += computerPaddle.dy;
    if (computerPaddle.y < 0) {
      computerPaddle.y = 0;
    }
    if (computerPaddle.y + computerPaddle.height > canvas.height) {
      computerPaddle.y = canvas.height - computerPaddle.height;
    }
  }

  function checkGameOver() {
    if (playerScore >= WIN_SCORE) {
      gameOver = true;
      gameRunning = false;
      setStatus("You Win!", "win");
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "Play Again";
      }
    } else if (computerScore >= WIN_SCORE) {
      gameOver = true;
      gameRunning = false;
      setStatus("You Lose", "lose");
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "Play Again";
      }
    }
  }

  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    const speed = Math.abs(ball.dx);
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * speed;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * speed * 0.85;
  }

  function updateScores() {
    if (playerScoreEl) {
      playerScoreEl.textContent = String(playerScore);
    }
    if (computerScoreEl) {
      computerScoreEl.textContent = String(computerScore);
    }
  }

  function drawRetroField() {
    const w = canvas.width;
    const h = canvas.height;
    const laneInset = Math.max(18, Math.round(w * 0.055));
    const wallThickness = Math.max(3, Math.round(h * 0.014));

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, wallThickness);
    ctx.fillRect(0, h - wallThickness, w, wallThickness);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(laneInset + 0.5, wallThickness);
    ctx.lineTo(laneInset + 0.5, h - wallThickness);
    ctx.moveTo(w - laneInset + 0.5, wallThickness);
    ctx.lineTo(w - laneInset + 0.5, h - wallThickness);
    ctx.stroke();

    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(w / 2 + 0.5, wallThickness);
    ctx.lineTo(w / 2 + 0.5, h - wallThickness);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "bold 11px Tahoma, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("YOU", w * 0.25, wallThickness + 6);
    ctx.fillText("CPU", w * 0.75, wallThickness + 6);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#fff";
    ctx.fillRect(
      Math.round(ball.x - ball.half),
      Math.round(ball.y - ball.half),
      ball.size,
      ball.size
    );

    ctx.fillRect(
      Math.round(playerPaddle.x),
      Math.round(playerPaddle.y),
      playerPaddle.width,
      playerPaddle.height
    );
    ctx.fillRect(
      Math.round(computerPaddle.x),
      Math.round(computerPaddle.y),
      computerPaddle.width,
      computerPaddle.height
    );
  }

  function drawLegacyField() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.half, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);
    ctx.fillRect(computerPaddle.x, computerPaddle.y, computerPaddle.width, computerPaddle.height);
  }

  function draw() {
    if (retroTheme) {
      drawRetroField();
    } else {
      drawLegacyField();
    }
  }

  init();
})();

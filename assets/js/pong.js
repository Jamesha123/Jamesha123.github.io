// Pong Game Demo
(() => {
  // Game state
  let gameRunning = false;
  let gamePaused = false;
  let animationId = null;

  // Canvas and context
  const canvas = document.getElementById('pong-canvas');
  const ctx = canvas.getContext('2d');

  // Game objects
  const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    dx: 4,
    dy: 4,
    radius: 8
  };

  const playerPaddle = {
    x: 20,
    y: canvas.height / 2 - 40,
    width: 10,
    height: 80,
    dy: 0,
    speed: 5
  };

  const computerPaddle = {
    x: canvas.width - 30,
    y: canvas.height / 2 - 40,
    width: 10,
    height: 80,
    dy: 0,
    speed: 4
  };

  // Scores
  let playerScore = 0;
  let computerScore = 0;

  // Touch/swipe support
  let touchStartY = 0;
  let touchEndY = 0;

  // DOM elements
  const statusEl = document.getElementById('pong-status');
  const playerScoreEl = document.getElementById('player-score');
  const computerScoreEl = document.getElementById('computer-score');
  const startBtn = document.getElementById('pong-start-btn');
  const pauseBtn = document.getElementById('pong-pause-btn');
  const resetBtn = document.getElementById('pong-reset-btn');

  // Initialize game
  function init() {
    resetGame();
    setupEventListeners();
    draw();
  }

  // Setup event listeners
  function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Touch controls
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Button controls
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', resetGame);
  }

  // Handle key down
  function handleKeyDown(e) {
    if (!gameRunning) return;
    
    switch(e.key.toLowerCase()) {
      case 'w':
        playerPaddle.dy = -playerPaddle.speed;
        break;
      case 's':
        playerPaddle.dy = playerPaddle.speed;
        break;
    }
  }

  // Handle key up
  function handleKeyUp(e) {
    if (!gameRunning) return;
    
    switch(e.key.toLowerCase()) {
      case 'w':
      case 's':
        playerPaddle.dy = 0;
        break;
    }
  }

  // Handle touch start
  function handleTouchStart(e) {
    e.preventDefault();
    if (!gameRunning) return;
    const touch = e.touches[0];
    touchStartY = touch.clientY;
  }

  // Handle touch end
  function handleTouchEnd(e) {
    e.preventDefault();
    if (!gameRunning) return;
    const touch = e.changedTouches[0];
    touchEndY = touch.clientY;
    
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;
    
    if (Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY < 0) {
        // Swipe up
        playerPaddle.dy = -playerPaddle.speed;
        setTimeout(() => { playerPaddle.dy = 0; }, 100);
      } else {
        // Swipe down
        playerPaddle.dy = playerPaddle.speed;
        setTimeout(() => { playerPaddle.dy = 0; }, 100);
      }
    }
  }

  // Handle touch move
  function handleTouchMove(e) {
    e.preventDefault();
  }

  // Start game
  function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gamePaused = false;
    statusEl.textContent = 'Game Running!';
    statusEl.style.color = '#2ecc71';
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    
    gameLoop();
  }

  // Toggle pause
  function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    
    if (gamePaused) {
      statusEl.textContent = 'Game Paused';
      statusEl.style.color = '#f39c12';
      pauseBtn.textContent = 'Resume';
      cancelAnimationFrame(animationId);
    } else {
      statusEl.textContent = 'Game Running!';
      statusEl.style.color = '#2ecc71';
      pauseBtn.textContent = 'Pause';
      gameLoop();
    }
  }

  // Reset game
  function resetGame() {
    gameRunning = false;
    gamePaused = false;
    
    // Reset ball
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 4;
    ball.dy = 4;
    
    // Reset paddles
    playerPaddle.y = canvas.height / 2 - 40;
    computerPaddle.y = canvas.height / 2 - 40;
    playerPaddle.dy = 0;
    computerPaddle.dy = 0;
    
    // Reset scores
    playerScore = 0;
    computerScore = 0;
    updateScores();
    
    // Reset UI
    statusEl.textContent = 'Click "Start Game" to begin!';
    statusEl.style.color = '#2ecc71';
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    resetBtn.disabled = true;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    draw();
  }

  // Game loop
  function gameLoop() {
    if (!gameRunning || gamePaused) return;
    
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }

  // Update game state
  function update() {
    // Update ball position
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Ball collision with top and bottom walls
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
      ball.dy = -ball.dy;
    }
    
    // Ball collision with paddles
    if (ball.x - ball.radius <= playerPaddle.x + playerPaddle.width &&
        ball.y >= playerPaddle.y && ball.y <= playerPaddle.y + playerPaddle.height) {
      ball.dx = Math.abs(ball.dx);
      // Add some spin based on paddle movement
      ball.dy += playerPaddle.dy * 0.5;
    }
    
    if (ball.x + ball.radius >= computerPaddle.x &&
        ball.y >= computerPaddle.y && ball.y <= computerPaddle.y + computerPaddle.height) {
      ball.dx = -Math.abs(ball.dx);
      // Add some spin based on paddle movement
      ball.dy += computerPaddle.dy * 0.5;
    }
    
    // Ball out of bounds
    if (ball.x < 0) {
      computerScore++;
      updateScores();
      resetBall();
    } else if (ball.x > canvas.width) {
      playerScore++;
      updateScores();
      resetBall();
    }
    
    // Update player paddle
    playerPaddle.y += playerPaddle.dy;
    if (playerPaddle.y < 0) playerPaddle.y = 0;
    if (playerPaddle.y + playerPaddle.height > canvas.height) {
      playerPaddle.y = canvas.height - playerPaddle.height;
    }
    
    // Update computer paddle (simple AI)
    const paddleCenter = computerPaddle.y + computerPaddle.height / 2;
    const ballCenter = ball.y;
    
    if (ballCenter < paddleCenter - 10) {
      computerPaddle.dy = -computerPaddle.speed;
    } else if (ballCenter > paddleCenter + 10) {
      computerPaddle.dy = computerPaddle.speed;
    } else {
      computerPaddle.dy = 0;
    }
    
    computerPaddle.y += computerPaddle.dy;
    if (computerPaddle.y < 0) computerPaddle.y = 0;
    if (computerPaddle.y + computerPaddle.height > canvas.height) {
      computerPaddle.y = canvas.height - computerPaddle.height;
    }
  }

  // Reset ball to center
  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * 4;
  }

  // Update scores display
  function updateScores() {
    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;
  }

  // Draw game
  function draw() {
    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);
    ctx.fillRect(computerPaddle.x, computerPaddle.y, computerPaddle.width, computerPaddle.height);
  }

  // Initialize the game
  init();
})();

// Pong Game Demo
(() => {
  // Game state
  let gameRunning = false;
  let gamePaused = false;
  let animationId = null;
  let gameOver = false;
  let difficulty = 'medium'; // easy, medium, hard

  // Canvas and context
  let canvas;
  let ctx;

  // Game objects
  let ball;
  let playerPaddle;
  let computerPaddle;

  // Scores
  let playerScore = 0;
  let computerScore = 0;

  // Touch/swipe support
  let touchStartY = 0;
  let touchEndY = 0;

  // DOM elements
  let statusEl = document.getElementById('pong-status');
  let playerScoreEl = document.getElementById('pong-player-score');
  let computerScoreEl = document.getElementById('pong-computer-score');
  let startBtn = document.getElementById('pong-start-btn');
  let resetBtn = document.getElementById('pong-reset-btn');
  let difficultySelect = document.getElementById('pong-difficulty');

  // Initialize canvas and game objects
  function initCanvas() {
    canvas = document.getElementById('pong-canvas');
    ctx = canvas.getContext('2d');
    
    // Re-get DOM elements in case they weren't available before
    playerScoreEl = document.getElementById('pong-player-score');
    computerScoreEl = document.getElementById('pong-computer-score');
    statusEl = document.getElementById('pong-status');
    startBtn = document.getElementById('pong-start-btn');
    resetBtn = document.getElementById('pong-reset-btn');
    difficultySelect = document.getElementById('pong-difficulty');
    
    console.log('DOM elements found:', {
      canvas: !!canvas,
      playerScoreEl: !!playerScoreEl,
      computerScoreEl: !!computerScoreEl,
      statusEl: !!statusEl
    });
    
    if (!canvas || !ctx) {
      console.error('Canvas not found or context not available');
      return false;
    }
    
    // Initialize game objects
    ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      dx: 2,
      dy: 2,
      radius: 8
    };

    playerPaddle = {
      x: 20,
      y: canvas.height / 2 - 40,
      width: 10,
      height: 80,
      dy: 0,
      speed: 5
    };

    computerPaddle = {
      x: canvas.width - 30,
      y: canvas.height / 2 - 40,
      width: 10,
      height: 80,
      dy: 0,
      speed: 4,
      reactionTime: 0.8
    };
    
    return true;
  }

  // Initialize game
  function init() {
    if (!initCanvas()) {
      console.error('Failed to initialize canvas');
      return;
    }
    
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
    resetBtn.addEventListener('click', resetGame);
    
    // Difficulty selection
    difficultySelect.addEventListener('change', updateDifficulty);
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
    playerPaddle.dy = 0; // Stop paddle movement
  }

  // Handle touch move - direct paddle control
  function handleTouchMove(e) {
    e.preventDefault();
    if (!gameRunning) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    
    // Convert touch position to paddle position
    const targetY = touchY - playerPaddle.height / 2;
    
    // Smooth movement towards touch position
    const paddleCenter = playerPaddle.y + playerPaddle.height / 2;
    const error = targetY - paddleCenter;
    
    if (Math.abs(error) > 5) {
      if (error < 0) {
        playerPaddle.dy = -playerPaddle.speed;
      } else {
        playerPaddle.dy = playerPaddle.speed;
      }
    } else {
      playerPaddle.dy = 0;
    }
  }

  // Update difficulty settings
  function updateDifficulty() {
    difficulty = difficultySelect.value;
    
    switch(difficulty) {
      case 'easy':
        computerPaddle.speed = 2;
        computerPaddle.reactionTime = 0.3;
        break;
      case 'medium':
        computerPaddle.speed = 4;
        computerPaddle.reactionTime = 0.8;
        break;
      case 'hard':
        computerPaddle.speed = 6;
        computerPaddle.reactionTime = 1.2;
        break;
    }
  }

  // Start game
  function startGame() {
    if (gameRunning) return;
    
    // If game is over, reset first
    if (gameOver) {
      resetGame();
      return;
    }
    
    gameRunning = true;
    gamePaused = false;
    gameOver = false;
    statusEl.textContent = 'Game Running!';
    statusEl.style.color = '#2ecc71';
    
    startBtn.disabled = true;
    startBtn.textContent = 'Start Game';
    resetBtn.disabled = false;
    
    gameLoop();
  }


  // Reset game
  function resetGame() {
    gameRunning = false;
    gamePaused = false;
    gameOver = false;
    
    // Update difficulty settings
    updateDifficulty();
    
    // Reset ball
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = 2;
    ball.dy = 2;
    
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
    resetBtn.disabled = true;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    draw();
  }

  // Game loop
  function gameLoop() {
    if (!gameRunning || gamePaused || gameOver) return;
    
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
    
    // Ball collision with player paddle (left side)
    if (ball.dx < 0 && // Ball moving left
        ball.x - ball.radius <= playerPaddle.x + playerPaddle.width &&
        ball.x - ball.radius >= playerPaddle.x &&
        ball.y + ball.radius >= playerPaddle.y &&
        ball.y - ball.radius <= playerPaddle.y + playerPaddle.height) {
      ball.dx = Math.abs(ball.dx); // Reverse direction
      // Add some spin based on paddle movement
      ball.dy += playerPaddle.dy * 0.5;
    }
    
    // Ball collision with computer paddle (right side)
    if (ball.dx > 0 && // Ball moving right
        ball.x + ball.radius >= computerPaddle.x &&
        ball.x + ball.radius <= computerPaddle.x + computerPaddle.width &&
        ball.y + ball.radius >= computerPaddle.y &&
        ball.y - ball.radius <= computerPaddle.y + computerPaddle.height) {
      console.log('Computer paddle collision');
      ball.dx = -Math.abs(ball.dx); // Reverse direction
      // Add some spin based on paddle movement
      ball.dy += computerPaddle.dy * 0.5;
    }
    
    // Ball out of bounds
    if (ball.x < 0) {
      computerScore++;
      updateScores();
      checkGameOver();
      if (!gameOver) resetBall();
    } else if (ball.x > canvas.width) {
      playerScore++;
      updateScores();
      checkGameOver();
      if (!gameOver) resetBall();
    }
    
    // Update player paddle
    playerPaddle.y += playerPaddle.dy;
    if (playerPaddle.y < 0) playerPaddle.y = 0;
    if (playerPaddle.y + playerPaddle.height > canvas.height) {
      playerPaddle.y = canvas.height - playerPaddle.height;
    }
    
    // Update computer paddle (AI with difficulty levels)
    const paddleCenter = computerPaddle.y + computerPaddle.height / 2;
    const ballCenter = ball.y;
    const ballDistance = Math.abs(ball.x - computerPaddle.x);
    
    // Only react when ball is coming towards computer paddle
    if (ball.dx > 0 && ballDistance < canvas.width * computerPaddle.reactionTime) {
      const targetY = ballCenter;
      const error = targetY - paddleCenter;
      
      if (Math.abs(error) > 5) {
        if (error < 0) {
          computerPaddle.dy = -computerPaddle.speed;
        } else {
          computerPaddle.dy = computerPaddle.speed;
        }
      } else {
        computerPaddle.dy = 0;
      }
    } else {
      // Move towards center when ball is far away (harder difficulty)
      if (difficulty === 'hard') {
        const centerY = canvas.height / 2;
        const centerError = centerY - paddleCenter;
        if (Math.abs(centerError) > 10) {
          computerPaddle.dy = centerError > 0 ? computerPaddle.speed * 0.5 : -computerPaddle.speed * 0.5;
        } else {
          computerPaddle.dy = 0;
        }
      } else {
        computerPaddle.dy = 0;
      }
    }
    
    computerPaddle.y += computerPaddle.dy;
    if (computerPaddle.y < 0) computerPaddle.y = 0;
    if (computerPaddle.y + computerPaddle.height > canvas.height) {
      computerPaddle.y = canvas.height - computerPaddle.height;
    }
  }

  // Check if game is over
  function checkGameOver() {
    if (playerScore >= 7) {
      gameOver = true;
      gameRunning = false;
      statusEl.textContent = 'You Win! Congratulations!';
      statusEl.style.color = '#2ecc71';
      startBtn.disabled = false;
      startBtn.textContent = 'Play Again';
    } else if (computerScore >= 7) {
      gameOver = true;
      gameRunning = false;
      statusEl.textContent = 'You Lose! Better luck next time!';
      statusEl.style.color = '#e74c3c';
      startBtn.disabled = false;
      startBtn.textContent = 'Play Again';
    }
  }

  // Reset ball to center
  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 2;
    ball.dy = (Math.random() > 0.5 ? 1 : -1) * 2;
  }

  // Update scores display
  function updateScores() {
    // Force update by getting elements again
    const playerEl = document.getElementById('pong-player-score');
    const computerEl = document.getElementById('pong-computer-score');
    
    if (playerEl) {
      playerEl.textContent = playerScore;
    } else {
      console.error('Player score element not found!');
    }
    
    if (computerEl) {
      computerEl.textContent = computerScore;
    } else {
      console.error('Computer score element not found!');
    }
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

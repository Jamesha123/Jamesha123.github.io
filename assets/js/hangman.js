// Hangman Game Demo
(() => {
  // Game state
  let currentWord = '';
  let guessedLetters = [];
  let wrongGuesses = 0;
  let gameOver = false;
  let gameWon = false;

  // 50 random words for the game
  const words = [
    'JAVASCRIPT', 'PROGRAMMING', 'COMPUTER', 'ALGORITHM', 'FUNCTION',
    'VARIABLE', 'CONDITION', 'ITERATION', 'RECURSION', 'DATABASE',
    'NETWORK', 'SECURITY', 'ENCRYPTION', 'DECRYPTION', 'AUTHENTICATION',
    'FRAMEWORK', 'LIBRARY', 'INTERFACE', 'IMPLEMENTATION', 'OPTIMIZATION',
    'DEBUGGING', 'TESTING', 'DEPLOYMENT', 'MAINTENANCE', 'DOCUMENTATION',
    'VERSION', 'CONTROL', 'REPOSITORY', 'BRANCH', 'COMMIT',
    'MERGE', 'CONFLICT', 'RESOLUTION', 'PULL', 'REQUEST',
    'CONTINUOUS', 'INTEGRATION', 'AUTOMATION', 'PIPELINE', 'WORKFLOW',
    'MICROSERVICES', 'CONTAINER', 'ORCHESTRATION', 'SCALABILITY', 'PERFORMANCE',
    'MONITORING', 'LOGGING', 'ANALYTICS', 'METRICS', 'DASHBOARD'
  ];

  // DOM elements
  const container = document.getElementById('hangman-container');
  const gameStatus = document.getElementById('hangman-status');
  const wordDisplay = document.getElementById('word-display');
  const wrongCount = document.getElementById('wrong-count');
  const hangmanDrawing = document.getElementById('hangman-drawing');
  const letterButtons = document.getElementById('letter-buttons');
  const newGameBtn = document.getElementById('hangman-new-game-btn');
  const hintBtn = document.getElementById('hangman-hint-btn');

  // Base gallows (always shown)
  const baseGallows = '   +---+\n   |   |\n       |\n       |\n       |\n       |\n=========';
  
  // Body parts to add to gallows (progressive)
  const bodyParts = [
    '', // 0 wrong guesses - just gallows
    '   O   |', // 1 - head
    '   O   |\n   |   |', // 2 - head + body
    '   O   |\n   |   |\n  /|   |', // 3 - head + body + left arm
    '   O   |\n   |   |\n  /|\\  |', // 4 - head + body + both arms
    '   O   |\n   |   |\n  /|\\  |\n  /    |', // 5 - head + body + both arms + left leg
    '   O   |\n   |   |\n  /|\\  |\n  / \\  |'  // 6 - head + body + both arms + both legs (game over)
  ];

  // Build complete hangman drawing
  function buildHangmanDrawing() {
    const gallowsLines = baseGallows.split('\n');
    const bodyPart = bodyParts[Math.min(wrongGuesses, 6)];
    
    if (bodyPart) {
      // Replace the empty lines with body parts
      const bodyLines = bodyPart.split('\n');
      for (let i = 0; i < bodyLines.length; i++) {
        if (gallowsLines[2 + i]) {
          gallowsLines[2 + i] = bodyLines[i];
        }
      }
    }
    
    return gallowsLines.join('\n');
  }

  // Initialize game
  function initGame() {
    currentWord = words[Math.floor(Math.random() * words.length)];
    guessedLetters = [];
    wrongGuesses = 0;
    gameOver = false;
    gameWon = false;
    
    updateDisplay();
    createLetterButtons();
    updateGameStatus();
  }

  // Create letter buttons
  function createLetterButtons() {
    letterButtons.innerHTML = '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let letter of alphabet) {
      const button = document.createElement('button');
      button.textContent = letter;
      button.className = 'button';
      button.style.cssText = 'margin: 2px; width: 40px; height: 40px; font-size: 14px;';
      button.addEventListener('click', () => guessLetter(letter));
      letterButtons.appendChild(button);
    }
  }

  // Guess a letter
  function guessLetter(letter) {
    if (gameOver || guessedLetters.includes(letter)) return;
    
    guessedLetters.push(letter);
    
    if (currentWord.includes(letter)) {
      // Correct guess
      if (checkWin()) {
        gameWon = true;
        gameOver = true;
        updateGameStatus();
      }
    } else {
      // Wrong guess
      wrongGuesses++;
      if (wrongGuesses >= 6) {
        gameOver = true;
        updateGameStatus();
      }
    }
    
    updateDisplay();
  }

  // Check if player won
  function checkWin() {
    return currentWord.split('').every(letter => guessedLetters.includes(letter));
  }

  // Update display
  function updateDisplay() {
    // Update word display
    wordDisplay.textContent = currentWord.split('').map(letter => 
      guessedLetters.includes(letter) ? letter : '_'
    ).join(' ');
    
    // Update wrong count
    wrongCount.textContent = wrongGuesses;
    
    // Update hangman drawing
    hangmanDrawing.textContent = buildHangmanDrawing();
    
    // Update letter buttons
    const buttons = letterButtons.querySelectorAll('button');
    buttons.forEach(button => {
      const letter = button.textContent;
      if (guessedLetters.includes(letter)) {
        button.disabled = true;
        button.style.opacity = '0.5';
        if (currentWord.includes(letter)) {
          button.style.backgroundColor = '#2ecc71';
        } else {
          button.style.backgroundColor = '#e74c3c';
        }
      } else {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.backgroundColor = '';
      }
    });
  }

  // Update game status
  function updateGameStatus() {
    if (gameWon) {
      gameStatus.textContent = 'Congratulations! You won!';
      gameStatus.style.color = '#2ecc71';
    } else if (gameOver) {
      gameStatus.textContent = `Game Over! The word was: ${currentWord}`;
      gameStatus.style.color = '#e74c3c';
    } else {
      gameStatus.textContent = 'Guess a letter!';
      gameStatus.style.color = '#2ecc71';
    }
  }

  // Show hint
  function showHint() {
    if (gameOver) return;
    
    const unguessedLetters = currentWord.split('').filter(letter => 
      !guessedLetters.includes(letter)
    );
    
    if (unguessedLetters.length > 0) {
      const randomLetter = unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];
      guessLetter(randomLetter);
    }
  }

  // Event listeners
  newGameBtn.addEventListener('click', initGame);
  hintBtn.addEventListener('click', showHint);

  // Initialize game
  initGame();
})();

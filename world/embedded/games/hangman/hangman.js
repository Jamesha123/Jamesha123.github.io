// Hangman Game Demo
(() => {
  let currentWord = "";
  let guessedLetters = [];
  let wrongGuesses = 0;
  let gameOver = false;
  let gameWon = false;

  const MAX_WRONG = 6;
  const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

  const words = [
    "JAVASCRIPT", "PROGRAMMING", "COMPUTER", "ALGORITHM", "FUNCTION",
    "VARIABLE", "CONDITION", "ITERATION", "RECURSION", "DATABASE",
    "NETWORK", "SECURITY", "ENCRYPTION", "DECRYPTION", "AUTHENTICATION",
    "FRAMEWORK", "LIBRARY", "INTERFACE", "IMPLEMENTATION", "OPTIMIZATION",
    "DEBUGGING", "TESTING", "DEPLOYMENT", "MAINTENANCE", "DOCUMENTATION",
    "VERSION", "CONTROL", "REPOSITORY", "BRANCH", "COMMIT",
    "MERGE", "CONFLICT", "RESOLUTION", "PULL", "REQUEST",
    "CONTINUOUS", "INTEGRATION", "AUTOMATION", "PIPELINE", "WORKFLOW",
    "MICROSERVICES", "CONTAINER", "ORCHESTRATION", "SCALABILITY", "PERFORMANCE",
    "MONITORING", "LOGGING", "ANALYTICS", "METRICS", "DASHBOARD",
  ];

  const gameStatus = document.getElementById("hangman-status");
  const wordDisplay = document.getElementById("word-display");
  const wrongCount = document.getElementById("wrong-count");
  const hangmanDrawing = document.getElementById("hangman-drawing");
  const letterButtons = document.getElementById("letter-buttons");
  const newGameBtn = document.getElementById("hangman-new-game-btn");
  const hintBtn = document.getElementById("hangman-hint-btn");

  if (!gameStatus || !wordDisplay || !hangmanDrawing || !letterButtons) {
    return;
  }

  const spriteBase = getSpriteBaseUrl();
  let hangmanSprite = document.getElementById("hangman-sprite");
  if (!hangmanSprite) {
    hangmanSprite = document.createElement("img");
    hangmanSprite.id = "hangman-sprite";
    hangmanSprite.className = "hangman-sprite";
    hangmanSprite.alt = "Hangman drawing";
    hangmanDrawing.textContent = "";
    hangmanDrawing.appendChild(hangmanSprite);
  }

  const letterButtonMap = {};

  function getSpriteBaseUrl() {
    const script =
      document.currentScript ||
      document.querySelector('script[src*="hangman.js"]');
    if (script && script.src) {
      return script.src.replace(/\/hangman\.js(\?.*)?$/i, "/stages/");
    }
    return "stages/";
  }

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

  function createLetterButtons() {
    letterButtons.innerHTML = "";
    letterButtons.className = "hangman-keyboard";

    KEYBOARD_ROWS.forEach(function (rowLetters, rowIndex) {
      const row = document.createElement("div");
      row.className = "hangman-keyboard-row hangman-keyboard-row-" + rowIndex;

      for (let i = 0; i < rowLetters.length; i += 1) {
        const letter = rowLetters.charAt(i);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = letter;
        button.className = "hangman-key";
        button.setAttribute("data-letter", letter);
        button.addEventListener("click", function () {
          guessLetter(letter);
        });
        row.appendChild(button);
        letterButtonMap[letter] = button;
      }

      letterButtons.appendChild(row);
    });
  }

  function guessLetter(letter) {
    if (gameOver || guessedLetters.includes(letter)) {
      return;
    }

    guessedLetters.push(letter);

    if (currentWord.includes(letter)) {
      if (checkWin()) {
        gameWon = true;
        gameOver = true;
        if (typeof unlockWorldAchievement === "function") {
          unlockWorldAchievement("demo:hangman-win");
        }
        updateGameStatus();
      }
    } else {
      wrongGuesses += 1;
      if (wrongGuesses >= MAX_WRONG) {
        gameOver = true;
        updateGameStatus();
      }
    }

    updateDisplay();
  }

  function checkWin() {
    return currentWord.split("").every(function (letter) {
      return guessedLetters.includes(letter);
    });
  }

  function updateHangmanSprite() {
    const stage = Math.min(wrongGuesses, MAX_WRONG);
    hangmanSprite.src = spriteBase + "stage-" + stage + ".svg?v=3";
  }

  function updateDisplay() {
    wordDisplay.textContent = currentWord
      .split("")
      .map(function (letter) {
        return guessedLetters.includes(letter) ? letter : "_";
      })
      .join(" ");

    wrongCount.textContent = String(wrongGuesses);
    updateHangmanSprite();

    Object.keys(letterButtonMap).forEach(function (letter) {
      const button = letterButtonMap[letter];
      if (!button) {
        return;
      }

      if (guessedLetters.includes(letter)) {
        button.disabled = true;
        button.classList.add("guessed");
        if (currentWord.includes(letter)) {
          button.classList.add("correct");
          button.classList.remove("wrong");
          button.style.backgroundColor = "#2ecc71";
          button.style.color = "#fff";
          button.style.borderColor = "#1e8449";
        } else {
          button.classList.add("wrong");
          button.classList.remove("correct");
          button.style.backgroundColor = "#f1c40f";
          button.style.color = "#111";
          button.style.borderColor = "#9a7d0a";
        }
      } else {
        button.disabled = gameOver;
        button.classList.remove("guessed", "correct", "wrong");
        button.style.backgroundColor = "";
        button.style.color = "";
        button.style.borderColor = "";
      }
    });
  }

  function updateGameStatus() {
    if (gameWon) {
      gameStatus.textContent = "Congratulations! You won!";
      gameStatus.style.color = "#2ecc71";
    } else if (gameOver) {
      gameStatus.textContent = "Game Over! The word was: " + currentWord;
      gameStatus.style.color = "#e74c3c";
    } else {
      gameStatus.textContent = "Guess a letter — click keys or type on your keyboard.";
      gameStatus.style.color = "#2ecc71";
    }
  }

  function showHint() {
    if (gameOver) {
      return;
    }

    const unguessedLetters = currentWord.split("").filter(function (letter) {
      return !guessedLetters.includes(letter);
    });

    if (unguessedLetters.length > 0) {
      const randomLetter =
        unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];
      guessLetter(randomLetter);
    }
  }

  function handleKeyboardInput(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key.toUpperCase();
    if (!/^[A-Z]$/.test(key)) {
      return;
    }

    event.preventDefault();
    if (event.repeat) {
      return;
    }

    guessLetter(key);
  }

  if (newGameBtn) {
    newGameBtn.addEventListener("click", initGame);
  }
  if (hintBtn) {
    hintBtn.addEventListener("click", showHint);
  }

  window.addEventListener("keydown", handleKeyboardInput);

  initGame();
})();

// Blackjack Game Demo
(() => {
  // Game state
  let shoe = [];
  let playerHand = [];
  let dealerHand = [];
  let gameOver = false;
  let playerScore = 0;
  let dealerScore = 0;

  // DOM elements
  const container = document.getElementById('blackjack-container');
  const gameStatus = document.getElementById('game-status');
  const playerScoreEl = document.getElementById('player-score');
  const dealerScoreEl = document.getElementById('dealer-score');
  const playerHandEl = document.getElementById('player-hand');
  const dealerHandEl = document.getElementById('dealer-hand');
  const dealBtn = document.getElementById('deal-btn');
  const hitBtn = document.getElementById('hit-btn');
  const standBtn = document.getElementById('stand-btn');
  const newGameBtn = document.getElementById('new-game-btn');

  // Card suits and values
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  // Initialize 6-deck shoe (default)
  function createShoe(numDecks = 6) {
    shoe = [];
    for (let n = 0; n < numDecks; n++) {
      for (let suit of suits) {
        for (let value of values) {
          shoe.push({ suit, value });
        }
      }
    }
    shuffleShoe();
  }

  // Shuffle shoe using Fisher-Yates algorithm
  function shuffleShoe() {
    for (let i = shoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
    }
  }

  function ensureShoe() {
    if (!shoe || shoe.length === 0) createShoe(6);
    // Reshuffle when low (e.g., less than one deck remaining)
    if (shoe.length < 52) createShoe(6);
  }

  // Deal a card from shoe
  function dealCard() {
    ensureShoe();
    return shoe.pop();
  }

  // Calculate hand value
  function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (let card of hand) {
      if (card.value === 'A') {
        aces++;
        value += 11;
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        value += 10;
      } else {
        value += parseInt(card.value);
      }
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  }

  // Create card element
  function createCardElement(card, isHidden = false) {
    const cardEl = document.createElement('div');
    cardEl.style.cssText = `
      display: inline-block;
      width: 60px;
      height: 80px;
      background: ${isHidden ? '#444' : '#fff'};
      border: 1px solid #333;
      border-radius: 4px;
      margin: 2px;
      padding: 4px;
      text-align: center;
      font-size: 12px;
      color: ${isHidden ? '#666' : (card.suit === '♥' || card.suit === '♦' ? '#e74c3c' : '#000')};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    
    if (isHidden) {
      cardEl.innerHTML = '?';
    } else {
      cardEl.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 2px;">${card.suit}</div>
        <div style="font-weight: bold;">${card.value}</div>
      `;
    }
    
    return cardEl;
  }

  // Update display
  function updateDisplay() {
    // Clear hands
    playerHandEl.innerHTML = '';
    dealerHandEl.innerHTML = '';

    // Display player hand
    for (let card of playerHand) {
      playerHandEl.appendChild(createCardElement(card));
    }

    // Display dealer hand
    for (let i = 0; i < dealerHand.length; i++) {
      const isHidden = !gameOver && i === 0;
      dealerHandEl.appendChild(createCardElement(dealerHand[i], isHidden));
    }

    // Update scores
    playerScore = calculateHandValue(playerHand);
    playerScoreEl.textContent = playerScore;

    if (gameOver) {
      dealerScore = calculateHandValue(dealerHand);
      dealerScoreEl.textContent = dealerScore;
    } else {
      // Show only visible dealer cards
      const visibleDealerHand = dealerHand.slice(1);
      dealerScore = visibleDealerHand.length > 0 ? calculateHandValue(visibleDealerHand) : 0;
      dealerScoreEl.textContent = dealerScore;
    }
  }

  // Check for blackjack
  function isBlackjack(hand) {
    return hand.length === 2 && calculateHandValue(hand) === 21;
  }

  // Check for bust
  function isBust(hand) {
    return calculateHandValue(hand) > 21;
  }

  // Determine winner
  function determineWinner() {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    if (playerValue > 21) {
      return 'dealer';
    } else if (dealerValue > 21) {
      return 'player';
    } else if (playerValue > dealerValue) {
      return 'player';
    } else if (dealerValue > playerValue) {
      return 'dealer';
    } else {
      return 'tie';
    }
  }

  // Update game status
  function updateGameStatus() {
    if (!gameOver) {
      gameStatus.textContent = 'Your turn - Hit or Stand?';
      gameStatus.style.color = '#2ecc71';
      return;
    }

    const winner = determineWinner();
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    if (winner === 'player') {
      if (isBlackjack(playerHand)) {
        gameStatus.textContent = 'Blackjack! You win!';
      } else {
        gameStatus.textContent = `You win! ${playerValue} vs ${dealerValue}`;
      }
      gameStatus.style.color = '#2ecc71';
    } else if (winner === 'dealer') {
      if (isBlackjack(dealerHand)) {
        gameStatus.textContent = 'Dealer has Blackjack! You lose!';
      } else {
        gameStatus.textContent = `You lose! ${playerValue} vs ${dealerValue}`;
      }
      gameStatus.style.color = '#e74c3c';
    } else {
      gameStatus.textContent = `Push! ${playerValue} vs ${dealerValue}`;
      gameStatus.style.color = '#f39c12';
    }
  }

  // Deal initial cards
  function dealInitialCards() {
    playerHand = [dealCard(), dealCard()];
    dealerHand = [dealCard(), dealCard()];
    gameOver = false;
    updateDisplay();
    updateGameStatus();
    
    // Check for immediate blackjack
    if (isBlackjack(playerHand)) {
      gameOver = true;
      // Round ended immediately; enable Deal for next hand
      dealBtn.disabled = false;
      hitBtn.disabled = true;
      standBtn.disabled = true;
      newGameBtn.disabled = false;
      updateDisplay();
      updateGameStatus();
    }
  }

  // Player hits
  function playerHit() {
    if (gameOver) return;
    
    playerHand.push(dealCard());
    updateDisplay();
    
    if (isBust(playerHand)) {
      gameOver = true;
      updateGameStatus();
      // Round ended due to player bust; enable Deal for next hand
      dealBtn.disabled = false;
      hitBtn.disabled = true;
      standBtn.disabled = true;
      newGameBtn.disabled = false;
    } else if (calculateHandValue(playerHand) === 21) {
      // Player has 21, dealer's turn
      dealerPlay();
    }
  }

  // Player stands
  function playerStand() {
    if (gameOver) return;
    
    dealerPlay();
  }

  // Dealer plays
  function dealerPlay() {
    gameOver = true;
    
    // Dealer hits until 17 or bust
    while (calculateHandValue(dealerHand) < 17) {
      dealerHand.push(dealCard());
    }
    
    updateDisplay();
    updateGameStatus();
    // Round ended; enable Deal for next hand
    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    newGameBtn.disabled = false;
  }

  // Start new game (reshuffle shoe if needed)
  function newGame() {
    ensureShoe();
    playerHand = [];
    dealerHand = [];
    gameOver = false;
    playerScore = 0;
    dealerScore = 0;
    
    updateDisplay();
    gameStatus.textContent = 'Click "Deal" to start!';
    gameStatus.style.color = '#2ecc71';
    
    // Enable/disable buttons
    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    newGameBtn.disabled = true;
  }

  // Deal cards
  function dealCards() {
    // If a round is active, ignore; otherwise start/continue with a fresh deal
    if (!gameOver && playerHand.length > 0) return;
    // Clear previous hands and start next round from the shoe
    playerHand = [];
    dealerHand = [];
    dealInitialCards();
    
    // If round did not end due to immediate blackjack, enable play controls
    if (!gameOver) {
      dealBtn.disabled = true;
      hitBtn.disabled = false;
      standBtn.disabled = false;
      newGameBtn.disabled = false;
    }
  }

  // Event listeners
  dealBtn.addEventListener('click', dealCards);
  hitBtn.addEventListener('click', playerHit);
  standBtn.addEventListener('click', playerStand);
  newGameBtn.addEventListener('click', newGame);

  // Initialize game
  newGame();
})();

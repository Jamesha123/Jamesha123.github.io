// Blackjack Game Demo
(() => {
  let shoe = [];
  let dealerHand = [];
  let gameOver = false;

  const tableTheme = !!document.querySelector(".game-blackjack");
  const multiHandMode = !!document.querySelector(".bj-hands-row");

  const gameStatus = document.getElementById("game-status");
  const dealerScoreEl = document.getElementById("dealer-score");
  const dealerHandEl = document.getElementById("dealer-hand");
  const dealBtn = document.getElementById("deal-btn");
  const hitBtn = document.getElementById("hit-btn");
  const standBtn = document.getElementById("stand-btn");
  const newGameBtn = document.getElementById("new-game-btn");

  const MAIN_SLOT = "center";
  const SLOT_ORDER = ["farLeft", "left", "center", "right", "farRight"];

  let playerHand = [];
  let playerHandEl = document.getElementById("player-hand");
  let playerScoreEl = document.getElementById("player-score");

  let slotState = null;
  let activeSlot = MAIN_SLOT;

  if (!gameStatus || !dealerHandEl || !dealBtn) {
    return;
  }

  function createInitialSlotState() {
    const state = {};
    for (let i = 0; i < SLOT_ORDER.length; i += 1) {
      const slot = SLOT_ORDER[i];
      state[slot] = {
        enabled: slot === MAIN_SLOT,
        cards: [],
        finished: false,
        result: "",
      };
    }
    return state;
  }

  if (multiHandMode) {
    slotState = createInitialSlotState();
  } else if (!playerHandEl) {
    return;
  }

  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const redSuits = ["♥", "♦"];

  function getSlotElements(slot) {
    const slotEl = document.getElementById("hand-slot-" + slot);
    if (!slotEl) {
      return null;
    }
    return {
      slotEl: slotEl,
      handEl: slotEl.querySelector(".bj-hand"),
      scoreEl: slotEl.querySelector(".bj-hand-score"),
      resultEl: slotEl.querySelector(".bj-hand-result"),
      addBtn: slotEl.querySelector(".bj-add-hand"),
      panelEl: slotEl.querySelector(".bj-hand-panel"),
      removeBtn: slotEl.querySelector(".bj-remove-hand"),
    };
  }

  function isMainSlot(slot) {
    return slot === MAIN_SLOT;
  }

  function canRemoveSideHand(slot) {
    return (
      multiHandMode &&
      !isMainSlot(slot) &&
      slotState[slot].enabled &&
      gameOver &&
      slotState[slot].cards.length > 0
    );
  }

  function createShoe(numDecks) {
    numDecks = numDecks || 6;
    shoe = [];
    for (let n = 0; n < numDecks; n += 1) {
      for (let s = 0; s < suits.length; s += 1) {
        for (let v = 0; v < values.length; v += 1) {
          shoe.push({ suit: suits[s], value: values[v] });
        }
      }
    }
    shuffleShoe();
  }

  function shuffleShoe() {
    for (let i = shoe.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shoe[i];
      shoe[i] = shoe[j];
      shoe[j] = temp;
    }
  }

  function ensureShoe() {
    if (!shoe || shoe.length === 0) {
      createShoe(6);
    }
    if (shoe.length < 52) {
      createShoe(6);
    }
  }

  function dealCard() {
    ensureShoe();
    return shoe.pop();
  }

  function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (let i = 0; i < hand.length; i += 1) {
      const card = hand[i];
      if (card.value === "A") {
        aces += 1;
        value += 11;
      } else if (card.value === "J" || card.value === "Q" || card.value === "K") {
        value += 10;
      } else {
        value += parseInt(card.value, 10);
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces -= 1;
    }

    return value;
  }

  function isRedSuit(suit) {
    return redSuits.indexOf(suit) !== -1;
  }

  function createLegacyCardElement(card, isHidden, cardIndex) {
    const cardEl = document.createElement("div");
    cardEl.style.cssText =
      "display:inline-block;width:60px;height:80px;background:" +
      (isHidden ? "#444" : "#fff") +
      ";border:1px solid #333;border-radius:4px;margin:2px;padding:4px;text-align:center;font-size:12px;color:" +
      (isHidden ? "#666" : isRedSuit(card.suit) ? "#e74c3c" : "#000") +
      ";box-shadow:0 2px 4px rgba(0,0,0,0.3);";

    if (typeof cardIndex === "number") {
      cardEl.style.position = "relative";
      cardEl.style.zIndex = String(cardIndex + 1);
    }

    if (isHidden) {
      cardEl.textContent = "?";
    } else {
      cardEl.innerHTML =
        '<div style="font-size:16px;margin-bottom:2px;">' +
        card.suit +
        '</div><div style="font-weight:bold;">' +
        card.value +
        "</div>";
    }

    return cardEl;
  }

  function createThemedCardElement(card, isHidden, cardIndex) {
    const cardEl = document.createElement("div");
    cardEl.className = "bj-card";

    if (typeof cardIndex === "number") {
      cardEl.style.zIndex = String(cardIndex + 1);
    }

    if (isHidden) {
      cardEl.classList.add("bj-card--hidden");
      return cardEl;
    }

    if (isRedSuit(card.suit)) {
      cardEl.classList.add("bj-card--red");
    }

    cardEl.innerHTML =
      '<span class="bj-card-corner bj-card-corner-top">' +
      '<span class="bj-card-value">' +
      card.value +
      '</span><span class="bj-card-suit">' +
      card.suit +
      "</span></span>" +
      '<span class="bj-card-center">' +
      card.suit +
      "</span>" +
      '<span class="bj-card-corner bj-card-corner-bottom">' +
      '<span class="bj-card-value">' +
      card.value +
      '</span><span class="bj-card-suit">' +
      card.suit +
      "</span></span>";

    return cardEl;
  }

  function createCardElement(card, isHidden, cardIndex) {
    if (tableTheme) {
      return createThemedCardElement(card, isHidden, cardIndex);
    }
    return createLegacyCardElement(card, isHidden, cardIndex);
  }

  function renderHand(handEl, hand, hideFirstDealerCard) {
    if (!handEl) {
      return;
    }
    handEl.innerHTML = "";
    for (let i = 0; i < hand.length; i += 1) {
      const isHidden = !!hideFirstDealerCard && i === 0;
      handEl.appendChild(createCardElement(hand[i], isHidden, i));
    }
  }

  function setStatusMessage(message, tone) {
    gameStatus.textContent = message;
    if (!tableTheme) {
      if (tone === "win") {
        gameStatus.style.color = "#2ecc71";
      } else if (tone === "lose") {
        gameStatus.style.color = "#e74c3c";
      } else if (tone === "push") {
        gameStatus.style.color = "#f39c12";
      } else {
        gameStatus.style.color = "#2ecc71";
      }
      return;
    }

    gameStatus.classList.remove("is-win", "is-lose", "is-push");
    if (tone === "win") {
      gameStatus.classList.add("is-win");
    } else if (tone === "lose") {
      gameStatus.classList.add("is-lose");
    } else if (tone === "push") {
      gameStatus.classList.add("is-push");
    }
  }

  function isBlackjack(hand) {
    return hand.length === 2 && calculateHandValue(hand) === 21;
  }

  function isBust(hand) {
    return calculateHandValue(hand) > 21;
  }

  function getEnabledSlots() {
    if (!multiHandMode) {
      return ["center"];
    }
    return SLOT_ORDER.filter(function (slot) {
      return slotState[slot].enabled;
    });
  }

  function getActiveHand() {
    if (multiHandMode) {
      return slotState[activeSlot].cards;
    }
    return playerHand;
  }

  function roundInProgress() {
    if (multiHandMode) {
      return getEnabledSlots().some(function (slot) {
        return slotState[slot].cards.length > 0;
      });
    }
    return playerHand.length > 0;
  }

  function canAddHand() {
    if (!multiHandMode) {
      return false;
    }
    // Between rounds or before the first deal — not while a hand is in play.
    return gameOver || !roundInProgress();
  }

  function setHandResult(slot, text, tone) {
    const els = getSlotElements(slot);
    if (!els || !els.resultEl) {
      return;
    }
    els.resultEl.textContent = text;
    els.resultEl.classList.remove("is-win", "is-lose", "is-push");
    if (tone === "win") {
      els.resultEl.classList.add("is-win");
    } else if (tone === "lose") {
      els.resultEl.classList.add("is-lose");
    } else if (tone === "push") {
      els.resultEl.classList.add("is-push");
    }
  }

  function clearHandResults() {
    if (!multiHandMode) {
      return;
    }
    SLOT_ORDER.forEach(function (slot) {
      setHandResult(slot, "", "");
    });
  }

  function updateActiveSlotUI() {
    if (!multiHandMode) {
      return;
    }

    SLOT_ORDER.forEach(function (slot) {
      const els = getSlotElements(slot);
      if (!els) {
        return;
      }

      els.slotEl.classList.toggle("is-enabled", slotState[slot].enabled);
      els.slotEl.classList.toggle("is-active", !gameOver && slot === activeSlot && !slotState[slot].finished);
      els.slotEl.classList.toggle("is-finished", slotState[slot].finished);
      els.slotEl.classList.toggle("is-removable", canRemoveSideHand(slot));

      if (els.panelEl) {
        if (slotState[slot].enabled) {
          els.panelEl.hidden = false;
          els.panelEl.classList.remove("bj-hand-panel--dormant");
        } else {
          els.panelEl.hidden = true;
          els.panelEl.classList.add("bj-hand-panel--dormant");
        }
      }

      if (els.addBtn) {
        els.addBtn.disabled = !canAddHand() || isMainSlot(slot) || slotState[slot].enabled;
      }

      if (els.removeBtn) {
        const showRemove = canRemoveSideHand(slot);
        els.removeBtn.hidden = !showRemove;
      }
    });
  }

  function updateDisplay() {
    if (multiHandMode) {
      SLOT_ORDER.forEach(function (slot) {
        const els = getSlotElements(slot);
        if (!els || !slotState[slot].enabled) {
          return;
        }

        renderHand(els.handEl, slotState[slot].cards, false);

        const score = calculateHandValue(slotState[slot].cards);
        if (els.scoreEl) {
          els.scoreEl.textContent = slotState[slot].cards.length ? String(score) : "0";
        }
      });
    } else {
      renderHand(playerHandEl, playerHand, false);
      if (playerScoreEl) {
        playerScoreEl.textContent = String(calculateHandValue(playerHand));
      }
    }

    renderHand(dealerHandEl, dealerHand, !gameOver);

    if (dealerScoreEl) {
      if (gameOver) {
        dealerScoreEl.textContent = String(calculateHandValue(dealerHand));
      } else {
        const visibleDealerHand = dealerHand.slice(1);
        dealerScoreEl.textContent =
          visibleDealerHand.length > 0 ? String(calculateHandValue(visibleDealerHand)) : "0";
      }
    }

    updateActiveSlotUI();
  }

  function determineWinnerForHand(hand) {
    const playerValue = calculateHandValue(hand);
    const dealerValue = calculateHandValue(dealerHand);

    if (playerValue > 21) {
      return "dealer";
    }
    if (dealerValue > 21) {
      return "player";
    }
    if (playerValue > dealerValue) {
      return "player";
    }
    if (dealerValue > playerValue) {
      return "dealer";
    }
    return "tie";
  }

  function determineWinner() {
    return determineWinnerForHand(getActiveHand());
  }

  function resultTextForHand(hand, winner) {
    const playerValue = calculateHandValue(hand);
    const dealerValue = calculateHandValue(dealerHand);

    if (playerValue > 21) {
      return { text: "Bust", tone: "lose" };
    }
    if (winner === "player") {
      if (isBlackjack(hand)) {
        return { text: "Blackjack", tone: "win" };
      }
      return { text: "Win", tone: "win" };
    }
    if (winner === "dealer") {
      if (isBlackjack(dealerHand) && !isBlackjack(hand)) {
        return { text: "Lose", tone: "lose" };
      }
      return { text: "Lose", tone: "lose" };
    }
    return { text: "Push " + playerValue, tone: "push" };
  }

  function updateGameStatus() {
    if (!gameOver) {
      if (multiHandMode) {
        const enabled = getEnabledSlots();
        const handNumber = enabled.indexOf(activeSlot) + 1;
        setStatusMessage("Hand " + handNumber + " of " + enabled.length + " — Hit or Stand", "neutral");
      } else {
        setStatusMessage("Your turn — Hit or Stand", "neutral");
      }
      return;
    }

    if (multiHandMode) {
      const enabled = getEnabledSlots();
      let wins = 0;
      let losses = 0;
      let pushes = 0;

      enabled.forEach(function (slot) {
        const winner = determineWinnerForHand(slotState[slot].cards);
        if (winner === "player") {
          wins += 1;
        } else if (winner === "dealer") {
          losses += 1;
        } else {
          pushes += 1;
        }
      });

      if (wins > 0 && losses === 0 && pushes === 0) {
        setStatusMessage("You win all hands!", "win");
      } else if (losses > 0 && wins === 0 && pushes === 0) {
        setStatusMessage("Dealer wins all hands.", "lose");
      } else {
        setStatusMessage("Results — Win: " + wins + "  Lose: " + losses + "  Push: " + pushes + " — Deal again or add hands", "neutral");
      }
      return;
    }

    const winner = determineWinner();
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    if (winner === "player") {
      if (isBlackjack(playerHand)) {
        setStatusMessage("Blackjack! You win!", "win");
      } else {
        setStatusMessage("You win! " + playerValue + " vs " + dealerValue, "win");
      }
    } else if (winner === "dealer") {
      if (isBlackjack(dealerHand)) {
        setStatusMessage("Dealer has Blackjack. You lose.", "lose");
      } else {
        setStatusMessage("You lose. " + playerValue + " vs " + dealerValue, "lose");
      }
    } else {
      setStatusMessage("Push. " + playerValue + " vs " + dealerValue, "push");
    }
  }

  function endRoundControls() {
    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    newGameBtn.disabled = false;
    updateActiveSlotUI();
  }

  function startRoundControls() {
    dealBtn.disabled = true;
    hitBtn.disabled = false;
    standBtn.disabled = false;
    newGameBtn.disabled = false;
    updateActiveSlotUI();
  }

  function finishSlot(slot, autoStand) {
    slotState[slot].finished = true;

    if (autoStand && !isBust(slotState[slot].cards) && calculateHandValue(slotState[slot].cards) === 21) {
      // twenty-one auto-advances like a stand
    }
  }

  function getNextActiveSlot(fromSlot) {
    const enabled = getEnabledSlots();
    const startIndex = enabled.indexOf(fromSlot);
    for (let i = startIndex + 1; i < enabled.length; i += 1) {
      const slot = enabled[i];
      if (!slotState[slot].finished) {
        return slot;
      }
    }
    return null;
  }

  function getFirstActiveSlot() {
    const enabled = getEnabledSlots();
    for (let i = 0; i < enabled.length; i += 1) {
      if (!slotState[enabled[i]].finished) {
        return enabled[i];
      }
    }
    return null;
  }

  function advanceToNextHand() {
    const next = getNextActiveSlot(activeSlot);
    if (next) {
      activeSlot = next;
      updateDisplay();
      updateGameStatus();
      return false;
    }
    return true;
  }

  function allPlayerHandsFinished() {
    if (!multiHandMode) {
      return gameOver;
    }
    return getEnabledSlots().every(function (slot) {
      return slotState[slot].finished;
    });
  }

  function resolveMultiHandResults() {
    getEnabledSlots().forEach(function (slot) {
      const winner = determineWinnerForHand(slotState[slot].cards);
      const result = resultTextForHand(slotState[slot].cards, winner);
      setHandResult(slot, result.text, result.tone);
    });
  }

  function dealInitialCards() {
    dealerHand = [dealCard(), dealCard()];
    gameOver = false;
    clearHandResults();

    if (multiHandMode) {
      getEnabledSlots().forEach(function (slot) {
        slotState[slot].cards = [dealCard(), dealCard()];
        slotState[slot].finished = isBlackjack(slotState[slot].cards);
        slotState[slot].result = "";
      });

      activeSlot = getFirstActiveSlot();
      updateDisplay();
      updateGameStatus();

      if (!activeSlot) {
        dealerPlay();
      } else {
        startRoundControls();
      }
      return;
    }

    playerHand = [dealCard(), dealCard()];
    updateDisplay();
    updateGameStatus();

    if (isBlackjack(playerHand)) {
      gameOver = true;
      endRoundControls();
      updateDisplay();
      updateGameStatus();
    }
  }

  function playerHit() {
    if (gameOver) {
      return;
    }

    if (multiHandMode) {
      const hand = slotState[activeSlot].cards;
      hand.push(dealCard());
      updateDisplay();

      if (isBust(hand)) {
        finishSlot(activeSlot, false);
        setHandResult(activeSlot, "Bust", "lose");
        if (advanceToNextHand()) {
          dealerPlay();
        }
      } else if (calculateHandValue(hand) === 21) {
        finishSlot(activeSlot, true);
        if (advanceToNextHand()) {
          dealerPlay();
        }
      }
      return;
    }

    playerHand.push(dealCard());
    updateDisplay();

    if (isBust(playerHand)) {
      gameOver = true;
      updateGameStatus();
      endRoundControls();
    } else if (calculateHandValue(playerHand) === 21) {
      dealerPlay();
    }
  }

  function playerStand() {
    if (gameOver) {
      return;
    }

    if (multiHandMode) {
      finishSlot(activeSlot, false);
      if (advanceToNextHand()) {
        dealerPlay();
      }
      return;
    }

    dealerPlay();
  }

  function dealerPlay() {
    gameOver = true;

    while (calculateHandValue(dealerHand) < 17) {
      dealerHand.push(dealCard());
    }

    updateDisplay();
    updateGameStatus();
    resolveMultiHandResults();
    endRoundControls();
  }

  function resetSlotState() {
    if (!multiHandMode) {
      return;
    }

    SLOT_ORDER.forEach(function (slot) {
      slotState[slot].cards = [];
      slotState[slot].finished = false;
      slotState[slot].result = "";
      if (slot !== "center") {
        // keep enabled hands between rounds
      }
    });

    activeSlot = getEnabledSlots()[0] || MAIN_SLOT;
    clearHandResults();
  }

  function newGame() {
    ensureShoe();
    dealerHand = [];
    gameOver = false;

    if (multiHandMode) {
      resetSlotState();
    } else {
      playerHand = [];
    }

    updateDisplay();
    setStatusMessage('Click "Deal" to start', "neutral");

    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    newGameBtn.disabled = true;
  }

  function dealCards() {
    if (!gameOver && roundInProgress()) {
      return;
    }

    dealerHand = [];
    if (multiHandMode) {
      resetSlotState();
    } else {
      playerHand = [];
    }

    dealInitialCards();

    if (!gameOver && !multiHandMode) {
      startRoundControls();
    }
  }

  function enableSideHand(slot) {
    if (!multiHandMode || isMainSlot(slot) || slotState[slot].enabled || !canAddHand()) {
      return;
    }

    slotState[slot].enabled = true;
    const els = getSlotElements(slot);
    if (els && els.panelEl) {
      els.panelEl.hidden = false;
      els.panelEl.classList.remove("bj-hand-panel--dormant");
    }
    updateActiveSlotUI();
  }

  function disableSideHand(slot) {
    if (!multiHandMode || isMainSlot(slot) || !slotState[slot].enabled || !canRemoveSideHand(slot)) {
      return;
    }

    slotState[slot].enabled = false;
    slotState[slot].cards = [];
    slotState[slot].finished = false;
    slotState[slot].result = "";

    const els = getSlotElements(slot);
    if (els) {
      if (els.handEl) {
        els.handEl.innerHTML = "";
      }
      if (els.scoreEl) {
        els.scoreEl.textContent = "0";
      }
      if (els.resultEl) {
        els.resultEl.textContent = "";
        els.resultEl.classList.remove("is-win", "is-lose", "is-push");
      }
      if (els.panelEl) {
        els.panelEl.hidden = true;
        els.panelEl.classList.add("bj-hand-panel--dormant");
      }
      if (els.removeBtn) {
        els.removeBtn.hidden = true;
      }
      els.slotEl.classList.remove("is-enabled", "is-active", "is-finished", "is-removable");
    }

    updateActiveSlotUI();
  }

  dealBtn.addEventListener("click", dealCards);
  hitBtn.addEventListener("click", playerHit);
  standBtn.addEventListener("click", playerStand);
  newGameBtn.addEventListener("click", newGame);

  if (multiHandMode) {
    const addHandBtns = document.querySelectorAll(".bj-add-hand[data-slot]");
    for (let i = 0; i < addHandBtns.length; i += 1) {
      addHandBtns[i].addEventListener("click", function () {
        enableSideHand(addHandBtns[i].getAttribute("data-slot"));
      });
    }

    SLOT_ORDER.forEach(function (slot) {
      if (isMainSlot(slot)) {
        return;
      }
      const els = getSlotElements(slot);
      if (els && els.removeBtn) {
        els.removeBtn.addEventListener("click", function () {
          disableSideHand(slot);
        });
      }
    });
  }

  newGame();
})();

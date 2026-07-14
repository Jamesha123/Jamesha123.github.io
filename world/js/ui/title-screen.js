import { getMobileJoystick } from "./mobile-controls.js?v=127";

let worldScene = null;
let gameStarted = false;
let startingGame = false;

export function initTitleScreen() {
  const playBtn = document.getElementById("title-play-btn");
  const classicBtn = document.getElementById("title-classic-btn");

  if (playBtn) {
    playBtn.addEventListener("click", startGame);
  }

  if (classicBtn) {
    classicBtn.addEventListener("click", function () {
      window.location.href = "../classic.html";
    });
  }
}

function pauseWorldScene(scene) {
  if (!scene || !scene.game || !scene.game.scene) {
    return;
  }

  if (scene.game.scene.isActive("WorldScene")) {
    scene.game.scene.pause("WorldScene");
  }
}

export function resumeWorldScene() {
  if (!worldScene || !worldScene.game || !worldScene.game.scene) {
    return;
  }

  if (worldScene.game.scene.isPaused("WorldScene")) {
    worldScene.game.scene.resume("WorldScene");
  }
}

export function showTitleScreen(scene) {
  worldScene = scene;
  pauseWorldScene(scene);

  const loading = document.getElementById("boot-loading");
  const title = document.getElementById("title-screen");

  if (loading) {
    loading.classList.add("hidden");
  }
  if (title) {
    title.hidden = false;
  }
}

function revealGame() {
  const overlay = document.getElementById("boot-overlay");
  const uiLayer = document.getElementById("ui-layer");
  const gameContainer = document.getElementById("game-container");
  const mobileJoystick = getMobileJoystick();

  if (overlay) {
    overlay.classList.add("hidden");
  }
  if (uiLayer) {
    uiLayer.classList.remove("pre-game-hidden");
  }
  if (gameContainer) {
    gameContainer.classList.remove("pre-game-hidden");
  }
  if (mobileJoystick) {
    mobileJoystick.show();
  }

  resumeWorldScene();
}

function finishPlayTransition() {
  const mapFade = document.getElementById("map-fade");
  if (mapFade) {
    mapFade.classList.remove("play-transition");
  }

  resumeWorldScene();

  const ui = worldScene && worldScene.ui;
  if (ui && ui.isMapFading && ui.isMapFading()) {
    ui.resetMapFade();
  }

  const canvas = worldScene && worldScene.game && worldScene.game.canvas;
  if (canvas) {
    canvas.focus();
  }
}

export function startGame() {
  if (gameStarted || startingGame) {
    return;
  }
  startingGame = true;
  gameStarted = true;

  const playBtn = document.getElementById("title-play-btn");
  const classicBtn = document.getElementById("title-classic-btn");
  const mapFade = document.getElementById("map-fade");
  const ui = worldScene && worldScene.ui;

  if (playBtn) {
    playBtn.disabled = true;
  }
  if (classicBtn) {
    classicBtn.disabled = true;
  }
  if (mapFade) {
    mapFade.classList.add("play-transition");
  }

  if (ui && typeof ui.fadeOutForMapTransition === "function") {
    ui
      .fadeOutForMapTransition()
      .then(function () {
        revealGame();
        if (typeof ui.fadeInFromMapTransition === "function") {
          return ui.fadeInFromMapTransition();
        }
      })
      .then(finishPlayTransition)
      .catch(function (error) {
        console.error(error);
        revealGame();
        finishPlayTransition();
      });
    return;
  }

  revealGame();
  finishPlayTransition();
}

export function isGameStarted() {
  return gameStarted;
}

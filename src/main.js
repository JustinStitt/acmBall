import Game from "./Game.js";
import Camera from "./Camera.js";
import config from "../config.js";
import { logErr } from "./helpers.js";

const loadScript = async (id) => {
  return new Promise((res, rej) => {
    let script = document.createElement("script");
    script.src = `../tiles/${id}.js`;
    script.type = "module";
    script.onerror = rej;
    script.onload = res;
    document.head.appendChild(script);
  });
};

Matter.Common.logLevel = config.logging.matter;

var game;

const start = async () => {
  game = new Game();
  window.game = game;

  for (let i = 0; i < game.NUM_TILES; i++) {
    try {
      await loadScript(i);
    } catch (err) {
      break;
    }
  }

  game.setup();
  game.run();
  game.pause();
};

try {
  await start();
} catch (e) {
  console.error(e);
  logErr(e);
}

window.play = () => {
  if (game.running) {
    if (game.paused) {
      game.resume();
      resumeButton.hidden = true;
      pauseButton.hidden = false;
    } else {
      resumeButton.hidden = false;
      pauseButton.hidden = true;
      game.pause();
    }
  } else {
    game.start();
    startButton.hidden = true;
    pauseButton.hidden = false;
  }
};
window.restartGame = () => window.location.reload();
window.switchView = Camera.switchView;

let resumeButton = document.getElementById("resume");
let pauseButton = document.getElementById("pause");
let startButton = document.getElementById("play");

window.addEventListener(
  "keydown",
  (e) => {
    if (e.defaultPrevented) return;

    switch (e.key) {
      case " ":
        play();
        break;
      case "v":
        switchView();
        break;
      case "r":
        restartGame();
        break;
      default:
        return;
    }

    e.preventDefault();
  },
  true
);

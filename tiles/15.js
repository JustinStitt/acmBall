import { sleep } from "../src/helpers.js";
import Tile from "../src/Tile.js";

let tile = new Tile();

tile.ballStart.position = { x: 255.93, y: 0 };
tile.ballStart.velocity = { x: -2, y: 4.42 };

tile.ballEnd.position = { x: 0, y: 440 };
tile.ballEnd.velocity = { x: -3, y: 0 };

// This function will run once when the tile loads for the first time
tile.setup = function () {
  tile.createRectangle(tile.width / 2, tile.height - 20, tile.width, 40);
  tile.createRectangle(0, 200, 1, 400);
  tile.createRectangle(500, 200, 1, 400);
  tile.createRamp(500, 200, 200, 500);
};

// This function will run when the ball enters your tile
tile.onBallEnter = async function () {};

// This function will run when the ball leaves your tile
tile.onBallLeave = async function () {};

// This function will run once every tick while the ball is in your tile
tile.onTick = function () {};

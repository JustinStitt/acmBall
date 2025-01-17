import { positionToTile, parseOptions, relPosition } from "./helpers.js";
import Ball from "./Ball.js";
import Button from "./Button.js";
import Camera from "./Camera.js";
import config from "../config.js";
let { Mouse, Resolver, Body, Bodies, Runner, Render, Composite, Detector, Engine, Events } = Matter;

// Try messing around with the mouse creation, and the html element that it targets
// there is a mouse.setScale() too, no clue how it works
Render.mousePosition = function (render, mouse, ctx) {
  let currTile = game.tiles[config.tile_id];
  const offset = 38;
  let mp = { x: mouse.position.x, y: mouse.position.y };
  let new_x = mp.x - currTile.left - offset;
  let new_y = mp.y - currTile.top - offset;
  if (new_x < -5 || new_x > 505 || new_y < -5 || new_y > 505) return;
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.font = "30px Monospace";
  ctx.fillText(`${Math.floor(new_x) + ", " + Math.floor(new_y)}`, mouse.position.x - 10, mouse.position.y - 40);
};

Render.timestamp = function (render, engine, ctx) {
  const pad = (num, chr, len) => {
    let str = num.toString();
    return chr.repeat(len - str.length) + str;
  };
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.font = "20px Monospace";
  const str =
    pad(Math.floor(engine.timing.timestamp / 1000), " ", 8) +
    "s " +
    pad(Math.floor(engine.timing.timestamp % 1000), "0", 3) +
    "ms";
  ctx.fillText(str, render.canvas.width - 200, render.canvas.height - 20);
};

Render.objectMasses = function (render, bodies = Composite.allBodies(Game.engine.world), context) {
  var c = context;
  c.font = "20px Arial";
  c.fillStyle = "rgba(240, 248, 255, 1)";
  bodies.forEach((b) => {
    c.fillText(`${b.mass.toFixed(2)} : ${b.collisionFilter.group}`, b.position.x - 20, b.position.y);
  });
};

Render.cameraMode = function (render, engine, ctx) {
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.font = "20px Monospace";
  let name = Object.keys(Camera.modes)[Camera.mode];
  ctx.fillText(`Camera Mode: ${name}`, 20, render.canvas.height - 10);
};

const FPS = 60;

class Game {
  constructor() {
    this.running = false;
    this.paused = false;
    this.NUM_TILES_X = 4;
    this.NUM_TILES_Y = 4;
    this.TILE_HEIGHT = 500;
    this.TILE_WIDTH = 500;
    this.HEIGHT = this.TILE_HEIGHT * this.NUM_TILES_Y;
    this.WIDTH = this.TILE_WIDTH * this.NUM_TILES_X;
    this.NUM_TILES = this.NUM_TILES_X * this.NUM_TILES_Y;
    this.engine = Engine.create();
    this.runner = Runner.create({
      isFixed: true,
      delta: 1000 / FPS,
    });
    this.mouse = Mouse.create(document.getElementsByTagName("tv-monitor")[0]);

    this.render = Render.create({
      element: document.getElementsByTagName("tv-monitor")[0],
      engine: this.engine,
      mouse: this.mouse,
      options: {
        showMousePosition: config.debug.showMousePosition,
        showObjectMasses: config.debug.showMasses,
        showTimestamp: config.debug.showTimer,
        showCameraMode: config.debug.showCameraMode,
        wireframes: false,
        width: (this.HEIGHT / this.WIDTH) * Camera.WIDTH,
        height: (this.WIDTH / this.HEIGHT) * Camera.HEIGHT,
      },
    });

    this.tiles = [];
    this.activeTile = 0;

    this.centerBody = Bodies.circle(this.WIDTH / 2, this.HEIGHT / 2, 0.1, { ignore: true });
    /* 
      These functions are passed as arguments
      The reference to "this" is lost when passed
      so we bind this to the function to prevent that
    */
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
  }

  setup() {
    this.ball = new Ball(this.tiles[config.tile_id]);

    Camera.setup();

    Render.run(this.render);
    Runner.run(this.runner, this.engine);

    Resolver._restingThresh = 0.001;

    this.tiles.forEach((tile) => tile._setup());
    let currTile = this.tiles[config.tile_id];

    if (config.debug.showTileBorder) {
      currTile.createRectangle(currTile.width / 2, currTile.height / 2, currTile.width, currTile.height, false, {
        ignore: true,
        render: { fillStyle: "rgba(52, 31 ,19, 0.05)", strokeStyle: "rgba(42,42,42,.4)" },
      });
    }

    this.oneTick();

    Events.on(this.engine, "collisionStart", this._handleCollisions);
    Events.on(this.engine, "collisionEnd", this._handleCollisions);
  }

  oneTick = () => {
    let stop = () => {
      this.stop();
      Events.off(this.runner, "tick", stop);
    };
    Events.on(this.runner, "tick", stop);
  };

  run() {
    Render.run(this.render);
    Runner.run(this.runner, this.engine);

    this.tiles[config.tile_id]._onBallEnter();

    this.activeTile = config.tile_id;

    Events.on(this.engine, "beforeUpdate", () => {
      this.tiles.forEach((tile) => {
        if (tile.id == this.activeTile) tile._onTick();
      });

      let oldActiveTile = this.activeTile;
      let activeTile = positionToTile(this.ball.body.position);
      let aTile = this.tiles[activeTile];
      let oTile = this.tiles[oldActiveTile];

      this.activeTile = activeTile;
      this.aTile = aTile;
      this.oTile = oTile;

      if (oldActiveTile == activeTile) return;

      if ((config.testAllTiles || oldActiveTile == config.tile_id) && oTile) {
        let passed = oTile._testExit();
        if (!passed && config.pauseOnFailedTeset) this.pause();
      }

      if (!aTile || this.activeTile < 0) return;

      this.ball._moveTile(aTile);

      if (!aTile._entered) {
        aTile._onBallEnter();
        oTile?._onBallLeave();
      }
    });

    Events.on(this.runner, "tick", () => {
      Camera.updateCamera();
    });
  }

  /**
   * @private
   * @param {event} event
   * @returns {void}
   */
  _handleCollisions(event) {
    let i,
      pair,
      length = event.pairs.length;

    for (i = 0; i < length; i++) {
      pair = event.pairs[i];
      let a = pair.bodyA;
      let b = pair.bodyB;
      if (a.label === "ball" && b.label.includes("set_wall")) {
        console.log("BALL HIT {", b.label, "} at: ", a.position, " velocity: ", a.velocity);
      }
      /* allow callback-enabled collisions with objects with label 'button' only */
      if (a.label === "button" || b.label === "button") Button.buttonLogic(a, b, event);
      // if (a.position.y > b.position.y) b.mass += a.mass;
    }
  }

  stop() {
    this.running = false;
    Runner.stop(this.runner);
    Render.stop(this.render);
  }

  pause() {
    this.paused = true;
    this.engine.enabled = false;
    //Runner.stop(this.runner);
  }

  resume() {
    this.paused = false;
    this.engine.enabled = true;
    //Runner.run(this.runner, this.engine);
  }

  start() {
    this.running = true;
    this.resume();
  }
}

export default Game;

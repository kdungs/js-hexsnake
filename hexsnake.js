/*jslint browser: true*/
(function () {
  'use strict';
  
  /** A simple 2-dimensional vector */
  var Vec2 = function (x, y) {
    this.x = x;
    this.y = y;
  };

  /** Helpers to do calculations with 2-dimensional vectors */
  var Vec2Math = {
    add: function (v1, v2) {
      return new Vec2(v1.x + v2.x, v1.y + v2.y);
    },
    dot: function (v1, v2) {
      return v1.x * v2.x + v1.y * v2.y;
    },
    scale: function (a, v) {
      return new Vec2(a * v.x, a * v.y);
    },
    fromAngle: function (phi) {
      return new Vec2(Math.cos(phi), Math.sin(phi));
    },
    deg2rad: function (deg) {
      return (deg % 360) * Math.PI / 180.0;
    }
  };

  // Manage directions on hexagonal grid
  var HexDirections = {
    N: 0,               // 000
    S: 1,               // 001
    NE: 2,              // 010
    SE: 3,              // 011
    NW: 4,              // 100
    SW: 5,              // 101
    MaskS: 1,           // 001
    MaskE: 2,           // 010
    MaskW: 4,           // 100
    MaskHorizontal: 5,  // 110
    move: function(v, dir) {
      return Vec2Math.add(v, (function () {
        switch (dir) {
          case HexDirections.N:
            return new Vec2(0, -1);
          case HexDirections.S:
            return new Vec2(0, +1);
          case HexDirections.NE:
            return new Vec2(+1, (v.x % 2) - 1);
          case HexDirections.SE:
            return new Vec2(+1, (v.x % 2));
          case HexDirections.NW:
            return new Vec2(-1, (v.x % 2) - 1);
          case HexDirections.SW:
            return new Vec2(-1, (v.x % 2));
        }
      }()));
    }
    };

  /** A hexagonal grid that allows drawing hexagonal tiles */
  var HexGrid = function (nx, ny, w, h) {
    this.nx = nx;
    this.ny = ny;
    this.radius = 0;
    this.resize(w, h);
  };

  HexGrid.prototype.resize = function (w, h) {
    var rw = 2 * w / 3 / this.nx,
        rh = h / (Math.sqrt(3) * (this.ny + 0.5));
    this.radius = Math.floor(Math.min(rw, rh));
    this.width = this.nx / 2 * 3 * this.radius;
    this.height = Math.sqrt(3) * this.radius * (this.ny + 0.5);
  };

  HexGrid.prototype.drawHex = function(ctx, coord, fillColor) {
    var center =
        new Vec2(coord.x * 0.75 * 2 * this.radius,
                 (coord.y + (coord.x % 2) * 0.5) * Math.sqrt(3) * this.radius);
    ctx.beginPath();
    ctx.moveTo(center.x - this.radius, center.y);
    ctx.lineTo(center.x - this.radius / 2,
               center.y + Math.sqrt(3) * this.radius / 2);
    ctx.lineTo(center.x + this.radius / 2,
               center.y + Math.sqrt(3) * this.radius / 2);
    ctx.lineTo(center.x + this.radius, center.y);
    ctx.lineTo(center.x + this.radius / 2,
               center.y - Math.sqrt(3) * this.radius / 2);
    ctx.lineTo(center.x - this.radius / 2,
               center.y - Math.sqrt(3) * this.radius / 2);
    ctx.lineTo(center.x - this.radius, center.y);
    ctx.closePath();
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.restore();
  };

  /** Define a Snake for moving around on the field. */
  var Snake = function (start) {
    this.parts = [start];
    this.direction = HexDirections.SE;
  };

  Snake.prototype.add = function (coord) {
    this.parts.push(coord);
  };

  Snake.prototype.move = function() {
    var coord =
        HexDirections.move(this.parts[this.parts.length - 1], this.direction);
    this.add(coord);
    if (this.parts.length > 5) {
      this.parts.splice(0, 1);
    }
  };

  Snake.prototype.changeDirection = function (dir) {
    this.direction = dir;
  };

  Snake.prototype.isCollision = function (coord) {
    return this.parts.indexOf(coord) !== -1;
  };

  // Game
  var game = {
    running: false,
    gamepad: null,
    colors: {
      snake: '#8BC34A',
      snakeHead: '#4CAF50'
    },
    hexGrid: new HexGrid(30, 20, window.innerWidth, window.innerHeight),
    snake: new Snake(new Vec2(4, 2)),
    restart: function () {
      this.snake = new Snake(new Vec2(4, 2));      
    },
    update: function (ticks) {
      if (!this.running) {
        return;
      }
      if (ticks % 1000) {
        this.snake.move();
      }
    },
    drawPause: function (ctx) {
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, this.hexGrid.width, this.hexGrid.height);
      ctx.fillStyle = '#E3F2FD';
      ctx.font = '60px Arial';
      ctx.fillText('HexSnake', 20, 90)
      ctx.font = '30px Arial';
      ctx.fillText('Press (A) to resume / pause.', 20, 140);
      ctx.fillText('Press (B) to restart.', 20, 180);
      if (this.gamepad === null) {
        ctx.fillStyle = '#EF9A9A';
        ctx.fillText('Please connect your Gamepad!.', 20, 260);
      }
    },
    drawGame: function (ctx) {
      ctx.save();
      ctx.translate(this.hexGrid.radius,
                    this.hexGrid.radius * Math.sqrt(3) / 2);
      var that = this;
      for (var y = 0; y < 20; y++) {
        for (var x = 0; x < 30; x++) {
          that.hexGrid.drawHex(ctx, new Vec2(x, y), '#C8E6C9');
        }
      }
      var head = that.snake.parts.pop();
      that.snake.parts.forEach(function (p) {
        that.hexGrid.drawHex(ctx, p, that.colors.snake);
      });
      that.hexGrid.drawHex(ctx, head, that.colors.snakeHead);
      that.snake.parts.push(head);
      ctx.restore();
    },
    draw: function (ctx) {
      if (!this.running) {
        this.drawPause(ctx);
      } else {
        this.drawGame(ctx);
      }
    }
  };

  // Handle input from gamepad
  var btnPressed = false,
      btn2Pressed = false;
  var pollGamepad = function () {
    var gp = navigator.getGamepads()[0],
        axisEW = gp.axes[0],
        axisNS = gp.axes[1],
        btn = gp.buttons[0],
        btn2 = gp.buttons[1],
        dir = 0;
    if (btn.pressed) {
      btnPressed = true;
    } else if (btnPressed) {
      game.running = !game.running;
      btnPressed = false;
    }
    if (btn2.pressed) {
      btn2Pressed = true;
    } else if (btn2Pressed) {
      game.restart();
      game.running = true;
      btn2Pressed = false;
    }
    if (axisNS !== 0) {
      var phi = Math.atan2(axisNS, axisEW),
          r = Math.sqrt(axisEW * axisEW + axisNS * axisNS);
      if (r > 0.5) {
        if (phi > 0) {
          dir |= HexDirections.MaskS;
        }
        if (Math.abs(phi) <= Math.PI / 6) {
          dir |= HexDirections.MaskE;
        } else if (Math.abs(phi) >= 3 * Math.PI / 6) {
          dir |= HexDirections.MaskW;
        }
        game.snake.changeDirection(dir);
      }
    }
  };
  var setupGamepad = window.setInterval(function () {
    if (navigator.getGamepads()[0]) {
      game.gamepad = navigator.getGamepads()[0];
      window.setInterval(pollGamepad, 100);
      window.clearInterval(setupGamepad);
    }
  }, 500);

  // Get the context and set up the drawing
  // Set up the canvas for the game
  var canvas = document.body.appendChild(document.createElement('canvas'));
  var resizeCanvas = function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    game.hexGrid.resize(window.innerWidth, window.innerHeight);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  var ctx = canvas.getContext('2d');
  var ticks = 0;
  var drawCtx = function () { 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    game.update(ticks++);
    game.draw(ctx);
    window.setTimeout(function () {
      window.requestAnimationFrame(drawCtx);
    }, 100);
  };
  window.requestAnimationFrame(drawCtx);
}());

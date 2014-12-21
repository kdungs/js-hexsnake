/*jslint browser: true*/
(function () {
  'use strict';
  // Set up the canvas for the game
  var canvas = document.body.appendChild(document.createElement('canvas'));
  var resizeCanvas = function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

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
    // w = 2 r
    // h = √3 r
    var rw = w / 2 / this.nx,
        rh = h / Math.sqrt(3) / this.ny;
    this.radius = Math.floor(Math.min(rw, rh));
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
    colors: {
      snake: '#8BC34A',
      snakeHead: '#4CAF50'
    },
    hexGrid: new HexGrid(30, 20, window.innerWidth, window.innerHeight),
    snake: new Snake(new Vec2(4, 2)),
    update: function (ticks) {
      if (!this.running) {
        return;
      }
      if (ticks % 1000) {
        this.snake.move();
      }
    },
    draw: function (ctx) {
      if (!this.running) {
        return;
      }
      var that = this;
      for (var y = 0; y < 20; y++) {
        for (var x = 0; x < 30; x++) {
          that.hexGrid.drawHex(ctx, new Vec2(x, y), "#eeeeee");
        }
      }
      var head = that.snake.parts.pop();
      that.snake.parts.forEach(function (p) {
        that.hexGrid.drawHex(ctx, p, that.colors.snake);
      });
      that.hexGrid.drawHex(ctx, head, that.colors.snakeHead);
      that.snake.parts.push(head);
    }
  };

  // Handle input from gamepad
  var btnPressed = false;
  var pollGamepad = function () {
    var gp = navigator.getGamepads()[0],
        axisEW = gp.axes[0],
        axisNS = gp.axes[1],
        btn = gp.buttons[0],
        dir = 0;
    if (btn.pressed) {
      btnPressed = true;
    } else if (btnPressed) {
      game.running = !game.running;
      btnPressed = false;
    }
    if (axisNS !== 0) {
      var phi = Math.atan2(axisNS, axisEW),
          r = Math.sqrt(axisEW * axisEW + axisNS * axisNS);
      if (r > 0.1) {
        if (phi > 0) {
          dir |= HexDirections.MaskS;
        }
        if (Math.abs(phi) <= Math.PI / 6) {
          dir |= HexDirections.MaskE;
        } else if (Math.abs(phi) >= 3 * Math.PI / 6) {
          dir |= HexDirections.MaskW;
        }
      }
      game.snake.changeDirection(dir);
    }
  };
  var setupGamepad = window.setInterval(function () {
    if (navigator.getGamepads()[0]) {
      window.setInterval(pollGamepad, 100);
      window.clearInterval(setupGamepad);
    }
  }, 500);

  // Get the context and set up the drawing
  var ctx = canvas.getContext('2d');
  var ticks = 0;
  var drawCtx = function () { 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(game.hexGrid.radius, game.hexGrid.radius * Math.sqrt(3) / 2);
    game.update(ticks++);
    game.draw(ctx);
    ctx.restore();
    window.setTimeout(function () {
      window.requestAnimationFrame(drawCtx);
    }, 100);
  };
  window.requestAnimationFrame(drawCtx);
}());

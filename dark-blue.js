'use strict';

// Utility Functions
function parsePosition(node){
	return {
		top: parseFloat(node.style.top),
		left: parseFloat(node.style.left),
		width: parseFloat(node.style.width),
		height: parseFloat(node.style.height)
	};
}

function nodeCorners(node){
	var pos = parsePosition(node);
	var right = pos.left + pos.width, bottom = pos.top + pos.height;
	return {
		topLeft: new Vector(pos.left, pos.top),
		topRight: new Vector(right, pos.top),
		bottomLeft: new Vector(pos.left, bottom),
		bottomRight: new Vector(right, bottom)
	};
}

function uniqueElements(list){
	var unique = [];
	list.forEach(function(val){
		if(unique.indexOf(val) == -1){
			unique.push(val);
		}
	});
	return unique;
}

function scaleNode(node, prop){
	var pos = parsePosition(node);
	var width = pos.width * prop, height = pos.height * prop;
	var top = pos.top + (pos.height - height) / 2;
	var left = pos.left + (pos.width - width) / 2;
	node.style.top = top + '%';
	node.style.left = left + '%';
	node.style.width = width + '%';
	node.style.height = height + '%';
}

// Vector prototype -- two dimensional.
function Vector(x, y){
	this.x = x;
	this.y = y;
}

// Add two vectors
Vector.prototype.plus = function(other){
	if(typeof other == 'number')
		return new Vector(this.x + other, this.y + other);

	return new Vector(this.x + other.x, this.y + other.y);
};

// Return a unit vector in the same direction
Vector.prototype.unit = function(){
	var mag = this.magnitude();
	return new Vector(this.x / mag, this.y / mag);
};

// Multiply the vector by a number, or another vector elementwise
Vector.prototype.mult = function(other){
	if(typeof other == 'number')
		return new Vector(this.x * other, this.y * other);

	return new Vector(this.x * other.x, this.y * other.y);
};

// Dot product of two vectors
Vector.prototype.dot = function(other){
	var m = this.mult(other);
	return m.x + m.y;
};

// Magnitude of a vector
Vector.prototype.magnitude = function(){
	return Math.sqrt(this.dot(this));
};

// Absolute value
Vector.prototype.abs = function(){
	return new Vector(Math.abs(this.x), Math.abs(this.y))
};

function Grid(width, height){
	this.width = width;
	this.height = height;

	this.values = new Array(width * height);
}

Grid.prototype.getValue = function(vec){
	return this.values[vec.y * this.width + vec.x];
};

Grid.prototype.setValue = function(vec, val){
	this.values[vec.y * this.width + vec.x] = val;
};

Grid.prototype.isIn = function(vec){
	return vec.x >= 0 && vec.x < this.width &&
		   vec.y >= 0 && vec.y < this.height;
};

Grid.prototype.forEach = function(fn, context){
	for(var y = 0; y < this.height; y++){
		for(var x = 0; x < this.width; x++){
			var pos = new Vector(x, y);
			fn.call(context, this.getValue(pos), pos);
		}
	}
};

function Dead(msg){
	Error.call(this, msg);
}

Dead.prototype = Object.create(Error.prototype);

function Won(msg){
	Error.call(this, msg);
}

Won.prototype = Object.create(Error.prototype);

function Game(parent){
	this.parent = parent;
	this.main = null;
	this.container = null;
	this.width = null;
	this.height = null;
	this.currentLevel = null;
	this.player = null;
	this.running = false;
}

Game.prototype.cellWidth = function(){
	return 100 / this.width;
};

Game.prototype.cellHeight = function(){
	return 100 / this.height;
};

Game.prototype.cellSpace = function(){
	return new Grid(this.width, this.height);
}

Game.prototype.cellOrigin = function(vec){
	var size = new Vector(this.cellWidth(), this.cellHeight());
	return vec.mult(size);
};

Game.prototype.init = function(){
	this.container = document.createElement('div');
	this.container.style.position = 'absolute';
	if (this.width / this.height >= 
		this.parent.clientWidth / this.parent.clientHeight){

		this.container.style.width = '100%';
		this.container.style.height = '0px';
		this.container.style.paddingBottom = (this.height / this.width) * 100 + '%';
	}
	else{
		this.container.style.height = '100%';
		this.container.style.width = '0px';
		this.container.style.paddingRight = (this.width / this.height) * 100 + '%';
	}
	this.container.style.margin = 'auto';
	this.container.style.top = 0;
	this.container.style.bottom = 0;
	this.container.style.left = 0;
	this.container.style.right = 0;
	this.parent.appendChild(this.container);

	this.main = document.createElement('div')
	this.main.style.position = 'relative';
	this.main.style.width = this.container.clientWidth + 'px';
	this.main.style.height = this.container.clientHeight + 'px';
	this.main.style.background = 'blue';
	this.main.style.overflow = 'hidden';
	this.container.appendChild(this.main);
};

Game.prototype.destroy = function(){
	this.container.removeChild(this.main);
	this.parent.removeChild(this.container);
	this.container = null;
	this.main = null;
};

Game.prototype.setUpLevel = function(level){
	level.game = this;
	this.currentLevel = level;
	this.width = level.width;
	this.height = level.height;
	this.init();
	this.currentLevel.setUp();

	this.player = new Player(this);
	this.player.setUp();
};

Game.prototype.tearDownLevel = function(){
	this.currentLevel.tearDown();
	this.player.tearDown();
	this.destroy();
};

Game.prototype.startRunning = function(){
	var lastTime = null;

	var self = this;
	var run = function(time){
		if(lastTime == null)
			lastTime = time;

		self.running = true;

		try{
			self.currentLevel.move(time - lastTime);
			self.player.move(time - lastTime);
			lastTime = time;
		} 
		catch(exc){
			if(exc instanceof Dead){
				self.tearDownLevel();
				self.running = false;
				console.log('Defeat...')
				return;
			}
			else if(exc instanceof Won){
				self.tearDownLevel();
				self.running = false;
				console.log('Victory!')
				return;
			}
			else
				throw exc;
		}	
		requestAnimationFrame(run);

	};
	requestAnimationFrame(run);
};

function Player(game, color){
	this.color = color || 'black';
	this.game = game;
	this.node = null;
	this.keysDown = [];
	this.lastTime = null;
	this.yVelocity = 0;
	this.listeners = [];
}

Player.prototype.setUp = function(){
	var cellWidth  = this.game.cellWidth();
	var cellHeight = this.game.cellHeight();
	this.node = document.createElement('div');
	this.node.style.width = cellWidth + '%';
	this.node.style.height = cellHeight * 2 + '%';
	this.node.style.background = this.color;
	this.node.style.position = 'absolute';
	var start = this.game.currentLevel.playerStart;
	start = start.mult(new Vector(cellWidth, cellHeight));
	this.node.style.top = start.y + '%';
	this.node.style.left = start.x + '%';
	scaleNode(this.node, .9);
	this.atBorders(true);
	this.game.main.insertBefore(this.node, this.game.main.childNodes[0]);

	var self = this;
	this.listeners.push(['keydown', function(event){
		if(!self.game.running)
			return;

		if(self.keysDown.indexOf(event.key) == -1)
			self.keysDown.push(event.key);
	}]);

	this.listeners.push(['keyup', function(event){
		if(!self.game.running)
			return;

		var index = self.keysDown.indexOf(event.key);
		if(index > -1){
			var before = self.keysDown.slice(0, index);
			var after = self.keysDown.slice(index + 1);
			self.keysDown = before.concat(after);
		}
	}]);

	this.listeners.forEach(function(listener){
		window.addEventListener.apply(null, listener);
	});
};

Player.prototype.tearDown = function(){
	this.game.main.removeChild(this.node);

	this.listeners.forEach(function(listener){
		window.removeEventListener.apply(null, listener);
	});
};

Player.prototype.atBorders = function(resolve, exempt, cantCollect){
	var corners = nodeCorners(this.node);
	var allBorders = [];
	var nodes = [];
	exempt = exempt || [];

	var addToCorners = function(vec){
		for(var c in corners){
			if(corners.hasOwnProperty(c))
				corners[c] = corners[c].plus(vec);
		}
	};

	for(var pos in this.game.currentLevel.nodes){
		nodes.push(this.game.currentLevel.nodes[pos]);
	}

	var pos = parsePosition(this.node);

	var tol = new Vector(1, 1);

	nodes.forEach(function(node){
		if(exempt.indexOf(node) > -1)
			return;

		var corners2 = nodeCorners(node.cell);
		var pos2 = parsePosition(node.cell);
		var borders = [];

		if(corners2.topLeft.x > corners.topLeft.x - pos2.width + tol.x &&
		   corners2.topRight.x < corners.topRight.x + pos2.width - tol.x){

			if(corners2.bottomLeft.y >= corners.topLeft.y &&
			   corners2.topLeft.y < corners.topLeft.y){
				borders.push('top');

				if(resolve){
					var diff = corners2.bottomLeft.y - corners.topLeft.y;
					addToCorners(new Vector(0, diff));
					this.node.style.top = corners.topLeft.y + '%';
				}
			}

			if(corners2.topLeft.y <= corners.bottomLeft.y &&
			   corners2.bottomLeft.y > corners.bottomLeft.y){
				borders.push('bottom');

				if(resolve){
					var diff = corners2.topLeft.y - corners.bottomLeft.y;
					addToCorners(new Vector(0, diff));
					this.node.style.top = corners.topLeft.y + '%';
				}
			}
		}

		if(corners2.topLeft.y > corners.topLeft.y - pos2.height + tol.y &&
		   corners2.bottomLeft.y < corners.bottomLeft.y + pos2.height - tol.y){

			if(corners2.topRight.x >= corners.topLeft.x &&
			   corners2.topLeft.x < corners.topLeft.x){
				borders.push('left');

				if(resolve){
					var diff = corners2.topRight.x - corners.topLeft.x;
					addToCorners(new Vector(diff, 0));
					this.node.style.left = corners.topLeft.x + '%';
				}
			}

			if(corners2.topLeft.x <= corners.topRight.x &&
			   corners2.topLeft.x > corners.topLeft.x){
				borders.push('right');

				if(resolve){
					var diff = corners2.topLeft.x - corners.topRight.x;
					addToCorners(new Vector(diff, 0));
					this.node.style.left = corners.topLeft.x + '%';
				}
			}

		}

		if(borders.length > 0 && node.deadly)
			throw new Dead('Hit a deadly node!');

		if(borders.length > 0 && node.coin && !cantCollect)
			this.game.currentLevel.removeCoin(node);
		else
			borders.forEach(function(val){ allBorders.push(val); });

	}, this);

	if(corners.topLeft.x <= 0){
		allBorders.push('left');

		if (resolve){
			addToCorners(new Vector(-corners.topLeft.x, 0));
			this.node.style.left = corners.topLeft.x + '%';
		}
	}

	if(corners.topRight.x >= 100){
		allBorders.push('right');

		if (resolve){
			addToCorners(new Vector(100 - corners.topRight.x, 0));
			this.node.style.left = corners.topLeft.x + '%';
		}
	}

	return uniqueElements(allBorders);
};

Player.prototype.move = function(interval){
	var borders = this.atBorders(true);
	var current = parsePosition(this.node);

	// some calculations
	var b = 4, t = 100 * b, h = this.game.height;
	var a = - (200 * b) / (h * t ** 2);
	var v0 = (200 * b - a * t ** 2 * h) / (2 * h * t);

	if(borders.indexOf('bottom') > -1){
		this.yVelocity = 0;
		if(this.keysDown.indexOf('ArrowUp') > -1)
			this.yVelocity = v0;
	}
	else{
		if(borders.indexOf('top') > -1)
			this.yVelocity = 0;

		this.yVelocity += a * interval;
	}

	this.node.style.top = current.top - this.yVelocity * interval + '%';

	var xmove = 0;
	if((this.keysDown.indexOf('ArrowLeft') > -1) ^ 
	   (this.keysDown.indexOf('ArrowRight') > -1)){

	   	if(this.keysDown.indexOf('ArrowLeft') > -1 &&
	   	   borders.indexOf('left') < 0)
	   		xmove = -1;

	   	if(this.keysDown.indexOf('ArrowRight') > -1 &&
	   	   borders.indexOf('right') < 0)
	   		xmove = 1;
	}

	var vX = (.1 * 3 * b) / this.game.width;
	this.node.style.left = current.left + xmove * interval * vX + '%';

	if(parseFloat(this.node.style.top) > 100)
		throw new Dead('Off the map!')
};

function DynamicNode(level, moveType, vec, deadly, coin, color, rate){
	this.level = level;
	this.moveType = moveType;
	this.deadly = Boolean(deadly);
	this.coin = Boolean(coin);
	this.rate = rate || new Vector(100 / this.level.width, 100 / this.level.height);
	this.rate = this.rate.mult(.0005);

	this.cell = this.level.cell(vec, color, coin);

	this.startPosition = parsePosition(this.cell);

	switch(this.moveType){
		case 'horiz':
			this.currentDirection = new Vector(-1, 0);
			break;
		case 'vert':
		case 'drip':
			this.currentDirection = new Vector(0, 1);
			break;
		default:
			this.currentDirection = new Vector(0, 0);
			break;
	}
}

DynamicNode.prototype.move = function(){
	var imitate = {
		node: this.cell,
		game: this.level.game
	};

	var exempt = this.level.coins();
	exempt.push(this);
	var borders = Player.prototype.atBorders.call(imitate, false, exempt, true);
	if(this[this.moveType + 'Update'](borders)){
		var direction = this.currentDirection.mult(this.rate);
		var current = parsePosition(this.cell);
		this.cell.style.top = current.top + this.currentDirection.y + '%';
		this.cell.style.left = current.left + this.currentDirection.x + '%';
	}
};

DynamicNode.prototype.vertUpdate = function(borders){
	var newDirection = new Vector(0, 0);
	var top = borders.indexOf('top') > -1;
	var bottom = borders.indexOf('bottom') > -1;

	if(top || bottom){
		if(top)
			newDirection = newDirection.plus(new Vector(0, 1));
		if(bottom)
			newDirection = newDirection.plus(new Vector(0, -1));
		this.currentDirection = newDirection;
	}
	return true;
};	

DynamicNode.prototype.horizUpdate = function(borders){
	var newDirection = new Vector(0, 0);
	var left = borders.indexOf('left') > -1;
	var right = borders.indexOf('right') > -1;

	if(left || right){
		if(left)
			newDirection = newDirection.plus(new Vector(1, 0));
		if(right)
			newDirection = newDirection.plus(new Vector(-1, 0));
		this.currentDirection = newDirection;
	}
	return true;
};

DynamicNode.prototype.dripUpdate = function(borders){
	if(borders.indexOf('bottom') > -1){
		this.cell.style.top = this.startPosition.top + '%';
		return false;
	}
	return true;
};

function Level(game){
	this.game = game;
	this.nodes = Object.create(null);
	this.playerStart = new Vector(50, 50);
	this.width = 30;
	this.height = 12;
	this.playerStart = new Vector(
		Math.floor(this.width / 2), 
		Math.floor(this.height / 2)
	);
}

Level.prototype.cell = function(vec, color, coin){
	var node = document.createElement('div');

	node.style.position = 'absolute';

	var origin = this.game.cellOrigin(vec);
	node.style.top = origin.y + '%';
	node.style.left = origin.x + '%';

	node.style.width = this.game.cellWidth() + '%';
	node.style.height = this.game.cellHeight() + '%';

	node.style.background = color || 'white';

	if(coin)
		scaleNode(node, .6);

	return node;
};

Level.prototype.addCellAt = function(vec, deadly, coin, color){
	var cell = this.cell(vec, color, coin);

	this.game.main.appendChild(cell);
	this.nodes[vec.x + ',' + vec.y] = {
		cell: cell,
		deadly: Boolean(deadly),
		coin: Boolean(coin)
	};
};

Level.prototype.addDynamicNodeAt = function(vec, moveType, deadly, coin, color, rate){
	var node = new DynamicNode(this, moveType, vec, deadly, coin, color, rate);
	this.game.main.appendChild(node.cell);
	this.nodes[vec.x + ',' + vec.y] = node;
};

Level.prototype.removeCoin = function(node){
	for(var n in this.nodes){
		if (this.nodes[n] == node){
			this.game.main.removeChild(node.cell);
			delete this.nodes[n];
			break;
		}
	}
};

Level.prototype.setUp = function(){
	var parent = this.game.main;
	this.game.cellSpace().forEach(function(_, vec){
		if (vec.y == (this.game.height - 1) && vec.x % 6 != 0)
			this.addCellAt(vec);

		else if (vec.y > this.game.height - 6 && vec.x == 0)
			this.addCellAt(vec);

	}, this);

	this.addCellAt(new Vector(10, 7), false, true, 'yellow');
	this.addDynamicNodeAt(new Vector(2, 7), 'horiz', true, false, 'red');
};

Level.prototype.tearDown = function(){
	for(var pos in this.nodes)
		this.game.main.removeChild(this.nodes[pos].cell);
};

Level.prototype.nodeAt = function(vec){
	return self.nodes[vec.x + ',' + vec.y];
};

Level.prototype.coins = function(){
	var coins = [];
	for(var n in this.nodes){
		if(this.nodes[n].coin)
			coins.push(this.nodes[n]);
	}
	return coins;
};

Level.prototype.move = function(interval){
	if (this.coins().length == 0)
		throw new Won('All Coins Eliminated!');

	for(var pos in this.nodes){
		var node = this.nodes[pos];
		if(node instanceof DynamicNode)
			node.move();
	}
};

var testPlan = [
	'                    ',
	'                    ',
	'                    ',
	'                    ',
	' x              = x ',
	' x         o o    x ',
	' x @      xxxxx   x ',
	' xxxxx            x ',
	'     x!!!!!!!!!!!!x ',
	'     xxxxxxxxxxxxxx ',
	'                    '
]

var testLegend = {
	'@': 'player',
	'o': 'coin',
	'=': 'lava-horiz',
	'|': 'lava-vert',
	'v': 'lava-drip',
	'x': 'wall',
	'!': 'lava'
}

function PlannedLevel(plan, legend, game){
	Level.call(this, game);
	this.plan = plan;
	this.legend = legend;
	this.width = plan[0].length;
	this.height = plan.length;
	this.playerStart = this._playerStart();
}

PlannedLevel.prototype = Object.create(Level.prototype);

PlannedLevel.prototype._playerStart = function(){
	var xVal, yVal;
	this.plan.forEach(function(line, y){
		line.split('').forEach(function(char, x){
			if(this.legend[char] == 'player'){
				xVal = x;
				yVal = y;
			}
		}, this);
	}, this);
	return new Vector(xVal, yVal);
};

PlannedLevel.prototype.setUp = function(){
	var self = this;
	var addCell = function(vec, deadly, coin, color, moveType){
		if(moveType)
			self.addDynamicNodeAt(vec, moveType, deadly, coin, color);
		else
			self.addCellAt(vec, deadly, coin, color);
	};

	this.plan.forEach(function(line, y){
		line.split('').forEach(function(char, x){
			if(char == ' ')
				return;

			var comps = this.legend[char].split('-');
			var type = comps[0];
			var moveType = comps[1];
			var vec = new Vector(x, y);
			if(type != 'player'){
				switch(type){
					case 'wall':
						addCell(vec, false, false, 'white', moveType);
						break;
					case 'coin':
						addCell(vec, false, true, 'yellow', moveType);
						break;
					case 'lava':
						addCell(vec, true, false, 'red', moveType);
						break;
					default:
						break;
				}
			}
		}, this);
	}, this);
};

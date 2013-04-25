// Blind Maze Generation Experiment
//
// An effort to try and get some useful classification data from a game
// of blind maze.
//
// By: marlon Etheredge <marlon.etheredge@gmail.com>

var activeInteractionIndex = -1;

Crafty.c('Grid', {
	init: function() {
		this.attr({
			w: Game.Map.Tile.Width,
			h: Game.Map.Tile.Height
		})
	},
	at: function(x, y) {
		if (x === undefined && y === undefined) {
			return { x: this.x / Game.Map.Tile.Width, y: this.y / Game.Map.Tile.Height }
		} else {
			this.attr({ x: x * Game.Map.Tile.Width, y: y * Game.Map.Tile.Height });
			return this;
		}
	}
});

Crafty.c('PlayerCharacter', {
	init: function() {
		this.requires('2D, Canvas, Color, Actor, Fourway, Collision, Grid')
		.fourway(4)
		.color('rgb(0, 0, 0)')
		.stopOnSolids()
		.attr({
			w: Game.Map.Tile.Width,
			h: Game.Map.Tile.Height
		});
		
		this.bind('Moved', function(data) {
			var cp = this.at();
			cp.x = Math.round(cp.x);
			cp.y = Math.round(cp.y);
			if (cp.x != Game.LastCell.X || cp.y != Game.LastCell.Y) {
				if (Game.Map.Visited[cp.x][cp.y]) {
					$('#action').html('Loop (5)');
					activeInteractionIndex = 5;
				}
			
				Game.Map.Visited[cp.x][cp.y] = true;
			}
			Game.LastCell.X = Math.round(cp.x);
			Game.LastCell.Y = Math.round(cp.y);
		
			if (Game.IsHalted) {
				Game.Unhalt();
			}
			
			Game.LastTick = new Date().getTime();
			Game.CheckVisibleElements(this.at());
		});
		
		this.bind('NewDirection', function(data) {
			if (data.x > 0) {
				$('#action').html('Right (0)');
				activeInteractionIndex = 0;
			} else if (data.x < 0) {
				$('#action').html('Left (1)');
				activeInteractionIndex = 1;
			} else if (data.y > 0) {
				$('#action').html('Down (2)');
				activeInteractionIndex = 2;
			} else if (data.y < 0) {
				$('#action').html('Up (3)');
				activeInteractionIndex = 3;
			} else {
				var p = this.at();
				p.x = Math.round(p.x);
				p.y = Math.round(p.y);
				this.at(p.x, p.y);
				
				$('#action').html('Stop (4)');
				activeInteractionIndex = 4;
			}
		});
	},
	stopOnSolids: function() {
		this.onHit('Solid', this.stopMovement);
		this.onHit('End', Game.EndCondition);
		return this;
	},
	stopMovement: function() {
		this._speed = 0;
		if (this._movement) {
			this.x -= this._movement.x;
			this.y -= this._movement.y;
		}
	}
});

Crafty.c('Block', {
	init: function() {
		this.requires('2D, Canvas, Color, Solid, Grid')
		.color('rgb(133, 133, 133)')
		.attr({
			w: Game.Map.Tile.Width,
			h: Game.Map.Tile.Height
		});
	}
});

Crafty.c('Start', {
	init: function() {
		this.requires('2D, Canvas, Color, Grid')
		.color('rgb(62, 107, 133)')
		.attr({
			w: Game.Map.Tile.Width,
			h: Game.Map.Tile.Height
		});
	}
});

Crafty.c('End', {
	init: function() {
		this.requires('2D, Canvas, Color, Grid')
		.color('rgb(244, 146, 30)')
		.attr({
			w: Game.Map.Tile.Width,
			h: Game.Map.Tile.Height
		});
	}
});

SessionEntry = function(interactionIndex) {
	this.Timestamp = new Date().getTime();
	this.InteractionIndex = interactionIndex;
	this.Value = 2;
	this.Score = 0.0;
	this.SetValue = function() {
		var score = Math.log(this.Value);
		
		var seconds = ((new Date().getTime()) - this.Timestamp) / 1000;
		if (seconds > 15) {
			var x = seconds - 1;
			score = score * Math.exp(-8 * x * x);
		}

		this.Score = score;
	}
}

$(document).ready(function () {
	$('#pauseUpdate').click(function () {
		if (Game.IsHalted) {
			Game.Unhalt();
		} else {
			Game.Halt();
		}
	});
});

setInterval(function(){ Game.MonitorActivity(); }, 10);

Crafty.scene('Game', function() {
	Game.Map.New();
	
	Game.Ended = false;
	
	fetchClusters();
	
	Game.LastCell.X = 1;
	Game.LastCell.Y = 1;
		
	Crafty.e('PlayerCharacter').at(1, 1);
	
	Game.CheckVisibleElements({x: 1, y: 1});
}, function() {

});

Game = {
	Ended: false,
	LastCell: {
		X: 1,
		Y: 1
	},
	EndCondition: function() {
		if (!this.Ended) {
			this.Ended = true;
		
			$.ajax({
				type: "POST",
				url: 'srv/AjaxHandler.php',
				data: {method: 'submitsession', session: JSON.stringify(Game.Analysation.Session)}
			}).done(function(msg) {
				Crafty.scene('Game');
			});
		}
	},
	MonitorActivity: function() {
		if (!this.IsHalted) {
			var lastTickSeconds = this.LastTick / 1000;
			if ((new Date().getTime() / 1000) - lastTickSeconds >= 5) {
				alert('Auto pause due to inactivity! Move the player or hit continue to continue playing.');
				this.Halt();
			}
		}
	},
	UpdateMs: 100,
	LastTick: new Date().getTime(),
	AnalysationTimer: null,
	IsHalted: true,
	Unhalt: function() {
		if (this.IsHalted) {
			this.AnalysationTimer = setInterval(function(){ Game.Analysation.UpdateScoreForIncrement(); }, this.UpdateMs);
			$('#pauseUpdate').html('Pause Update');
		}
		
		$('#updateInterval').val(this.UpdateMs);
		
		this.IsHalted = false;
	},
	Halt: function() {
		if (!this.IsHalted) {
			window.clearInterval(this.AnalysationTimer);
			$('#pauseUpdate').html('Continue Update');
		}
		
		$('#updateInterval').val(this.UpdateMs);
		
		this.IsHalted = true;
	},
	CheckVisibleElements: function(p) {
		for (x = 0 ; x < this.Map.Size * 2 + 1 ; ++x) {
			for (y = 0 ; y < this.Map.Size * 2 + 1 ; ++y) {
				if (this.Map.Data[x][y] == 1) {
					this.Map.Blocks[x][y].attr({visible: false});
				}
			}
		}
		
		x = Math.round(p.x);
		y = Math.round(p.y);
	
		if (this.Map.Blocks[x - 1]) { var e0  = this.Map.Blocks[x - 1][y - 1]; if (e0) { e0.visible = true; } }
									  var e1  = this.Map.Blocks[x][y - 1];     if (e1) { e1.visible = true; }
		if (this.Map.Blocks[x + 1]) { var e2  = this.Map.Blocks[x + 1][y - 1]; if (e2) { e2.visible = true; } }
		if (this.Map.Blocks[x - 1]) { var e3  = this.Map.Blocks[x - 1][y];     if (e3) { e3.visible = true; } }
		if (this.Map.Blocks[x + 1]) { var e4  = this.Map.Blocks[x + 1][y];     if (e4) { e4.visible = true; } }
		if (this.Map.Blocks[x - 1]) { var e5  = this.Map.Blocks[x - 1][y + 1]; if (e5) { e5.visible = true; } }
									  var e6  = this.Map.Blocks[x][y + 1];     if (e6) { e6.visible = true; }
		if (this.Map.Blocks[x + 1]) { var e7  = this.Map.Blocks[x + 1][y + 1]; if (e7) { e7.visible = true; } }
		if (this.Map.Blocks[x + 2]) { var e8  = this.Map.Blocks[x + 2][y];     if (e8) { e8.visible = true; } }
		if (this.Map.Blocks[x - 2]) { var e9  = this.Map.Blocks[x - 2][y];     if (e9) { e9.visible = true; } }
									  var e10 = this.Map.Blocks[x][y + 2];     if (e10) { e10.visible = true; }
								      var e11 = this.Map.Blocks[x][y - 2];     if (e11) { e11.visible = true; }
	},
	Analysation: {
		Session: [],
		RawSession: [],
		New: function() {
			this.Session = [0, 0, 0, 0, 0, 0];
			this.RawSession = [];
		},
		UpdateScoreForIncrement: function() {
			var entry = new SessionEntry(activeInteractionIndex);
			this.RawSession.push(entry);
			
			for (i = 0 ; i < this.RawSession.length ; ++i) {
				this.RawSession[i].SetValue();
			}
			
			this.Session = [0, 0, 0, 0, 0, 0];
			for (i = 0 ; i < this.RawSession.length ; ++i) {
				var index = this.RawSession[i].InteractionIndex;
				this.Session[index] += this.RawSession[i].Score;
			}
			
			$('#data').html('Raw session length: ' + this.RawSession.length + '<br/>' + dump(this.Session));
			
			var graphData = [];
			for (i = 0 ; i < this.Session.length ; ++i) {
				var d = [];
				d[0] = i;
				d[1] = this.Session[i];
				
				graphData.push(d);
			}
			
			updateGraph(graphData);
		}
	},
	Map: {
		Size: 12,
		Tile: {
			Width:  16,
			Height: 16
		},
		BackX: [],
		BackY: [],
		Data: [],
		Blocks: [],
		Visited: [],
		New: function() {
			Game.Analysation.New();
		
			this.Data = [];
			this.Blocks = [];
			this.Visited = [];
			var s = this.Size * 2 + 1;
			for (i = 0 ; i < s ; ++i) {
				this.Data[i] = [];
				this.Blocks[i] = [];
				this.Visited[i] = [];
			}
			for (a = 0 ; a < s ; ++a) {
				for (b = 0 ; b < s ; ++b) {
					if (a % 2 == 0 || b % 2 == 0) {
						this.Data[a][b] = 1;
					} else {
						this.Data[a][b] = 0;
					}
				}
			}
			
			this.BackX[0] = 1;
			this.BackY[0] = 1;
			
			for (i = 1 ; i < s ; ++i) {
				this.BackX[i] = this.BackY[i] = 0;
			}
			
			this.Generate(0, 1, 1, 1);
			
			for (x = 0 ; x < this.Size * 2 + 1 ; ++x) {
				for (y = 0 ; y < this.Size * 2 + 1 ; ++y) {
					if (this.Data[x][y] == 1) {
						this.Blocks[x][y] = Crafty.e('Block').attr({visible: false}).at(x, y);
					} else if (this.Data[x][y] == 2) {
						this.Blocks[x][y] = Crafty.e('Start').at(x, y);
					} else if (this.Data[x][y] == 3) {
						this.Blocks[x][y] = Crafty.e('End').at(x, y);
					}
				}
			}
		},
		Generate: function(i, x, y, visited) {
			if (visited < this.Size * this.Size) {
				var neighbourValid = -1; 
				var neighbourX = [0, 0, 0, 0];
				var neighbourY = [0, 0, 0, 0];
				var step       = [0, 0, 0, 0];
				var xn = 0;
				var yn = 0;
				
				if (x - 2 > 0 && this.IsClosed(x - 2, y)) {
					++neighbourValid;
					neighbourX[neighbourValid] = x - 2;
					neighbourY[neighbourValid] = y;
					step[neighbourValid] 	   = 1;
				}
				if (y - 2 > 0 && this.IsClosed(x, y - 2)) {
					++neighbourValid;
					neighbourX[neighbourValid] = x;
					neighbourY[neighbourValid] = y - 2;
					step[neighbourValid] 	   = 2;
				}
				if (y + 2 < this.Size * 2 + 1 && this.IsClosed(x, y + 2)) {
					++neighbourValid;
					neighbourX[neighbourValid] = x;
					neighbourY[neighbourValid] = y + 2;
					step[neighbourValid] 	   = 3;
				}
				if (x + 2 < this.Size * 2 + 1 && this.IsClosed(x + 2, y)) {
					++neighbourValid;
					neighbourX[neighbourValid] = x + 2;
					neighbourY[neighbourValid] = y;
					step[neighbourValid] 	   = 4;
				}
				
				if (neighbourValid == -1) {
					xn = this.BackX[i];
					yn = this.BackY[i];
					--i;
				} else {
					var randomization = neighbourValid + 1;
					var random = Math.floor(Math.random() * randomization);
				
					xn = neighbourX[random];
					yn = neighbourY[random];
					++i;
					
					this.BackX[i] = xn;
					this.BackY[i] = yn;
					
					var rstep = step[random];
					
					if (rstep == 1) {
						this.Data[xn + 1][yn] = 0;
					} else if (rstep == 2) {
						this.Data[xn][yn + 1] = 0;
					} else if (rstep == 3) {
						this.Data[xn][yn - 1] = 0;
					} else if (rstep == 4) {
						this.Data[xn - 1][yn] = 0;
					}
					
					++visited;
				}
				
				this.Generate(i, xn, yn, visited);
			}
			
			this.Data[1][1] = 2;
			this.Data[this.Size * 2 - 1][this.Size * 2 - 1] = 3;
		},
		Print: function() {
			var s = '';
			for (a = 0 ; a < this.Size * 2 + 1 ; ++a) {
				for (b = 0 ; b < this.Size * 2 + 1 ; ++b) {
					if (this.Data[a][b] == 1) {
						s += '#';
					} else if (this.Data[a][b] == 2) {
						s += 'S';
					} else if (this.Data[a][b] == 3) {
						s += 'F';
					} else {
						s += ' ';
					}
				}
				
				s += "\n";
			}
			
			console.log(s);
		},
		IsClosed: function(x, y) {
			return this.Data[x - 1][y] && this.Data[x][y - 1] && this.Data[x][y + 1] && this.Data[x + 1][y];
		}
	},
	Width: function() {
		return (this.Map.Size * 2 + 1) * this.Map.Tile.Width;
	},
	Height: function() {
		return (this.Map.Size * 2 + 1) * this.Map.Tile.Height;
	},
	Start: function() {
		Crafty.init(Game.Width(), Game.Height());
		Crafty.background('rgb(197, 210, 219)');
		
		Crafty.scene('Game');
	}
}

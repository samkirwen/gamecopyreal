var myId="3";

var land;

var shadow;
var tank;
var turret;
var player;
var tanksList;
var explosions;

var logo;


var cursors;
var wasd;

var bullets;
var fireRate = 200;
var nextFire = 0;

var ready = false;
var messages = {};
var count = 0;

var socket;
//this function will handle client communication with the server
var socketClientSetup = function() {
	//create an instance of eureca.io client
	socket = io.connect();
    
    // Connect
    socket.on('setId', function (id, name) {
        myId = id;
        console.log(myId);
        create(name);
        socket.emit('handshake');
        ready = true;
    });
    
    socket.on('kill', function (id) {
		if (tanksList[id]) {
			tanksList[id].kill();
		}
    });
    
    socket.on('receiveMessage', function (msg) {
        console.log("message received!");
        messages[count] = msg;
        count++;
        
        // post chat messages;
        try{
            var count2 = messages;
            for(var m in messages){
                var text = messages[count2].name + ": " + messages[count2].text;
                count2++;
                
                var style = { font: "15px Arial", fill: "#000000", align: "center" };
                console.log("height: " + game.world.height );
                var t = game.add.text(40, 800 - 50 - (20*count2), text, style);
            }
        }
        catch(e){
            console.log(e);
        }
    });

   socket.on('spawnEnemy', function(i, x, y, n) {
		if (i == myId){ return; } //this is me
		console.log('SPAWN: ' + i + game + tank);
		var tnk = new Tank(i, game, tank);
		tnk.name = n;
		tanksList[i] = tnk;
    });
    
    socket.on('damage', function(id) {
        console.log("bullet hit: " + id);
        tanksList[id].health -= 5;
        console.log("health: " + tanksList[id].health);
    });
    
   socket.on('updateState', function(id, state) {
        if (tanksList[id] && id != myId)  {
            tanksList[id].cursor = state;
            tanksList[id].tank.x = state.x;
            tanksList[id].tank.y = state.y;
            //tanksList[id].tank.name = id;
            tanksList[id].tank.angle = state.angle;
            tanksList[id].turret.rotation = state.rot;
            tanksList[id].update();
        }
    });
    
}

Tank = function (index, game, player) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
		fire:false		
	}

	this.input = {
		left:false,
		right:false,
		up:false,
		fire:false
	}
	
	this.kill = function() {
        var bot = game.add.sprite(this.tank.x, this.tank.y, 'kaboom');
        bot.animations.add('kaboom');
        bot.animations.play('kaboom', 30, false, true);

        this.alive = false;
        this.text.setText("");
        this.healthtext.setText("");
        this.tank.kill();
        this.turret.kill();
        this.shadow.kill();
        delete tanksList[this.id];
        
        //respawn button
        //var button = game.add.button(game, 10, 10, 'respawn', Respawn(this.name), 2, 1, 0);
        if(this.tank.id == myId){ Respawn(this.name); }
	}

    var x = 0;
    var y = 0;

    this.game = game;
    this.health = 30;
    this.player = player;
    this.bullets = game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(20, 'bullet', 0, false);
    this.bullets.setAll('anchor.x', 0.5);
    this.bullets.setAll('anchor.y', 0.5);
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);	
    
    this.name = "";
    var style = { font: "20px Arial", fill: "#000000", wordWrap: true, wordWrapWidth: 100, align: "center" };
    this.text = game.add.text(x, y, this.name, style);
    this.healthtext = game.add.text(x, y, this.name, style);
	this.text.anchor.set(0.5);
	this.healthtext.anchor.set(0.5);
	
	this.currentSpeed =0;
    this.fireRate = 200;
    this.nextFire = 0;
    this.alive = true;

    this.shadow = game.add.sprite(x, y, 'enemy', 'shadow');
    this.tank = game.add.sprite(x, y, 'enemy', 'tank1');
    this.turret = game.add.sprite(x, y, 'enemy', 'turret');

    this.shadow.anchor.set(0.5);
    this.tank.anchor.set(0.5);
    this.turret.anchor.set(0.3, 0.5);

    this.tank.id = index;
    game.physics.enable(this.tank, Phaser.Physics.ARCADE);
    this.tank.body.immovable = false;
    this.tank.body.collideWorldBounds = true;
    this.tank.body.bounce.setTo(0, 0);

    this.tank.angle = 0;

    game.physics.arcade.velocityFromRotation(this.tank.rotation, 0, this.tank.body.velocity);

};

function Respawn (name) {
    console.log("respawn");
    player = new Tank(myId, game, tank);
	player.name = name;
	tanksList[myId] = player;
	tank = player.tank;
	turret = player.turret;
	tank.x=0;
	tank.y=0;
	bullets = player.bullets;
	shadow = player.shadow;	
	tank.bringToTop();
    turret.bringToTop();
    
    game.camera.follow(tank); // focus camera on new tank
    game.camera.focusOnXY(0, 0);
    
    socket.emit('reSpawn', name);
}

Tank.prototype.update = function() {
		
 var inputChanged = (
        this.cursor.left != this.input.left ||
        this.cursor.right != this.input.right ||
        this.cursor.up != this.input.up ||
        this.cursor.down != this.input.down ||
        this.cursor.fire != this.input.fire
    );
    
    //this.speed = 10;
    
    if (inputChanged)
    {
        //Handle input change here
        //send new values to the server        
        if (this.tank.id == myId)
        {
            // send latest valid state to the server
            this.input.x = this.tank.x;
            this.input.y = this.tank.y;
            this.input.angle = this.tank.angle;
            this.input.rot = this.turret.rotation;
            
            socket.emit('handleKeys', this.input);
        }
    }
    
    if(this.alive){
    this.text.x = this.tank.x;
    this.text.y = this.tank.y - 45;
    this.text.setText(this.name);
    
    this.healthtext.x = this.tank.x;
    this.healthtext.y = this.tank.y + 45;
    this.healthtext.setText(this.health);
    }

	 if (this.cursor.fire)
    {	
		this.fire({x:this.cursor.tx, y:this.cursor.ty});
    }
	
    this.shadow.x = this.tank.x;
    this.shadow.y = this.tank.y;
    this.shadow.rotation = this.tank.rotation;

    this.turret.x = this.tank.x;
    this.turret.y = this.tank.y;
};


Tank.prototype.fire = function(target) {
		if (!this.alive) return;
        if (this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
        {
            this.nextFire = this.game.time.now + this.fireRate;
            var bullet = this.bullets.getFirstDead();
            bullet.owner = this.tank.id;
            bullet.reset(this.turret.x, this.turret.y);

			bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, 1000);
        }
}

var game = new Phaser.Game(1200, 800, Phaser.AUTO, 'phaser-example', { preload: preload, create: socketClientSetup, update: update, render: render });
var map;
var layer;
var layer2;

function preload () {

    game.load.tilemap('newmap', 'map/newmap.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('ground1', 'map/ground1.png');
    game.load.image('ruinbuild1', 'map/ruinbuild1.png');
    game.load.image('road1destroy', 'map/road1destroy.png');
    game.load.image('road1', 'map/road1.png');

    game.load.atlas('tank', 'assets/tanks.png', 'assets/tanks.json');
    game.load.atlas('enemy', 'assets/enemy-tanks.png', 'assets/tanks.json');
    game.load.image('logo', 'assets/logo.png');
    game.load.image('bullet', 'assets/bullet.png');
    game.load.image('earth', 'assets/scorched_earth.png');
    game.load.spritesheet('kaboom', 'assets/explosion.png', 64, 64, 23);
    
}



function create (name) {
    
    game.stage.backgroundColor = '#787878';
    map = game.add.tilemap('newmap');
    map.addTilesetImage('set', 'ground1');
    map.addTilesetImage('building', 'ruinbuild1');
    map.addTilesetImage('brokenroad', 'road1destroy');
    map.addTilesetImage('road', 'road1');
    layer = map.createLayer('Tile Layer 1');
    layer2 = map.createLayer('objects');
    //layer2.enableBody = true;
    //map.setCollisionBetween(1, 100000, true, 'objects');
    layer.resizeWorld();
    //game.physics.arcade.enable(layer2, Phaser.Physics.ARCADE, true);
    
    /*
    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);
	game.stage.disableVisibilityChange  = true;
	
    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 1200, 800, 'earth');
    land.fixedToCamera = true;
    */
    tanksList = {};
	
	player = new Tank(myId, game, tank);
	player.name = name;
	console.log(name);
	tanksList[myId] = player;
	tank = player.tank;
	turret = player.turret;
	tank.x=0;
	tank.y=0;
	bullets = player.bullets;
	shadow = player.shadow;	

    //  Explosion pool
    explosions = game.add.group();

    for (var i = 0; i < 10; i++)
    {
        var explosionAnimation = explosions.create(0, 0, 'kaboom', [0], false);
        explosionAnimation.anchor.setTo(0.5, 0.5);
        explosionAnimation.animations.add('kaboom');
    }

    tank.bringToTop();
    turret.bringToTop();
		
    logo = game.add.sprite(0, 200, 'logo');
    logo.fixedToCamera = true;

    game.input.onDown.add(removeLogo, this);
    

    game.camera.follow(tank);
    //game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();
    
    wasd = {
                up: game.input.keyboard.addKey(Phaser.Keyboard.W),
                down: game.input.keyboard.addKey(Phaser.Keyboard.S),
                left: game.input.keyboard.addKey(Phaser.Keyboard.A),
                right: game.input.keyboard.addKey(Phaser.Keyboard.D),
            };
	
	setTimeout(removeLogo, 1000);
	
}

function removeLogo () {
    game.input.onDown.remove(removeLogo, this);
    logo.kill();
}

function update () {
	//do not update if client not ready
	if (!ready) return;
	
    // Collision with object layer
    game.physics.arcade.collide(tank, map.layer2);
    
	player.input.left = cursors.left.isDown || wasd.left.isDown;
	player.input.right = cursors.right.isDown || wasd.right.isDown;
	player.input.up = cursors.up.isDown || wasd.up.isDown;
	player.input.down =  cursors.down.isDown || wasd.down.isDown;
	player.input.fire = game.input.activePointer.isDown;
	player.input.tx = game.input.x+ game.camera.x;
	player.input.ty = game.input.y+ game.camera.y;
	
	this.speed = 10;
		    if (player.input.left)
    {
        tank.x -= this.speed;
    }
    
        if (player.input.right)
    {
        tank.x += this.speed;
    }
    
    	
	    if (player.input.up)
    {
        tank.y -= this.speed;
    }
    
        if (player.input.down)
    {
        tank.y += this.speed;
    }
	
	    if (player.input.fire )
    {	
      fire();
    }
	
	turret.rotation = game.physics.arcade.angleToPointer(turret);	
    //land.tilePosition.x = -game.camera.x;
   // land.tilePosition.y = -game.camera.y;
    
    shadow.x = tank.x;
    shadow.y = tank.y;
    shadow.rotation = tank.rotation;

    turret.x = tank.x;
    turret.y = tank.y;
    

    turret.rotation = game.physics.arcade.angleToPointer(turret);

    	
	
    for (var i in tanksList)
    {
		if (!tanksList[i]) continue;
		var curBullets = tanksList[i].bullets;
		var curTank = tanksList[i].tank;
		for (var j in tanksList)
		{
			if (!tanksList[j]) continue;
			if (j!=i) 
			{
			    //console.log(tanksList[j].tank.id);
				var targetTank = tanksList[j].tank;
				
				game.physics.arcade.overlap(curBullets, targetTank, bulletHitPlayer, null, this);
			
			}
			if (tanksList[j].alive)
			{
				tanksList[j].update();
			    }
			}			
    }
}

function fire () {

    if (game.time.now > nextFire && bullets.countDead() > 0)
    {
        nextFire = game.time.now + fireRate;

        var bullet = bullets.getFirstExists(false);
        bullet.owner = tank.id;
        
        bullet.reset(turret.x, turret.y);
        
        //var rotation = game.physics.arcade.angleToPointer();
        //bullet.rotation = game.physics.arcade.velocityFromRotation(turret.angle, 400, bullet);
        bullet.rotation = game.physics.arcade.moveToPointer(bullet, 1000, game.input.activePointer);
    }

}

function bulletHitPlayer (tank, bullet) {
    // only register damage if it's the owner's bullet
    if(bullet.owner == myId){
    socket.emit('damageDone', tank.id);
    }
    
    // kill if not sender
    if(bullet.owner != tank.id){
        bullet.kill();
    }
}

function render () {}




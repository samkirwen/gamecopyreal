//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];
var clients = {};
var count = 0;

// Setting amount of data logged, lower = less info
io.set('log level', 1);

io.on('connection', function (socket) {

    socket.on('makeConnection', function(name) {
      if(name == ''){ return; }
      
      // Keep track of connections
      clients[socket.id] = socket;
      clients[socket.id].name = name;
      clients[socket.id].health = 30;
      console.log(socket.id + " connected");
      clients[socket.id].emit('setId', socket.id, name);
      
        // If person, start game. Else, spawn enemy.
      io.sockets.emit('spawnEnemy', socket.id, 10, 10, name );
  });
  
  socket.on('reSpawn', function(name) {
      if(name == ''){ return; }
      clients[socket.id].health = 30;
      console.log(socket.id + " respawned");

        // If person, start game. Else, spawn enemy.
      io.sockets.emit('spawnEnemy', socket.id, 10, 10, name );
  });
  
  socket.on('sendMessage', function(msg) {
      if(msg == ''){ return; }
      var message = {text:"no message", name:"no name", date:Date.now()};
      message.text = msg;
      message.name = clients[socket.id].name;
      message.date = Date.now();
      messages[count] = message;
      count++;
      console.log("sending receiveMessage");
      io.sockets.emit('receiveMessage', message);
  });
  
  socket.on('disconnect', function() {
    delete clients[socket.id]; // delete the client from the list
    io.sockets.emit('kill',  socket.id); // destroy tank on client
    console.log(socket.id + " disconnected");
  });
  
    socket.on('damageDone', function(id) {
      try{
      clients[id].health -= 5;
    io.sockets.emit('damage',  id); // destroy tank on client
    if(clients[id].health <= 0){
      io.sockets.emit('kill',  id);
    }
      }
      catch(e){
        console.log(e);
      }
  });
  
  // Handle key presses
  socket.on('handleKeys', function(keys){
    var updatedClient = clients[socket.id];
    
     for (var c in clients)
    {
      try{
        clients[c].emit('updateState', updatedClient.id, keys);

        //keep last known state so we can send it to new connected clients
        clients[c].laststate = keys;
      }
      catch(a){
        console.log("error: " + a);
        console.log("probably unable to get updatedClient.id");
      }
    }
  });
  
  //Synchronize on connect
   socket.on('handshake', function() {
    for (var c in clients)
    {
            //send latest known position
            if(clients[c].laststate != null){
            socket.emit('spawnEnemy', clients[c].id, clients[c].laststate.x, clients[c].laststate.y, clients[c].name );      
            socket.emit('updateState',  clients[c].id, clients[c].laststate);
            }
    }
  });
});

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}


function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

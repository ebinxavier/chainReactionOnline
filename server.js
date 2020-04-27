const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let roomId = 1167;

const roomsDetails = {}


io.on('connection', (socket) => { 
    console.log('Connected');
    
    socket.on('init',(data, cb)=>{
        cb('connected to server');
    })

    socket.on('message',(data)=>{
        socket.broadcast.emit('data',{data:data});
    })

    socket.on('subscribe', function(room, cb) { 
        console.log('joining room', room);
        socket.join(room); 
        var count = io.sockets.adapter.rooms[room].length;
        cb({count: count});
        console.log('room.length', count)
    })

    socket.on('unsubscribe', function(room) {  
        console.log('leaving room', room);
        socket.leave(room); 
    })

    socket.on('start', function(data) {
        socket.broadcast.to(data.room).emit('start', data);
    });

    socket.on('send', function(data) {
        console.log('sending message');
        socket.broadcast.to(data.room).emit('message', data);
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});

const port = process.env.PORT || 4999;
server.listen(port, ()=>{
    console.log("App is listening in port: "+port);
})

app.use(express.static('client'))

app.get('/',(req,res)=>{
    res.sendFile(__dirname+'/client/index.html');
})

app.get('/game',(req,res)=>{
    res.sendFile(__dirname+'/client/game.html');
})

app.get('/create-room',(req,res)=>{
    res.sendFile(__dirname+'/client/create-room.html');
})

app.get('/create-room-submit',(req,res)=>{

    res.send({roomId: roomId+'-'+req.query.players});
    roomId++;
})

app.get('/join-room',(req,res)=>{
    // console.log(req.query)
    res.sendFile(__dirname+'/client/join-room.html');
})

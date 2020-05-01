const socket = io();

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 120;
// camera.rotation.x = Math.PI/4;


var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}


var width = 20;
var height = 45;
var w=5; // cell width
var maxColumns = parseInt(width/w);
var maxRows = parseInt(height/w);
var board = [];
var colors = ['red', 'green', 'blue', 'yellow', 'pink', 'orange', 'cyan', 'lightgreen'];
var playersCount = Number(getQueryParam('roomId').split('-')[1]);
var currentPlayer = 0;
var gameOver = false;
var playersAvailable =[];
var oneRoundCompleted = false;
var playerId;
var base;


for(var i=0;i<playersCount;i++) playersAvailable.push(i);

function drawCell(x, y, w, i, j, color=0xff0000){
    // Meshes
    var material = new THREE.LineBasicMaterial({
        color: color
    });
    
    var points = [];
    points.push( new THREE.Vector3( x-w, y-w, -1 ) );
    points.push( new THREE.Vector3( x+w, y-w, -1 ) );
    points.push( new THREE.Vector3( x+w, y+w, -1 ) );
    points.push( new THREE.Vector3( x-w, y+w, -1 ) );
    points.push( new THREE.Vector3( x-w, y-w, -1 ) );
    
    var geometry = new THREE.BufferGeometry().setFromPoints( points );
    
    var line = new THREE.Line( geometry, material );
    line.castShadow = true; //default is false
    line.receiveShadow = false; //default
    line.name = 'line,'+i+','+j;
    scene.add(line);


    geometry = new THREE.PlaneGeometry( w*2, w*2 );
    material = new THREE.MeshBasicMaterial( {color: 0xffff00, visible:false} );
    var plane = new THREE.Mesh( geometry, material );
    plane.position.x = x;
    plane.position.y = y;
    plane.position.z = -1;
    plane.name = 'plane,'+i+','+j;
    scene.add( plane );
}
function init(){

    // THREE JS 

    // Ambient Light
    var light = new THREE.AmbientLight( 0x404040, 1.5 ); // soft white light
    scene.add( light );

    // Spotlight
    var spotLight = new THREE.SpotLight( 0xffffff, 1 );
    spotLight.position.set( 25, 0 , 10 );

    spotLight.castShadow = true;

    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;

    spotLight.shadow.camera.near = 500;
    spotLight.shadow.camera.far = 4000;
    spotLight.shadow.camera.fov = 30;

    scene.add( spotLight );


    // Base 
    var geometry = new THREE.BoxGeometry(width+9, height+9, 1);
    var material = new THREE.MeshBasicMaterial( { color: 0x111111 } );
    base = new THREE.Mesh( geometry, material );

    base.receiveShadow = true;
    base.position.z=-5;
    scene.add( base );

    var geometry = new THREE.BoxGeometry(width+10, height+10, -1);
    var material = new THREE.MeshBasicMaterial( { color: 0x0 } );
    base = new THREE.Mesh( geometry, material );

    base.receiveShadow = true;
    base.position.z=-5;
    scene.add( base );
    
    // Cells

    for(var x=0, i=0 ;x<=width; x+=w, i++)
        for(var y=0, j=0;y<=height;y+=w,j++){
            drawCell(x - width/2,y-height/2, w/2, i, j)
        }
}
init();

function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}
animate();



// Game Play

function changeCellColor(color){
    scene.traverse(item=>{
        if(item.name.indexOf('line')!==-1){
            item.material.color.set(color)
        }
    })
}

function isCorner(x,y){
    return((x=== 0 || x=== maxColumns) && (y === 0 || y === maxRows))
}

function isEdge(x, y){
    return !isCorner(x, y) && (x === maxColumns || y === maxRows || x === 0 || y === 0 )
}

function isCenter(x, y){
    return !isCorner(x,y) && !isEdge(x,y);
}

function isInside(x,y){
    return x>=0 && x<=maxColumns && y>=0 && y<= maxRows;
}

function getNeighbours(x, y){
    var neighours =[];
    var p1 = [x+1, y];
    var p2 = [x-1, y];
    var p3 = [x, y+1];
    var p4 = [x, y-1];
    if(isInside(...p1)) neighours.push(p1);
    if(isInside(...p2)) neighours.push(p2);
    if(isInside(...p3)) neighours.push(p3);
    if(isInside(...p4)) neighours.push(p4);
    return neighours;
}

function animateAtomBreakout(from, to, atom){
    scene.add(atom);
    var dx = (from.x - to.x)/10;
    var dy = (from.y - to.y)/10;
    return new Promise((resolve)=>{
        var counter = 0;
        atom.position.x = from.x;
        atom.position.y = from.y;
        var id = setInterval(()=>{
            atom.position.x-= dx;
            atom.position.y-= dy;
            if(counter=== 10) {
                clearInterval(id);
                scene.remove(atom);
                resolve();
            }
            counter++;
        }, 20)
    })
}

function checkGameOver(){
    if(oneRoundCompleted){
        var result = new Set();
        board.forEach(row=>{
            row.forEach(cell=>{
                if(cell[0] && cell[0].color) result.add(cell[0] && cell[0].color)
            })
        })
        gameOver = Array.from(result).length===1;
    }
}

function checkPlayerExist(color){
    var exist = false;
    board.forEach(row=>{
        row.forEach(cell=>{
            if(cell[0] && cell[0].color === color) exist = true;
        })
    })
    return exist;
}

function updatePlayersAvailable(){
    var newPlayers = playersAvailable.filter(e=>{
        return checkPlayerExist(colors[e])
    })
    if(playersAvailable.length !== newPlayers.length){
        // playersAvailable = newPlayers;
        console.log("One Player Out!");
    }
    return newPlayers;
}

var isAnimating = 0;
async function addNewAtom(x,y, color, breakingOut = false){ // Adds the atom to the cell
    if(gameOver) return;
    var geometry = new THREE.SphereGeometry( 1, 32, 32 );
    var nodeMaterial = new THREE.MeshPhongMaterial( { 
        color: color,
        specular: 0x050505,
        shininess: 80
    } ) 
    var sphere = new THREE.Mesh( geometry, nodeMaterial );
    if(breakingOut){
        isAnimating ++;
        await animateAtomBreakout(breakingOut, {x: x * w - width/2, y:y * w - height/2 }, sphere);
        isAnimating--;
        if(!isAnimating) {
            console.log("FN:Animation Done");
            findNextPlayer();
        }
        checkGameOver();
        if(gameOver) {
            console.log("Game Over", color, 'Won')
            onOverlay(color[0].toUpperCase()+color.slice(1)+" Won!");
        }
    }

    sphere.position.x = x * w - width/2;
    sphere.position.y = y * w - height/2;
    sphere.color = color;
    if(!board[x]) board[x] = [];
    if(!board[x][y]) board[x][y] = [];
    
    var shouldAddSphere = true;
    var breakedOut=false;
    switch(board[x][y].length){
        case 1: 
                if(isCorner(x,y)){ // Breakout
                    board[x][y].forEach(e=>scene.remove(e));
                    board[x][y] = [];
                    var neighours = getNeighbours(x,y);
                    neighours.forEach(e=>{
                        addNewAtom(...e, color, {x: x * w - width/2, y:y * w - height/2 })
                    });
                    shouldAddSphere = false;
                    breakedOut = true;
                } else {
                    board[x][y][0].position.x-=.75;
                    sphere.position.x+=.75;
                }
            break;
        case 2: 
                if(isEdge(x,y)){ // Breakout
                    board[x][y].forEach(e=>scene.remove(e));
                    board[x][y] = [];
                    var neighours = getNeighbours(x,y);
                    neighours.forEach(e=>{
                        addNewAtom(...e, color, {x: x * w - width/2, y:y * w - height/2 })
                    });
                    shouldAddSphere = false;
                    breakedOut = true;
                } else {
                    board[x][y][0].position.y-=.55;
                    board[x][y][1].position.y-=.55;
                    sphere.position.y+=.55;
                }
            break;
        case 3: board[x][y].forEach(e=>scene.remove(e));
                board[x][y] = [];
                // Breakout
                var neighours = getNeighbours(x,y);
                neighours.forEach(e=>{
                    addNewAtom(...e, color, {x: x * w - width/2, y:y * w - height/2 })
                })
                shouldAddSphere = false;
                breakedOut = true;
            break;
    }
    if(shouldAddSphere){
        board[x][y].forEach(e=>{
            e.color = color;
            e.material.color.set(color);
        })
        board[x][y].push(sphere);
        scene.add( sphere );
    }
    if(!breakingOut && !breakedOut){ // breakedOut means this addition caused breaking
        console.log("FN:Normal Addition Done");
        findNextPlayer(true);
    }
}

var turn=0;
var timerId;

function findNextPlayer(noDelay = false){
    clearTimeout(timerId);
    timerId = setTimeout(()=>{
    if(isAnimating) return;
    if(oneRoundCompleted){
        var newPlayers = updatePlayersAvailable();
        do{
            turn++;
            currentPlayer = turn;
            currentPlayer %= playersCount;
        } while(!newPlayers.includes(currentPlayer))
    } else {
        turn++;
        currentPlayer = turn;
        currentPlayer %= playersCount;
    }

    console.log("Next Player: "+colors[playersAvailable[currentPlayer]]);
    changeCellColor(colors[playersAvailable[currentPlayer]]);
            
    },noDelay?0:500)
}

// Ray caster

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

function handleAddAtom(x, y, fromSocket = false){ // check whether the cell is free or of the same color
    checkGameOver();
    if((!board[x]) || (!board[x][y]) || (board[x][y].length === 0) || (board[x][y].length && board[x][y][0].color === colors[playersAvailable[currentPlayer]])){
        if(!fromSocket){
            socket.emit('send', { 
                room: getQueryParam('roomId'), 
                message: JSON.stringify({
                    x:x, 
                    y:y, 
                    color: colors[playersAvailable[currentPlayer]],
                })
            })
        }
        addNewAtom(x, y, colors[playersAvailable[currentPlayer]]);
        if(!oneRoundCompleted && currentPlayer === playersCount-1){
            oneRoundCompleted = true;
        }        
    }
}

function onClick(){
    if(colors[playerId] !== colors[playersAvailable[currentPlayer]]) return;
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
      // update the picking ray with the camera and mouse position
	raycaster.setFromCamera( mouse, camera );

	// calculate objects intersecting the picking ray
	var intersects = raycaster.intersectObjects( scene.children );

	for ( var i = 0; i < intersects.length; i++ ) {
        if(intersects[ i ].object.name.indexOf('plane')!==-1){
            var coords = intersects[ i ].object.name.split(',')
            var x = Number(coords[1]);
            var y = Number(coords[2]);
            handleAddAtom(x,y);
            break;
        }
	}

}

window.addEventListener( 'click', onClick, false );


// SOCKET.IO

socket.emit('subscribe', getQueryParam('roomId'), data=>{
    if(Number(getQueryParam('roomId').split('-')[1]) === data.count){
        socket.emit('start', { 
            room: getQueryParam('roomId'), 
            message: ""
        });
        offOverlay();
    }
    console.log(data)
    playerId = data.count-1;
    var color = new THREE.Color();
    color.set(colors[playerId]);
    base.material.color = color;
});

socket.on('message',(data)=>{
    const params = JSON.parse(data.message);
    handleAddAtom(params.x, params.y, true);
})

socket.on('start',()=>{
    offOverlay();
})


function getQueryParam(name){
    var value="";
    location.search.split('&').forEach(item=>{
        if(item.indexOf(name)!==-1){
            value = item.split(name+'=')[1]
        }
    })
    return value;
}


function preventClick(e){
    event.preventDefault();
    event.stopPropagation();
}

function onOverlay(text) {
    document.getElementById('text').innerText = text;
    document.getElementById("overlay").style.display = "block";
    document.getElementById("home").style.display = "block";
}

function offOverlay() {
    document.getElementById("overlay").style.display = "none";
}
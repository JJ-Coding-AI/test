const boardElem = document.getElementById('board');
const handElems = [document.getElementById('hand0'), document.getElementById('hand1')];
const turnElem = document.getElementById('turn');
const undoBtn = document.getElementById('undo');

let history = [];
let highlights = [];

// piece definitions
const PIECES = {
  FU: {name:'歩', move:[[0,-1]], promote:'TO'},
  KY: {name:'香', move:[[0,-1]], slide:true, promote:'NY'},
  KE: {name:'桂', jump:[[1,-2],[-1,-2]], promote:'NK'},
  GI: {name:'銀', move:[[0,-1],[1,-1],[-1,-1],[1,1],[-1,1]], promote:'NG'},
  KI: {name:'金', move:[[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1]]},
  KA: {name:'角', diag:true, slide:true, promote:'UM'},
  HI: {name:'飛', ortho:true, slide:true, promote:'RY'},
  OU: {name:'王', move:[[0,-1],[1,-1],[-1,-1],[0,1],[1,1],[-1,1],[1,0],[-1,0]]},
  TO: {name:'と', move:[[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1]], base:'FU'},
  NY: {name:'成香', move:[[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1]], base:'KY'},
  NK: {name:'成桂', move:[[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1]], base:'KE'},
  NG: {name:'成銀', move:[[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1]], base:'GI'},
  UM: {name:'馬', diag:true, slide:true, move:[[0,-1],[1,0],[-1,0],[0,1]], base:'KA'},
  RY: {name:'竜', ortho:true, slide:true, move:[[1,1],[1,-1],[-1,1],[-1,-1]], base:'HI'}
};

const START = [
  ['KY','KE','GI','KI','OU','KI','GI','KE','KY'],
  [null,'HI',null,null,null,null,null,'KA',null],
  ['FU','FU','FU','FU','FU','FU','FU','FU','FU'],
  [null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null],
  ['fu','fu','fu','fu','fu','fu','fu','fu','fu'],
  [null,'ka',null,null,null,null,null,'hi',null],
  ['ky','ke','gi','ki','ou','ki','gi','ke','ky']
];

let board = [];
let hands = [[],[]];
let turn = 0; //0: sente, 1: gote

function cloneState() {
  return {board: JSON.parse(JSON.stringify(board)), hands: JSON.parse(JSON.stringify(hands)), turn};
}

function loadStart() {
  board = START.map(row => row.map(code => {
    if(!code) return null;
    const owner = code === code.toUpperCase() ? 0 : 1;
    const type = code.toUpperCase();
    return {type, owner};
  }));
  hands = [[],[]];
  turn = 0;
}

function renderBoard() {
  boardElem.innerHTML = '';
  for(let y=0;y<9;y++){
    for(let x=0;x<9;x++){
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((x+y)%2? 'dark':'');
      cell.dataset.x=x; cell.dataset.y=y;
      cell.addEventListener('dragover', e=>e.preventDefault());
      cell.addEventListener('drop', onDrop);
      boardElem.appendChild(cell);
      if(board[y][x]){
        const piece = createPieceElement(board[y][x]);
        cell.appendChild(piece);
      }
    }
  }
  updateHands();
  turnElem.textContent = '手番: ' + (turn===0?'先手':'後手');
}

function clearHighlights(){
  highlights.forEach(c=>c.classList.remove('highlight'));
  highlights=[];
}

function showHighlights(moves){
  clearHighlights();
  moves.forEach(m=>{
    const cell = document.querySelector(`.cell[data-x="${m.x}"][data-y="${m.y}"]`);
    if(cell){
      cell.classList.add('highlight');
      highlights.push(cell);
    }
  });
}

function createPieceElement(p){
  const el = document.createElement('div');
  el.className = 'piece' + (p.owner===1?' owner1':'');
  el.textContent = PIECES[p.type].name;
  el.draggable = true;
  el.dataset.owner=p.owner;
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragend', clearHighlights);
  return el;
}

function onDragStart(e){
  const parent = e.target.parentElement;
  const fromX = parent.dataset.x;
  const fromY = parent.dataset.y;
  const hand = parent.dataset.hand;
  e.dataTransfer.setData('text/plain', JSON.stringify({fromX,fromY,hand}));
  if(!hand){
    const p = board[fromY][fromX];
    const moves = getLegalMoves(p, +fromX, +fromY);
    showHighlights(moves);
  } else {
    const p = hands[hand][e.target.dataset.index];
    const moves = getDropCells(p);
    showHighlights(moves);
  }
}

function onDrop(e){
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  const toX = e.currentTarget.dataset.x;
  const toY = e.currentTarget.dataset.y;
  movePiece(data, {x:toX,y:toY});
  clearHighlights();
}

function movePiece(from, to){
  const state = cloneState();
  history.push(state);
  clearHighlights();

  let piece;
  if(from.hand){
    piece = hands[turn].splice(from.index,1)[0];
    const cells = getDropCells(piece);
    if(!cells.some(c=>c.x==to.x && c.y==to.y)){
      hands[turn].splice(from.index,0,piece);
      renderBoard();
      return;
    }
    piece.owner = turn;
  }else{
    piece = board[from.fromY][from.fromX];
    const moves = getLegalMoves(piece, +from.fromX, +from.fromY);
    if(!moves.some(m=>m.x==to.x && m.y==to.y)){
      renderBoard();
      return; // illegal
    }
    board[from.fromY][from.fromX] = null;
  }
  if(board[to.y][to.x]){
    const captured = board[to.y][to.x];
    captured.owner = turn;
    captured.type = PIECES[captured.type].base || captured.type;
    hands[turn].push(captured);
  }
  board[to.y][to.x] = piece;

  // promotion simple: if pawn etc enters last rows
  if(shouldPromote(piece, to.y)) piece.type = PIECES[piece.type].promote || piece.type;

  // check for king capture
  if(isKingCaptured()){
    alert((turn===0?'先手':'後手') + 'の勝ち!');
    loadStart();
    history=[];
  }else{
    turn = 1-turn;
  }
  renderBoard();
}

function shouldPromote(piece, y){
  if(!PIECES[piece.type].promote) return false;
  if(piece.owner===0 && y<=2) return true;
  if(piece.owner===1 && y>=6) return true;
  return false;
}

function isKingCaptured(){
  let kings=0;
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){
    if(board[y][x] && board[y][x].type==='OU') kings++;
  }
  return kings<2;
}

function inBounds(x,y){
  return x>=0 && x<9 && y>=0 && y<9;
}

function getLegalMoves(piece,x,y){
  const moves=[];
  const dir = piece.owner===0?-1:1;
  const def = PIECES[piece.type];

  if(def.move){
    def.move.forEach(([dx,dy])=>{
      const nx=x+dx;
      const ny=y+dy*dir;
      if(inBounds(nx,ny) && (!board[ny][nx] || board[ny][nx].owner!==piece.owner))
        moves.push({x:nx,y:ny});
    });
  }
  if(def.jump){
    def.jump.forEach(([dx,dy])=>{
      const nx=x+dx;
      const ny=y+dy*(piece.owner===0?1:-1); // knights always forward two
      if(inBounds(nx,ny) && (!board[ny][nx] || board[ny][nx].owner!==piece.owner))
        moves.push({x:nx,y:ny});
    });
  }
  if(def.slide){
    const dirs=[];
    if(def.diag) dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
    if(def.ortho) dirs.push([1,0],[-1,0],[0,1],[0,-1]);
    dirs.forEach(([dx,dy])=>{
      let nx=x+dx, ny=y+dy;
      while(inBounds(nx,ny)){
        if(!board[ny][nx]){ moves.push({x:nx,y:ny}); }
        else {
          if(board[ny][nx].owner!==piece.owner) moves.push({x:nx,y:ny});
          break;
        }
        nx+=dx; ny+=dy;
      }
    });
  }
  return moves;
}

function getDropCells(piece){
  const cells=[];
  for(let y=0;y<9;y++){
    for(let x=0;x<9;x++){
      if(board[y][x]) continue;
      if(piece.type==='FU' && ((piece.owner===0 && y===0) || (piece.owner===1 && y===8))) continue;
      if(piece.type==='KE' && ((piece.owner===0 && y<=1) || (piece.owner===1 && y>=7))) continue;
      if(piece.type==='KY' && ((piece.owner===0 && y===0) || (piece.owner===1 && y===8))) continue;
      cells.push({x,y});
    }
  }
  return cells;
}

function updateHands(){
  handElems.forEach((el,i)=>{
    el.innerHTML = (i===0?'先手':'後手')+'の持ち駒:';
    hands[i].forEach((p,idx)=>{
      const div = createPieceElement(p);
      div.dataset.hand=i;
      div.dataset.index=idx;
      div.addEventListener('dragstart',e=>{
        e.dataTransfer.setData('text/plain', JSON.stringify({hand:i,index:idx}));
      });
      el.appendChild(div);
    });
  });
}

undoBtn.addEventListener('click',()=>{
  if(history.length){
    const state = history.pop();
    board = state.board;
    hands = state.hands;
    turn = state.turn;
    renderBoard();
  }
  clearHighlights();
});

loadStart();
renderBoard();

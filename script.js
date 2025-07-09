const boardElem = document.getElementById('board');
const turnElem = document.getElementById('turn');
const blackHandElem = document.getElementById('black-hand');
const whiteHandElem = document.getElementById('white-hand');
const undoButton = document.getElementById('undo');

let board = [];
let hands = { black: [], white: [] };
let history = [];
let turn = 'black';

const initialSetup = [
  ['l','n','s','g','k','g','s','n','l'],
  [null,'r',null,null,null,null,null,'b',null],
  ['p','p','p','p','p','p','p','p','p'],
  [null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null],
  ['P','P','P','P','P','P','P','P','P'],
  [null,'B',null,null,null,null,null,'R',null],
  ['L','N','S','G','K','G','S','N','L']
];

const pieceNames = {
  p: '歩', l: '香', n: '桂', s: '銀', g: '金', k: '王', r: '飛', b: '角',
  P: '歩', L: '香', N: '桂', S: '銀', G: '金', K: '王', R: '飛', B: '角'
};

function init() {
  board = JSON.parse(JSON.stringify(initialSetup));
  hands = { black: [], white: [] };
  history = [];
  turn = 'black';
  render();
}

function render() {
  boardElem.innerHTML = '';
  for (let y=0; y<9; y++) {
    for (let x=0; x<9; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      const piece = board[y][x];
      if (piece) {
        const div = document.createElement('div');
        div.className = 'piece ' + (isWhite(piece)?'white':'');
        div.textContent = pieceNames[piece];
        div.draggable = true;
        div.dataset.piece = piece;
        div.addEventListener('dragstart', dragStart);
        cell.appendChild(div);
      }
      cell.addEventListener('dragover', dragOver);
      cell.addEventListener('drop', drop);
      boardElem.appendChild(cell);
    }
  }
  updateHands();
  turnElem.textContent = turn === 'black' ? '先手の番です' : '後手の番です';
}

function updateHands() {
  blackHandElem.textContent = '先手の持ち駒: ' + hands.black.map(p=>pieceNames[p]).join(' ');
  whiteHandElem.textContent = '後手の持ち駒: ' + hands.white.map(p=>pieceNames[p]).join(' ');
}

function isWhite(piece) {
  return piece === piece.toUpperCase();
}

function dragStart(e) {
  e.dataTransfer.setData('text/plain', JSON.stringify({x:e.target.parentElement.dataset.x, y:e.target.parentElement.dataset.y}));
  highlightMoves(e.target.dataset.piece, parseInt(e.target.parentElement.dataset.x), parseInt(e.target.parentElement.dataset.y));
}

function dragOver(e) {
  e.preventDefault();
}

function drop(e) {
  e.preventDefault();
  clearHighlights();
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  movePiece(data.x, data.y, e.currentTarget.dataset.x, e.currentTarget.dataset.y);
}

function movePiece(sx, sy, tx, ty) {
  sx = parseInt(sx); sy = parseInt(sy); tx = parseInt(tx); ty = parseInt(ty);
  const piece = board[sy][sx];
  if (!piece) return;
  const moves = legalMoves(piece, sx, sy);
  if (!moves.some(m=>m.x===tx && m.y===ty)) return;
  history.push(JSON.stringify({board,hands,turn}));
  const captured = board[ty][tx];
  board[ty][tx] = piece;
  board[sy][sx] = null;
  if (captured) capture(captured);
  if (shouldPromote(piece, sy, ty)) {
    if (confirm('成りますか?')) board[ty][tx] = promote(piece);
  }
  if (isKingCaptured()) {
    alert((turn==='black'?'先手':'後手')+'の勝ち');
    init();
    return;
  }
  turn = turn==='black'?'white':'black';
  render();
  if (isCheck()) alert('王手!');
  if (isCheckmate()) {
    alert('詰み!');
    init();
  }
}

function capture(piece) {
  if (isWhite(piece)) piece = piece.toLowerCase();
  hands[turn].push(piece);
}

function shouldPromote(piece, sy, ty) {
  if ('plnsgbr'.indexOf(piece.toLowerCase())===-1) return false;
  const zone = turn==='black' ? ty <= 2 || sy <=2 : ty >=6 || sy >=6;
  return zone;
}

function promote(piece) {
  const map = {p:'+p',l:'+l',n:'+n',s:'+s',b:'+b',r:'+r'};
  const key = piece.toLowerCase();
  if (!map[key]) return piece;
  const promoted = map[key];
  return isWhite(piece)?promoted.toUpperCase():promoted;
}

function highlightMoves(piece, x, y) {
  legalMoves(piece, x, y).forEach(m=>{
    const cell = boardElem.children[m.y*9+m.x];
    cell.classList.add('highlight');
  });
}

function clearHighlights() {
  document.querySelectorAll('.cell.highlight').forEach(c=>c.classList.remove('highlight'));
}

function legalMoves(piece, x, y) {
  const moves = [];
  const dir = isWhite(piece)?-1:1;
  const enemy = turn==='black'?c=>c&&isWhite(c):c=>c&&!isWhite(c);
  function add(x2,y2,step=false){
    if(x2<0||x2>8||y2<0||y2>8)return false;
    const t=board[y2][x2];
    if(!t){moves.push({x:x2,y:y2});return true;}
    if(enemy(t)){moves.push({x:x2,y:y2});}
    return false;
  }
  switch(piece.toLowerCase()){
    case 'p': add(x,y+dir);break;
    case 'l': for(let i=1;i<9;i++){if(!add(x,y+i*dir,true))break;}break;
    case 'n': add(x-1,y+2*dir);add(x+1,y+2*dir);break;
    case 's': [[0,1],[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d=>add(x+d[0],y+d[1]*dir));break;
    case 'g': [[0,1],[1,1],[-1,1],[1,0],[-1,0],[0,-1]].forEach(d=>add(x+d[0],y+d[1]*dir));break;
    case 'k': [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d=>add(x+d[0],y+d[1]*dir));break;
    case 'b': [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d=>{for(let i=1;i<9;i++){if(!add(x+d[0]*i,y+d[1]*i,true))break;}});break;
    case 'r': [[0,1],[0,-1],[1,0],[-1,0]].forEach(d=>{for(let i=1;i<9;i++){if(!add(x+d[0]*i,y+d[1]*i,true))break;}});break;
    case '+p': case '+l': case '+n': case '+s':
      [[0,1],[1,1],[-1,1],[1,0],[-1,0],[0,-1]].forEach(d=>add(x+d[0],y+d[1]*dir));break;
    case '+b':
      [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d=>{for(let i=1;i<9;i++){if(!add(x+d[0]*i,y+d[1]*i,true))break;}});
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(d=>add(x+d[0],y+d[1]));
      break;
    case '+r':
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(d=>{for(let i=1;i<9;i++){if(!add(x+d[0]*i,y+d[1]*i,true))break;}});
      [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(d=>add(x+d[0],y+d[1]));
      break;
  }
  return moves.filter(m=>!board[m.y][m.x]||enemy(board[m.y][m.x]));
}

function isKingCaptured() {
  let bk=false,wk=false;
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){
    if(board[y][x]==='k')bk=true;
    if(board[y][x]==='K')wk=true;
  }
  return !(bk&&wk);
}

function isCheck() {
  const kingPos = findKing(turn==='black'?'white':'black');
  if(!kingPos) return false;
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){
    const piece = board[y][x];
    if(piece && (isWhite(piece)!==(turn==='black'))){
      const moves = legalMoves(piece,x,y);
      if(moves.some(m=>m.x===kingPos.x && m.y===kingPos.y)) return true;
    }
  }
  return false;
}

function isCheckmate() {
  if(!isCheck()) return false;
  const enemyTurn = turn==='black'?'white':'black';
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){
    const piece = board[y][x];
    if(piece && (isWhite(piece)===(enemyTurn==='white'))){
      const moves = legalMoves(piece,x,y);
      for(const m of moves){
        const backup = board[m.y][m.x];
        board[m.y][m.x]=piece;
        board[y][x]=null;
        const inCheck = isCheck();
        board[y][x]=piece;
        board[m.y][m.x]=backup;
        if(!inCheck) return false;
      }
    }
  }
  return true;
}

function findKing(color) {
  const target = color==='black'?'k':'K';
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){ if(board[y][x]===target) return {x,y}; }
  return null;
}

undoButton.addEventListener('click', ()=>{
  if(history.length){
    const state = JSON.parse(history.pop());
    board = state.board;
    hands = state.hands;
    turn = state.turn;
    render();
  }
});

init();

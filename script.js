const boardElement = document.getElementById('board');
const infoElement = document.getElementById('info');
const capturedSente = document.getElementById('captured-sente');
const capturedGote = document.getElementById('captured-gote');
const undoBtn = document.getElementById('undo');

const boardSize = 9;
let board = [];
let history = [];
let turn = 'sente'; // sente = black, gote = white
let hands = {sente: [], gote: []};

const pieceNames = {
  OU: '王',
  HI: '飛',
  KA: '角',
  KI: '金',
  GI: '銀',
  KE: '桂',
  KY: '香',
  FU: '歩',
  TO: 'と',
  NY: '成香',
  NK: '成桂',
  NG: '成銀',
  RY: '龍',
  UM: '馬'
};

const initialSetup = () => {
  board = Array.from({length: boardSize}, () => Array(boardSize).fill(null));
  // Sente pieces
  board[8][4] = {type:'OU', owner:'sente'};
  board[8][7] = {type:'KY', owner:'sente'};
  board[8][1] = {type:'KY', owner:'sente'};
  board[8][6] = {type:'KE', owner:'sente'};
  board[8][2] = {type:'KE', owner:'sente'};
  board[8][5] = {type:'GI', owner:'sente'};
  board[8][3] = {type:'GI', owner:'sente'};
  board[8][8] = {type:'HI', owner:'sente'};
  board[8][0] = {type:'KA', owner:'sente'};
  board[7][3] = {type:'KI', owner:'sente'};
  board[7][5] = {type:'KI', owner:'sente'};
  for(let i=0;i<9;i++) board[6][i] = {type:'FU', owner:'sente'};
  // Gote pieces
  board[0][4] = {type:'OU', owner:'gote'};
  board[0][1] = {type:'KY', owner:'gote'};
  board[0][7] = {type:'KY', owner:'gote'};
  board[0][2] = {type:'KE', owner:'gote'};
  board[0][6] = {type:'KE', owner:'gote'};
  board[0][3] = {type:'GI', owner:'gote'};
  board[0][5] = {type:'GI', owner:'gote'};
  board[0][0] = {type:'HI', owner:'gote'};
  board[0][8] = {type:'KA', owner:'gote'};
  board[1][3] = {type:'KI', owner:'gote'};
  board[1][5] = {type:'KI', owner:'gote'};
  for(let i=0;i<9;i++) board[2][i] = {type:'FU', owner:'gote'};
  hands = {sente: [], gote: []};
  turn = 'sente';
  history = [];
  render();
};

const saveHistory = () => {
  const snapshot = JSON.stringify({board, hands, turn});
  history.push(snapshot);
};

const loadHistory = () => {
  if(history.length===0) return;
  const last = JSON.parse(history.pop());
  board = last.board;
  hands = last.hands;
  turn = last.turn;
  render();
};

undoBtn.addEventListener('click', loadHistory);

function createBoard() {
  boardElement.innerHTML = '';
  for(let r=0;r<boardSize;r++){
    for(let c=0;c<boardSize;c++){
      const cell = document.createElement('div');
      cell.className = 'cell '+((r+c)%2?'dark':'light');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('dragover', e=>e.preventDefault());
      cell.addEventListener('drop', onDrop);
      boardElement.appendChild(cell);
    }
  }
}

function render() {
  infoElement.textContent = turn==='sente'? '先手番':'後手番';
  createBoard();
  for(let r=0;r<boardSize;r++){
    for(let c=0;c<boardSize;c++){
      const piece = board[r][c];
      if(piece){
        const div = createPieceElement(piece);
        div.draggable = true;
        div.addEventListener('dragstart', onDrag);
        const cell = getCell(r,c);
        cell.appendChild(div);
      }
    }
  }
  renderHands();
}

function renderHands(){
  capturedSente.innerHTML='';
  capturedGote.innerHTML='';
  hands.sente.forEach((p,i)=>{
    const el = createPieceElement(p);
    el.draggable=true;
    el.dataset.hand='sente';
    el.dataset.index=i;
    el.addEventListener('dragstart', onDrag);
    capturedSente.appendChild(el);
  });
  hands.gote.forEach((p,i)=>{
    const el = createPieceElement(p);
    el.draggable=true;
    el.dataset.hand='gote';
    el.dataset.index=i;
    el.addEventListener('dragstart', onDrag);
    capturedGote.appendChild(el);
  });
}

function createPieceElement(piece){
  const div = document.createElement('div');
  div.className='piece';
  if(piece.owner==='gote') div.classList.add('rotated');
  div.textContent = pieceNames[piece.type];
  return div;
}

function getCell(r,c){
  return boardElement.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
}

let dragData = null;

function onDrag(e){
  const el = e.target;
  const r = el.parentElement.dataset.row;
  const c = el.parentElement.dataset.col;
  if(r!==undefined){
    dragData = {from:'board', row:parseInt(r), col:parseInt(c), piece: board[r][c]};
  }else{
    dragData = {from:'hand', owner: el.dataset.hand, index: parseInt(el.dataset.index), piece: hands[el.dataset.hand][parseInt(el.dataset.index)]};
  }
  highlightMoves(dragData.piece, dragData.from==='board'? dragData.row : null, dragData.from==='board'? dragData.col : null);
}

function clearHighlights(){
  boardElement.querySelectorAll('.highlight').forEach(el=>el.classList.remove('highlight'));
}

function onDrop(e){
  e.preventDefault();
  if(!dragData) return;
  const row = parseInt(e.target.dataset.row);
  const col = parseInt(e.target.dataset.col);
  if(isLegalMove(dragData.piece, dragData.from==='board'? dragData.row:null, dragData.from==='board'? dragData.col:null, row,col)){
    saveHistory();
    if(dragData.from==='board') board[dragData.row][dragData.col]=null;
    else hands[dragData.owner].splice(dragData.index,1);
    captureIfNeeded(row,col);
    board[row][col]=Object.assign({}, dragData.piece);
    maybePromote(row, dragData.piece);
    turn = turn==='sente'? 'gote':'sente';
    dragData=null;
    clearHighlights();
    checkVictory();
    checkCheckmate();
    render();
  }
}

function captureIfNeeded(row,col){
  const dest = board[row][col];
  if(dest){
    const captured = Object.assign({}, dest, {owner: turn});
    captured.type = demote(captured.type);
    hands[turn].push(captured);
  }
}

function demote(type){
  const map = {TO:'FU', NY:'KY', NK:'KE', NG:'GI', RY:'HI', UM:'KA'};
  return map[type]||type;
}

function maybePromote(row,piece){
  const zone = piece.owner==='sente'? row<=2 : row>=6;
  if(canPromote(piece.type) && zone){
    if(confirm('成りますか？')){
      piece.type = promote(piece.type);
    }
  }
}

function canPromote(type){
  return ['FU','KY','KE','GI','HI','KA'].includes(type);
}
function promote(type){
  const map = {FU:'TO', KY:'NY', KE:'NK', GI:'NG', HI:'RY', KA:'UM'};
  return map[type]||type;
}

function isLegalMove(piece, fr,fc, tr,tc){
  if(fr==null){
    if(board[tr][tc]) return false;
    if(piece.type==='FU'){
      for(let r=0;r<9;r++){
        const p=board[r][tc];
        if(p && p.owner===piece.owner && p.type==='FU') return false;
      }
      if((piece.owner==='sente' && tr===0) || (piece.owner==='gote' && tr===8)) return false;
    }
    if(piece.type==='KY'){
      if((piece.owner==='sente' && tr===0) || (piece.owner==='gote' && tr===8)) return false;
    }
    if(piece.type==='KE'){
      if((piece.owner==='sente' && tr<=1) || (piece.owner==='gote' && tr>=7)) return false;
    }
    return true;
  }
  if(board[tr][tc] && board[tr][tc].owner===piece.owner) return false;
  const moves = getMoves(piece, fr,fc);
  return moves.some(m=>m[0]===tr && m[1]===tc);
}

function getMoves(piece, r,c){
  const dir = piece.owner==='sente'? -1:1;
  const moves=[];
  const add = (dr,dc,repeat=false)=>{
    let nr=r+dr, nc=c+dc;
    while(nr>=0 && nr<9 && nc>=0 && nc<9){
      if(board[nr][nc]){ if(board[nr][nc].owner!==piece.owner) moves.push([nr,nc]); break; }
      else moves.push([nr,nc]);
      if(!repeat) break;
      nr+=dr; nc+=dc;
    }
  };
  const addFrom=(dr,dc)=>moves.push([dr,dc]);
  switch(piece.type){
    case 'FU': add(dir,0); break;
    case 'KY': add(dir,0,true); break;
    case 'KE': add(dir*2,-1); add(dir*2,1); break;
    case 'GI': add(dir,-1); add(dir,1); add(dir,0); add(-dir,-1); add(-dir,1); break;
    case 'KI': add(dir,-1); add(dir,0); add(dir,1); add(0,-1); add(0,1); add(-dir,0); break;
    case 'OU': add(dir,-1); add(dir,0); add(dir,1); add(0,-1); add(0,1); add(-dir,-1); add(-dir,0); add(-dir,1); break;
    case 'HI': add(dir,0,true); add(-dir,0,true); add(0,-1,true); add(0,1,true); break;
    case 'KA': add(dir,1,true); add(dir,-1,true); add(-dir,1,true); add(-dir,-1,true); break;
    case 'TO':
    case 'NY':
    case 'NK':
    case 'NG':
      add(dir,-1); add(dir,0); add(dir,1); add(0,-1); add(0,1); add(-dir,0); break;
    case 'RY':
      add(dir,0,true); add(-dir,0,true); add(0,-1,true); add(0,1,true);
      add(dir,-1); add(dir,1); add(-dir,-1); add(-dir,1);
      break;
    case 'UM':
      add(dir,1,true); add(dir,-1,true); add(-dir,1,true); add(-dir,-1,true);
      add(dir,0); add(-dir,0); add(0,-1); add(0,1);
      break;
  }
  return moves;
}

function highlightMoves(piece,r,c){
  clearHighlights();
  if(r==null){
    for(let i=0;i<9;i++){
      for(let j=0;j<9;j++){
        if(isLegalMove(piece,null,null,i,j)) getCell(i,j).classList.add('highlight');
      }
    }
  }else{
    const moves = getMoves(piece,r,c);
    moves.forEach(([mr,mc])=>{
      const cell=getCell(mr,mc);
      if(!board[mr][mc] || board[mr][mc].owner!==piece.owner) cell.classList.add('highlight');
    });
  }
}

function checkVictory(){
  const flat = board.flat();
  const senteKing = flat.find(p=>p&&p.type==='OU'&&p.owner==='sente');
  const goteKing = flat.find(p=>p&&p.type==='OU'&&p.owner==='gote');
  if(!senteKing){
    alert('後手の勝ち');
    initialSetup();
  } else if(!goteKing){
    alert('先手の勝ち');
    initialSetup();
  }
}

function checkCheckmate(){
  const opponent = turn;
  if(isKingInCheck(opponent)){
    if(!hasLegalMove(opponent)){
      alert((opponent==='sente'? '先手':'後手')+'の詰み！');
      initialSetup();
    } else {
      alert('王手！');
    }
  }
}

function isKingInCheck(owner){
  const kingPos = findKing(owner);
  if(!kingPos) return false;
  const opp = owner==='sente'? 'gote':'sente';
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const p=board[r][c];
      if(p && p.owner===opp){
        const moves=getMoves(p,r,c);
        if(moves.some(m=>m[0]===kingPos.r && m[1]===kingPos.c)) return true;
      }
    }
  }
  return false;
}

function findKing(owner){
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const p=board[r][c];
      if(p && p.type==='OU' && p.owner===owner) return {r,c};
    }
  }
  return null;
}

function hasLegalMove(owner){
  const snapshot = JSON.stringify({board,hands});
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const p=board[r][c];
      if(p && p.owner===owner){
        const moves=getMoves(p,r,c);
        for(const [tr,tc] of moves){
          if(isLegalMove(p,r,c,tr,tc)){
            const orig=board[tr][tc];
            board[tr][tc]=Object.assign({},p);
            board[r][c]=null;
            let captured=null;
            if(orig){
              captured=Object.assign({},orig,{owner:owner});
              captured.type=demote(captured.type);
              hands[owner].push(captured);
            }
            const res=!isKingInCheck(owner);
            board[r][c]=p;
            board[tr][tc]=orig;
            if(captured) hands[owner].pop();
            if(res){
              Object.assign(board, JSON.parse(snapshot).board); // ensure
              hands=JSON.parse(snapshot).hands;
              return true;
            }
          }
        }
      }
    }
  }
  const handList=hands[owner];
  for(let i=0;i<handList.length;i++){
    const piece=handList[i];
    for(let r=0;r<9;r++){
      for(let c=0;c<9;c++){
        if(isLegalMove(piece,null,null,r,c)){
          board[r][c]=Object.assign({},piece);
          handList.splice(i,1);
          const res=!isKingInCheck(owner);
          handList.splice(i,0,piece);
          board[r][c]=null;
          if(res){
            Object.assign(board, JSON.parse(snapshot).board);
            hands=JSON.parse(snapshot).hands;
            return true;
          }
        }
      }
    }
  }
  Object.assign(board, JSON.parse(snapshot).board);
  hands=JSON.parse(snapshot).hands;
  return false;
}

initialSetup();

const boardElement = document.getElementById('board');
const turnElement = document.getElementById('turn');
const undoButton = document.getElementById('undo');
const capturedSente = document.getElementById('captured-sente');
const capturedGote = document.getElementById('captured-gote');

const PIECES = {
    OU: '王',
    HI: '飛',
    KA: '角',
    KI: '金',
    GI: '銀',
    KE: '桂',
    KY: '香',
    FU: '歩',
    TO: 'と',
};

let board = [];
let captured = {
    sente: [],
    gote: []
};
let turn = 'sente';
let history = [];

function initBoard() {
    board = Array.from({ length: 9 }, () => Array(9).fill(null));
    // initial setup (simplified)
    const setup = [
        [PIECES.KY, PIECES.KE, PIECES.GI, PIECES.KI, PIECES.OU, PIECES.KI, PIECES.GI, PIECES.KE, PIECES.KY],
        [null, PIECES.HI, null, null, null, null, null, PIECES.KA, null],
        [PIECES.FU, PIECES.FU, PIECES.FU, PIECES.FU, PIECES.FU, PIECES.FU, PIECES.FU, PIECES.FU, PIECES.FU],
    ];
    for (let x = 0; x < 9; x++) {
        board[0][x] = { type: setup[0][x], owner: 'gote', promoted: false };
        board[2][x] = { type: setup[2][x], owner: 'gote', promoted: false };
        board[6][x] = { type: setup[2][x], owner: 'sente', promoted: false };
        board[8][x] = { type: setup[0][8 - x], owner: 'sente', promoted: false };
    }
    board[1][1] = { type: PIECES.KA, owner: 'gote', promoted: false };
    board[1][7] = { type: PIECES.HI, owner: 'gote', promoted: false };
    board[7][1] = { type: PIECES.HI, owner: 'sente', promoted: false };
    board[7][7] = { type: PIECES.KA, owner: 'sente', promoted: false };
    captured.sente = [];
    captured.gote = [];
    turn = 'sente';
    history = [];
    drawBoard();
    updateCaptured();
    updateTurn();
}

function drawBoard() {
    boardElement.innerHTML = '';
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.dataset.x = x;
            square.dataset.y = y;
            if (board[y][x]) {
                const piece = document.createElement('div');
                piece.className = 'piece';
                piece.textContent = board[y][x].type;
                if (board[y][x].owner === 'gote') piece.classList.add('rotated');
                piece.draggable = true;
                piece.dataset.owner = board[y][x].owner;
                piece.dataset.x = x;
                piece.dataset.y = y;
                piece.addEventListener('dragstart', onDragStart);
                square.appendChild(piece);
            }
            square.addEventListener('dragover', onDragOver);
            square.addEventListener('drop', onDrop);
            boardElement.appendChild(square);
        }
    }
}

function updateCaptured() {
    capturedSente.innerHTML = '先手:';
    capturedGote.innerHTML = '後手:';
    captured.sente.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'captured-piece';
        el.textContent = p.type;
        el.draggable = true;
        el.dataset.index = i;
        el.dataset.owner = 'sente';
        el.addEventListener('dragstart', onDragStartCaptured);
        capturedSente.appendChild(el);
    });
    captured.gote.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'captured-piece rotated';
        el.textContent = p.type;
        el.draggable = true;
        el.dataset.index = i;
        el.dataset.owner = 'gote';
        el.addEventListener('dragstart', onDragStartCaptured);
        capturedGote.appendChild(el);
    });
}

function updateTurn() {
    turnElement.textContent = turn === 'sente' ? '先手の番' : '後手の番';
}

function onDragStart(e) {
    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;
    if (board[y][x].owner !== turn) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('text/plain', JSON.stringify({ from: { x, y } }));
    highlightMoves(x, y);
}

function onDragStartCaptured(e) {
    if (e.target.dataset.owner !== turn) {
        e.preventDefault();
        return;
    }
    const index = +e.target.dataset.index;
    e.dataTransfer.setData('text/plain', JSON.stringify({ captured: true, index }));
}

function onDragOver(e) {
    e.preventDefault();
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => sq.classList.remove('highlight'));
}

function onDrop(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const x = +e.currentTarget.dataset.x;
    const y = +e.currentTarget.dataset.y;
    if (data.from) {
        movePiece(data.from.x, data.from.y, x, y);
    } else if (data.captured) {
        dropCaptured(data.index, x, y);
    }
    clearHighlights();
}

function movePiece(fromX, fromY, toX, toY) {
    const piece = board[fromY][fromX];
    if (!isLegalMove(piece, fromX, fromY, toX, toY)) return;
    saveHistory();
    const target = board[toY][toX];
    if (target) {
        capturePiece(target);
    }
    board[toY][toX] = piece;
    board[fromY][fromX] = null;
    promoteIfPossible(piece, toY);
    if (target && target.type === PIECES.OU) {
        alert(turn + 'の勝ち!');
        initBoard();
        return;
    }
    switchTurn();
}

function dropCaptured(index, x, y) {
    if (board[y][x]) return;
    const piece = turn === 'sente' ? captured.sente.splice(index, 1)[0] : captured.gote.splice(index, 1)[0];
    saveHistory();
    board[y][x] = { ...piece, owner: turn };
    switchTurn();
}

function saveHistory() {
    history.push({ board: JSON.parse(JSON.stringify(board)), captured: JSON.parse(JSON.stringify(captured)), turn });
}

function undo() {
    const state = history.pop();
    if (!state) return;
    board = state.board;
    captured = state.captured;
    turn = state.turn;
    drawBoard();
    updateCaptured();
    updateTurn();
}

function switchTurn() {
    turn = turn === 'sente' ? 'gote' : 'sente';
    drawBoard();
    updateCaptured();
    updateTurn();
    checkCheck();
}

function capturePiece(piece) {
    if (piece.owner === 'sente') captured.gote.push({ type: piece.type, promoted: false });
    else captured.sente.push({ type: piece.type, promoted: false });
}

function isInside(x, y) {
    return x >= 0 && x < 9 && y >= 0 && y < 9;
}

function highlightMoves(x, y) {
    clearHighlights();
    const piece = board[y][x];
    if (piece.owner !== turn) return;
    for (let ny = 0; ny < 9; ny++) {
        for (let nx = 0; nx < 9; nx++) {
            if (isLegalMove(piece, x, y, nx, ny, true)) {
                const square = document.querySelector(`.square[data-x='${nx}'][data-y='${ny}']`);
                square.classList.add('highlight');
            }
        }
    }
}

function isLegalMove(piece, fromX, fromY, toX, toY, skipCheck=false) {
    if (!isInside(toX, toY)) return false;
    if (fromX === toX && fromY === toY) return false;
    const target = board[toY][toX];
    if (target && target.owner === piece.owner) return false;
    const dx = piece.owner === 'sente' ? toX - fromX : fromX - toX;
    const dy = piece.owner === 'sente' ? fromY - toY : toY - fromY;

    switch (piece.type) {
        case PIECES.FU:
            if (dx === 0 && dy === 1) return true;
            break;
        case PIECES.KY:
            if (dx === 0 && dy > 0 && clearPath(fromX, fromY, toX, toY)) return true;
            break;
        case PIECES.KE:
            if (Math.abs(dx) === 1 && dy === 2) return true;
            break;
        case PIECES.GI:
            if (Math.abs(dx) <= 1 && dy === 1) return true;
            if (Math.abs(dx) === 1 && dy === -1) return true;
            break;
        case PIECES.KI:
        case PIECES.TO:
            if (Math.abs(dx) <= 1 && dy === 1) return true;
            if (dx === 0 && dy === 0) return false;
            if (Math.abs(dx) === 1 && dy === 0) return true;
            if (dx === 0 && dy === -1) return true;
            break;
        case PIECES.KA:
            if (Math.abs(dx) === Math.abs(dy) && clearPath(fromX, fromY, toX, toY)) return true;
            break;
        case PIECES.HI:
            if ((dx === 0 || dy === 0) && clearPath(fromX, fromY, toX, toY)) return true;
            break;
        case PIECES.OU:
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return true;
            break;
    }
    return false;
}

function clearPath(fromX, fromY, toX, toY) {
    const stepX = Math.sign(toX - fromX);
    const stepY = Math.sign(toY - fromY);
    let x = fromX + stepX;
    let y = fromY + stepY;
    while (x !== toX || y !== toY) {
        if (board[y][x]) return false;
        x += stepX;
        y += stepY;
    }
    return true;
}

function promoteIfPossible(piece, toY) {
    if (piece.type === PIECES.FU && ((piece.owner === 'sente' && toY === 0) || (piece.owner === 'gote' && toY === 8))) {
        piece.type = PIECES.TO;
        piece.promoted = true;
    }
}

function checkCheck() {
    const kingPos = findKing(turn === 'sente' ? 'gote' : 'sente');
    if (!kingPos) return;
    if (isSquareAttacked(kingPos.x, kingPos.y, turn)) {
        alert('王手!');
        if (isCheckmate(kingPos.x, kingPos.y, kingPos.owner)) {
            alert(turn + 'の勝ち!');
            initBoard();
        }
    }
}

function findKing(owner) {
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 9; x++) {
            const p = board[y][x];
            if (p && p.type === PIECES.OU && p.owner === owner) {
                return { x, y, owner };
            }
        }
    }
    return null;
}

function isSquareAttacked(x, y, attacker) {
    for (let fy = 0; fy < 9; fy++) {
        for (let fx = 0; fx < 9; fx++) {
            const p = board[fy][fx];
            if (p && p.owner === attacker) {
                if (isLegalMove(p, fx, fy, x, y, true)) return true;
            }
        }
    }
    return false;
}

function isCheckmate(kingX, kingY, owner) {
    const dirs = [-1, 0, 1];
    for (let dy of dirs) {
        for (let dx of dirs) {
            if (dx === 0 && dy === 0) continue;
            const nx = kingX + dx;
            const ny = kingY + dy;
            if (!isInside(nx, ny)) continue;
            if (board[ny][nx] && board[ny][nx].owner === owner) continue;
            const save = board[ny][nx];
            board[ny][nx] = board[kingY][kingX];
            board[kingY][kingX] = null;
            const attacked = isSquareAttacked(nx, ny, owner === 'sente' ? 'gote' : 'sente');
            board[kingY][kingX] = board[ny][nx];
            board[ny][nx] = save;
            if (!attacked) return false;
        }
    }
    return true;
}

undoButton.addEventListener('click', undo);

initBoard();

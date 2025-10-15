const HUMAN_PLAYER = 'X';
const AI_PLAYER = 'O';
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const cellElements = document.querySelectorAll('[data-cell]');
const endGameMessageElement = document.getElementById('endGameMessage');
const endGameTextElement = endGameMessageElement.querySelector('.text');
let boardState;

startGame();

function startGame() {
    boardState = Array.from(Array(9).keys());
    cellElements.forEach(cell => {
        cell.innerText = '';
        cell.style.removeProperty('background-color');
        cell.classList.remove(HUMAN_PLAYER.toLowerCase());
        cell.classList.remove(AI_PLAYER.toLowerCase());
        cell.removeEventListener('click', turnClick);
        cell.addEventListener('click', turnClick, { once: true });
    });
    endGameMessageElement.style.display = 'none';
}

function turnClick(square) {
    const cellIndex = square.target.dataset.cell;
    if (typeof boardState[cellIndex] === 'number') {
        turn(cellIndex, HUMAN_PLAYER);
        if (!checkWin(boardState, HUMAN_PLAYER) && !checkTie()) {
            setTimeout(() => turn(bestSpot(), AI_PLAYER), 500);
        }
    }
}

function turn(squareId, player) {
    boardState[squareId] = player;
    const cell = document.querySelector(`[data-cell='${squareId}']`);
    cell.innerText = player;
    cell.classList.add(player.toLowerCase());
    cell.removeEventListener('click', turnClick);
    let gameWon = checkWin(boardState, player);
    if (gameWon) gameOver(gameWon);
    else checkTie();
}

function checkWin(currentBoard, player) {
    let plays = currentBoard.reduce((a, e, i) => (e === player) ? a.concat(i) : a, []);
    for (let [index, win] of WINNING_COMBINATIONS.entries()) {
        if (win.every(elem => plays.indexOf(elem) > -1)) {
            return { index: index, player: player };
        }
    }
    return null;
}

function gameOver(gameWon) {
    for (let index of WINNING_COMBINATIONS[gameWon.index]) {
        document.querySelector(`[data-cell='${index}']`).style.backgroundColor = 'var(--win-bg)';
    }
    cellElements.forEach(cell => cell.removeEventListener('click', turnClick));
    declareWinner(gameWon.player === HUMAN_PLAYER ? "¡Has ganado!" : "¡Has perdido!");
}

function declareWinner(who) {
    endGameMessageElement.style.display = 'flex';
    endGameTextElement.innerText = who;
}

function emptySquares() {
    return boardState.filter(s => typeof s === 'number');
}

function checkTie() {
    if (emptySquares().length === 0) {
        declareWinner("¡Es un empate!");
        return true;
    }
    return false;
}

function bestSpot() {
    return minimax(boardState, AI_PLAYER).index;
}

function minimax(newBoard, player) {
    var availSpots = emptySquares();
    if (checkWin(newBoard, HUMAN_PLAYER)) return { score: -10 };
    if (checkWin(newBoard, AI_PLAYER)) return { score: 10 };
    if (availSpots.length === 0) return { score: 0 };
    
    var moves = [];
    for (var i = 0; i < availSpots.length; i++) {
        var move = {};
        move.index = newBoard[availSpots[i]];
        newBoard[availSpots[i]] = player;
        var result = minimax(newBoard, player === AI_PLAYER ? HUMAN_PLAYER : AI_PLAYER);
        move.score = result.score;
        newBoard[availSpots[i]] = move.index;
        moves.push(move);
    }

    var bestMove;
    var bestScore = (player === AI_PLAYER) ? -10000 : 10000;
    for (var i = 0; i < moves.length; i++) {
        if ((player === AI_PLAYER && moves[i].score > bestScore) || (player === HUMAN_PLAYER && moves[i].score < bestScore)) {
            bestScore = moves[i].score;
            bestMove = i;
        }
    }
    return moves[bestMove];
}
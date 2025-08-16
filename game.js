import state from './state.js';
import { validateBoard, isAdjacent } from './utils.js';
import { createShapeCanvas, updateScoreDisplay, updateTaskDisplay, showNotification } from './ui.js';
import { initLogger } from './logger.js';
import {
    checkMatches,
    handleMatches,
    handleBonusTileAction,
    handleBonusStarSwap
} from './match.js';
import {
    loadTask,
    generateNewTask,
    checkTaskCompletion
} from './tasks.js';

// Game initialization
document.addEventListener('DOMContentLoaded', () => {
    initLogger();
    console.log('DOM fully loaded, initializing game...');
    if (!state.isGameInitialized) {
        initGame();
    } else {
        console.log('Game already initialized, skipping...');
    }
}, { once: true });

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

window.addEventListener('resize', adjustCanvasSize);

function adjustCanvasSize() {
    const containerWidth = document.getElementById('game-container').offsetWidth;
    const maxCanvasWidth = Math.min(containerWidth - 20, 360);
    state.TILE_SIZE = Math.floor(maxCanvasWidth / state.GRID_WIDTH);
    canvas.width = state.GRID_WIDTH * state.TILE_SIZE;
    canvas.height = state.GRID_HEIGHT * state.TILE_SIZE;
    if (state.board.length === state.GRID_HEIGHT) {
        updateBoardPositions();
    }
    render();
}

function updateBoardPositions() {
    if (!state.board || !Array.isArray(state.board)) {
        console.warn('updateBoardPositions: board is not initialized');
        return;
    }
    try {
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
        for (let row = 0; row < state.GRID_HEIGHT; row++) {
            for (let col = 0; col < state.GRID_WIDTH; col++) {
                if (state.board[row][col]) {
                    state.board[row][col].x = col * state.TILE_SIZE;
                    state.board[row][col].y = row * state.TILE_SIZE;
                    state.board[row][col].targetX = col * state.TILE_SIZE;
                    state.board[row][col].targetY = row * state.TILE_SIZE;
                }
            }
        }
    } catch (e) {
        console.error(`Error in updateBoardPositions: ${e.message}`);
    }
}

function initGame() {
    console.log('Initializing game...');
    if (state.isGameInitialized) {
        console.log('Game already initialized, skipping...');
        return;
    }
    state.isGameInitialized = true;

    try {
        if (!Number.isInteger(state.GRID_HEIGHT) || !Number.isInteger(state.GRID_WIDTH) || state.GRID_HEIGHT <= 0 || state.GRID_WIDTH <= 0) {
            throw new Error(`Invalid GRID_HEIGHT (${state.GRID_HEIGHT}) or GRID_WIDTH (${state.GRID_WIDTH})`);
        }

        state.score = 0;
        state.taskScore = 0;
        state.currentTaskIndex = 0;
        loadTask();
        initBoard();
        adjustCanvasSize();

        updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
        updateScoreDisplay(state.score, state.taskScore);

        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('dblclick', handleDoubleClick);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);

        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('dblclick', handleDoubleClick);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        render();
        console.log('Game initialized successfully');
    } catch (e) {
        console.error(`Failed to initialize game: ${e.message}`);
        throw e;
    }
}

function initBoard() {
    console.log('Initializing board...');
    try {
        if (!Number.isInteger(state.GRID_HEIGHT) || !Number.isInteger(state.GRID_WIDTH) || state.GRID_HEIGHT <= 0 || state.GRID_WIDTH <= 0) {
            throw new Error(`Invalid GRID_HEIGHT (${state.GRID_HEIGHT}) or GRID_WIDTH (${state.GRID_WIDTH})`);
        }

        console.log(`Creating board with ${state.GRID_HEIGHT} rows and ${state.GRID_WIDTH} columns`);
        state.board = Array(state.GRID_HEIGHT).fill().map(() => Array(state.GRID_WIDTH).fill(null));
        console.log('Board array created:', state.board);

        for (let row = 0; row < state.GRID_HEIGHT; row++) {
            for (let col = 0; col < state.GRID_WIDTH; col++) {
                state.board[row][col] = {
                    type: Math.floor(Math.random() * state.selectedShapes.length),
                    bonusType: null,
                    x: col * state.TILE_SIZE,
                    y: row * state.TILE_SIZE,
                    targetX: col * state.TILE_SIZE,
                    targetY: row * state.TILE_SIZE,
                    disappearing: false,
                    disappearProgress: 0
                };
            }
        }
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
        resolveInitialMatches();
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
        console.log('Board initialized successfully');
    } catch (e) {
        console.error(`Failed to initialize board: ${e.message}`);
        throw e;
    }
}

function resolveInitialMatches() {
    let iteration = 0;
    const maxIterations = 100;
    while (true) {
        const matches = checkMatches();
        if (!matches || iteration >= maxIterations) break;
        matches.forEach(match => {
            match.positions.forEach(pos => {
                if (!state.board[pos.row] || !state.board[pos.row][pos.col]) {
                    throw new Error(`Invalid board access at row ${pos.row}, col ${pos.col}`);
                }
                state.board[pos.row][pos.col].type = Math.floor(Math.random() * state.selectedShapes.length);
                state.board[pos.row][pos.col].bonusType = null;
            });
        });
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
        iteration++;
    }
}

function dropTiles() {
    try {
        for (let col = 0; col < state.GRID_WIDTH; col++) {
            let emptyRow = state.GRID_HEIGHT - 1;
            for (let row = state.GRID_HEIGHT - 1; row >= 0; row--) {
                if (state.board[row][col] && !state.board[row][col].disappearing) {
                    if (row !== emptyRow) {
                        state.board[emptyRow][col] = state.board[row][col];
                        state.board[emptyRow][col].targetY = emptyRow * state.TILE_SIZE;
                        state.animations.push({ row: emptyRow, col });
                        state.board[row][col] = null;
                    }
                    emptyRow--;
                }
            }
        }
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
    } catch (e) {
        console.error(`Error in dropTiles: ${e.message}`);
    }
}

function fillBoard() {
    try {
        for (let row = 0; row < state.GRID_HEIGHT; row++) {
            for (let col = 0; col < state.GRID_WIDTH; col++) {
                if (!state.board[row][col]) {
                    state.board[row][col] = {
                        type: Math.floor(Math.random() * state.selectedShapes.length),
                        bonusType: null,
                        x: col * state.TILE_SIZE,
                        y: -state.TILE_SIZE,
                        targetX: col * state.TILE_SIZE,
                        targetY: row * state.TILE_SIZE,
                        disappearing: false,
                        disappearProgress: 0
                    };
                    state.animations.push({ row, col });
                }
            }
        }
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
    } catch (e) {
        console.error(`Error in fillBoard: ${e.message}`);
    }
}

function handleTouchStart(event) {
    if (state.isProcessing) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.touches[0].clientX - rect.left;
    const y = event.touches[0].clientY - rect.top;
    const col = Math.floor(x / state.TILE_SIZE);
    const row = Math.floor(y / state.TILE_SIZE);
    if (row < 0 || row >= state.GRID_HEIGHT || col < 0 || col >= state.GRID_WIDTH || !state.board[row]?.[col]) return;

    state.touchStartTile = { row, col };
    state.touchMoved = false;
    state.selectedTile = { row, col };
    render();
}

function handleTouchMove(event) {
    if (!state.touchStartTile) return;
    event.preventDefault();
    state.touchMoved = true;
}

function handleTouchEnd(event) {
    if (!state.touchStartTile) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.changedTouches[0].clientX - rect.left;
    const y = event.changedTouches[0].clientY - rect.top;
    const col = Math.floor(x / state.TILE_SIZE);
    const row = Math.floor(y / state.TILE_SIZE);

    if (!state.touchMoved) {
        const tile = state.board[state.touchStartTile.row][state.touchStartTile.col];
        if (tile.bonusType === 'horizontal_arrow' || tile.bonusType === 'vertical_arrow') {
            state.isProcessing = true;
            handleBonusTileAction(
                state.touchStartTile.row,
                state.touchStartTile.col,
                tile.bonusType,
                render,
                (...args) => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render),
                dropTiles,
                fillBoard
            ).then(() => {
                checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render);
                state.isProcessing = false;
                render();
            });
        }
    } else if (row >= 0 && row < state.GRID_HEIGHT && col >= 0 && col < state.GRID_WIDTH && state.board[row]?.[col]) {
        const sr = state.touchStartTile.row;
        const sc = state.touchStartTile.col;
        if (isAdjacent(sr, sc, row, col)) {
            state.isProcessing = true;
            state.movesLeft--;
            updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
            const tile1 = state.board[sr][sc];
            const tile2 = state.board[row][col];
            if (tile1.bonusType === 'bonus_star' || tile2.bonusType === 'bonus_star') {
                handleBonusStarSwap(
                    sr, sc, row, col,
                    render,
                    (...args) => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render),
                    dropTiles,
                    fillBoard
                ).then(() => {
                    checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render);
                    state.isProcessing = false;
                    render();
                });
            } else {
                swapTiles(sr, sc, row, col).then(() => {
                    const matches = checkMatches();
                    if (matches) {
                        handleMatches(
                            render,
                            (...args) => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render),
                            dropTiles,
                            fillBoard
                        ).then(() => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render));
                    } else {
                        swapTiles(sr, sc, row, col).then(() => {
                            state.isProcessing = false;
                            state.movesLeft++;
                            updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
                            render();
                        });
                    }
                    state.selectedTile = null;
                });
            }
        }
    }

    state.touchStartTile = null;
    state.selectedTile = null;
    render();
}

function handleDoubleClick(event) {
    if (state.isProcessing) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / state.TILE_SIZE);
    const row = Math.floor(y / state.TILE_SIZE);
    if (row < 0 || row >= state.GRID_HEIGHT || col < 0 || col >= state.GRID_WIDTH || !state.board[row]?.[col]) return;

    const tile = state.board[row][col];
    if (tile.bonusType === 'horizontal_arrow' || tile.bonusType === 'vertical_arrow') {
        state.isProcessing = true;
        handleBonusTileAction(
            row, col, tile.bonusType,
            render,
            (...args) => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render),
            dropTiles,
            fillBoard
        ).then(() => {
            checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render);
            state.isProcessing = false;
            render();
        });
    }
}

function handleClick(event) {
    if (state.isProcessing) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor(x / state.TILE_SIZE);
    const row = Math.floor(y / state.TILE_SIZE);
    if (row < 0 || row >= state.GRID_HEIGHT || col < 0 || col >= state.GRID_WIDTH || !state.board[row]?.[col]) return;

    if (!state.selectedTile) {
        state.selectedTile = { row, col };
        render();
    } else {
        const sr = state.selectedTile.row;
        const sc = state.selectedTile.col;
        if (isAdjacent(sr, sc, row, col)) {
            state.isProcessing = true;
            state.movesLeft--;
            updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
            const tile1 = state.board[sr][sc];
            const tile2 = state.board[row][col];
            if (tile1.bonusType === 'bonus_star' || tile2.bonusType === 'bonus_star') {
                handleBonusStarSwap(
                    sr, sc, row, col,
                    render,
                    (...args) => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render),
                    dropTiles,
                    fillBoard
                ).then(() => {
                    checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render);
                    state.isProcessing = false;
                    render();
                });
            } else {
                swapTiles(sr, sc, row, col).then(() => {
                    const matches = checkMatches();
                    if (matches) {
                        handleMatches(
                            render,
                            (...args) => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render),
                            dropTiles,
                            fillBoard
                        ).then(() => checkTaskCompletion(initBoard, updateTaskDisplay, updateScoreDisplay, render));
                    } else {
                        swapTiles(sr, sc, row, col).then(() => {
                            state.isProcessing = false;
                            state.movesLeft++;
                            updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
                            render();
                        });
                    }
                    state.selectedTile = null;
                });
            }
        } else {
            state.selectedTile = { row, col };
            render();
        }
    }
}

async function swapTiles(r1, c1, r2, c2) {
    try {
        const tile1 = state.board[r1][c1];
        const tile2 = state.board[r2][c2];
        state.board[r1][c1] = tile2;
        state.board[r2][c2] = tile1;

        tile1.targetX = c2 * state.TILE_SIZE;
        tile1.targetY = r2 * state.TILE_SIZE;
        tile2.targetX = c1 * state.TILE_SIZE;
        tile2.targetY = r1 * state.TILE_SIZE;

        state.animations.push({ row: r1, col: c1 }, { row: r2, col: c2 });
        render();
        await new Promise(resolve => setTimeout(resolve, 200));
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
    } catch (e) {
        console.error(`Error in swapTiles: ${e.message}`);
    }
}

function render() {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        for (let i = 0; i <= state.GRID_WIDTH; i++) {
            ctx.beginPath();
            ctx.moveTo(i * state.TILE_SIZE, 0);
            ctx.lineTo(i * state.TILE_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i <= state.GRID_HEIGHT; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * state.TILE_SIZE);
            ctx.lineTo(canvas.width, i * state.TILE_SIZE);
            ctx.stroke();
        }

        if (!state.board || !Array.isArray(state.board)) {
            console.warn('render: board is not initialized');
            return;
        }

        for (let row = 0; row < state.GRID_HEIGHT; row++) {
            if (!state.board[row] || !Array.isArray(state.board[row])) {
                console.warn(`render: board[${row}] is undefined or not an array`);
                continue;
            }
            for (let col = 0; col < state.GRID_WIDTH; col++) {
                const tile = state.board[row][col];
                if (tile) {
                    ctx.fillStyle = tile.bonusType ? '#444444' : state.selectedColors[tile.type];
                    const x = tile.x + state.TILE_SIZE / 2;
                    const y = tile.y + state.TILE_SIZE / 2;
                    let size = state.TILE_SIZE - 8;

                    if (tile.disappearing) {
                        tile.disappearProgress = Math.min(1, tile.disappearProgress + 0.016);
                        size *= (1 - tile.disappearProgress);
                        ctx.globalAlpha = 1 - tile.disappearProgress;
                        if (tile.disappearProgress >= 1) {
                            state.board[row][col] = null;
                        }
                    } else {
                        ctx.globalAlpha = 1;
                    }

                    if (tile.bonusType === 'horizontal_arrow') {
                        ctx.beginPath();
                        ctx.moveTo(x - size / 2, y);
                        ctx.lineTo(x + size / 2, y);
                        ctx.moveTo(x + size / 2 - 5, y - 5);
                        ctx.lineTo(x + size / 2, y);
                        ctx.lineTo(x + size / 2 - 5, y + 5);
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 3;
                        ctx.stroke();
                    } else if (tile.bonusType === 'vertical_arrow') {
                        ctx.beginPath();
                        ctx.moveTo(x, y - size / 2);
                        ctx.lineTo(x, y + size / 2);
                        ctx.moveTo(x - 5, y + size / 2 - 5);
                        ctx.lineTo(x, y + size / 2);
                        ctx.lineTo(x + 5, y + size / 2 - 5);
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 3;
                        ctx.stroke();
                    } else if (tile.bonusType === 'bonus_star') {
                        ctx.beginPath();
                        for (let i = 0; i < 10; i++) {
                            const radius = i % 2 === 0 ? size / 2 : size / 3;
                            const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
                            const px = x + radius * Math.cos(angle);
                            const py = y + radius * Math.sin(angle);
                            if (i === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        }
                        ctx.closePath();
                        ctx.fillStyle = '#ffd700';
                        ctx.fill();
                    } else {
                        switch (state.selectedShapes[tile.type]) {
                            case 'square':
                                ctx.beginPath();
                                ctx.rect(x - size / 2, y - size / 2, size, size);
                                ctx.fill();
                                break;
                            case 'circle':
                                ctx.beginPath();
                                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                                ctx.fill();
                                break;
                            case 'triangle':
                                ctx.beginPath();
                                const height = (size * Math.sqrt(3)) / 2;
                                ctx.moveTo(x, y - height / 2);
                                ctx.lineTo(x - size / 2, y + height / 2);
                                ctx.lineTo(x + size / 2, y + height / 2);
                                ctx.closePath();
                                ctx.fill();
                                break;
                        }
                    }

                    ctx.globalAlpha = 1;

                    if (state.selectedTile && state.selectedTile.row === row && state.selectedTile.col === col) {
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.rect(tile.x + 2, tile.y + 2, state.TILE_SIZE - 4, state.TILE_SIZE - 4);
                        ctx.stroke();
                    }
                }
            }
        }

        updateAnimations();
        if (state.animations.length > 0 || state.board.some(row => Array.isArray(row) && row.some(tile => tile && tile.disappearing))) {
            requestAnimationFrame(render);
        }
    } catch (e) {
        console.error(`Error in render: ${e.message}`);
    }
}

function updateAnimations() {
    try {
        state.animations = state.animations.filter(anim => {
            const tile = state.board[anim.row]?.[anim.col];
            if (!tile) return false;
            const dx = (tile.targetX - tile.x) * 0.2;
            const dy = (tile.targetY - tile.y) * 0.2;
            tile.x += dx;
            tile.y += dy;
            return Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;
        });
    } catch (e) {
        console.error(`Error in updateAnimations: ${e.message}`);
    }
}

// Initialize shape canvases
createShapeCanvas('square', '#ff5555', state.shapeCanvases);
createShapeCanvas('circle', '#55ff55', state.shapeCanvases);
createShapeCanvas('triangle', '#5555ff', state.shapeCanvases);

// Экспортируем для других модулей (например, tasks.js)
window.initBoard = initBoard;
window.render = render;

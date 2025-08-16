import { validateBoard, isAdjacent } from './utils.js';
import { createShapeCanvas, updateScoreDisplay, updateTaskDisplay, showNotification } from './ui.js';
import { initLogger } from './logger.js';


document.addEventListener('DOMContentLoaded', () => {
    initLogger(); // инициализация логгера
    console.log('DOM fully loaded, initializing game...');
    if (!isGameInitialized) {
        initGame();
    } else {
        console.log('Game already initialized, skipping...');
    }
}, { once: true });

        // Global flag to prevent multiple initializations
        let isGameInitialized = false;
        let isTaskProcessing = false;

        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const taskDescription = document.getElementById('task-description');
        const scoreValue = document.getElementById('score-value');

        const GRID_WIDTH = 6;
        const GRID_HEIGHT = 6;
        const ALL_SHAPES = ['square', 'circle', 'triangle'];
        const ALL_COLORS = ['#ff5555', '#55ff55', '#5555ff'];
        const selectedShapes = ALL_SHAPES;
        const selectedColors = ALL_COLORS;

        let TILE_SIZE = 50;
        let board = [];
        let selectedTile = null;
        let isProcessing = false;
        let score = 0;
        let taskScore = 0;
        let task = { shape: 'square', count: 10 };
        let collectedShapes = { square: 0 };
        let movesLeft = 15;
        let shapeCanvases = {};
        let animations = [];
        let currentTaskIndex = 0;

        const predefinedTasks = [
            { shape: 'square', count: 10, moves: 3 },
            { shape: 'circle', count: 12, moves: 3 },
            { shape: 'triangle', count: 8, moves: 2 },
            { shape: 'square', count: 15, moves: 3 },
            { shape: 'circle', count: 10, moves: 2 },
            { shape: 'triangle', count: 14, moves: 3 },
            { shape: 'square', count: 12, moves: 4 },
            { shape: 'circle', count: 16, moves: 3 },
            { shape: 'triangle', count: 10, moves: 2 },
            { shape: 'square', count: 18, moves: 3 }
        ];



        function adjustCanvasSize() {
            const containerWidth = document.getElementById('game-container').offsetWidth;
            const maxCanvasWidth = Math.min(containerWidth - 20, 360);
            TILE_SIZE = Math.floor(maxCanvasWidth / GRID_WIDTH);
            canvas.width = GRID_WIDTH * TILE_SIZE;
            canvas.height = GRID_HEIGHT * TILE_SIZE;
            if (board.length === GRID_HEIGHT) {
                updateBoardPositions();
            }
            render();
        }

        function updateBoardPositions() {
            if (!board || !Array.isArray(board)) {
                console.warn('updateBoardPositions: board is not initialized');
                return;
            }
            try {
                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
                for (let row = 0; row < GRID_HEIGHT; row++) {
                    for (let col = 0; col < GRID_WIDTH; col++) {
                        if (board[row][col]) {
                            board[row][col].x = col * TILE_SIZE;
                            board[row][col].y = row * TILE_SIZE;
                            board[row][col].targetX = col * TILE_SIZE;
                            board[row][col].targetY = row * TILE_SIZE;
                        }
                    }
                }
            } catch (e) {
                console.error(`Error in updateBoardPositions: ${e.message}`);
            }
        }

        window.addEventListener('resize', adjustCanvasSize);

        function initGame() {
            console.log('Initializing game...');
            if (isGameInitialized) {
                console.log('Game already initialized, skipping...');
                return;
            }
            isGameInitialized = true;

            try {
                // Validate constants
                if (!Number.isInteger(GRID_HEIGHT) || !Number.isInteger(GRID_WIDTH) || GRID_HEIGHT <= 0 || GRID_WIDTH <= 0) {
                    throw new Error(`Invalid GRID_HEIGHT (${GRID_HEIGHT}) or GRID_WIDTH (${GRID_WIDTH})`);
                }

                // Reset game state
                score = 0;
                taskScore = 0;
                currentTaskIndex = 0;
                loadTask();
                initBoard();
                adjustCanvasSize();

                updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                updateScoreDisplay(score, taskScore);

                // Remove existing event listeners
                canvas.removeEventListener('click', handleClick);
                canvas.removeEventListener('dblclick', handleDoubleClick);
                canvas.removeEventListener('touchstart', handleTouchStart);
                canvas.removeEventListener('touchmove', handleTouchMove);
                canvas.removeEventListener('touchend', handleTouchEnd);

                // Add event listeners
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

        function loadTask() {
            try {
                console.log(`Loading task at index ${currentTaskIndex}`);
                if (currentTaskIndex < predefinedTasks.length) {
                    task = predefinedTasks[currentTaskIndex];
                    movesLeft = task.moves;
                    console.log(`Loaded predefined task ${currentTaskIndex + 1}: Collect ${task.count} ${task.shape} in ${movesLeft} moves`);
                } else {
                    generateNewTask();
                }
                collectedShapes = { [task.shape]: 0 };
                taskScore = 0;
                updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                updateScoreDisplay(score, taskScore);
            } catch (e) {
                console.error(`Failed to load task: ${e.message}`);
            }
        }





        function generateNewTask() {
            try {
                const shapes = ['square', 'circle', 'triangle'];
                task = {
                    shape: shapes[Math.floor(Math.random() * shapes.length)],
                    count: Math.floor(Math.random() * 8) + 8 // 8–15
                };
                collectedShapes = { [task.shape]: 0 };
                movesLeft = Math.floor(Math.random() * 9) + 12; // 12–20
                taskScore = 0;
                console.log(`New random task: Collect ${task.count} ${task.shape} in ${movesLeft} moves`);
                initBoard();
                updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                updateScoreDisplay(score, taskScore);
                render();
            } catch (e) {
                console.error(`Failed to generate new task: ${e.message}`);
            }
        }


        function checkTaskCompletion() {
            try {
                if (isTaskProcessing) {
                    console.log('checkTaskCompletion: Task processing in progress, skipping...');
                    return;
                }
                isTaskProcessing = true;

                if (collectedShapes[task.shape] >= task.count) {
                    console.log(`Task completed: Collected ${collectedShapes[task.shape]}/${task.count} ${task.shape}`);
                    score += taskScore;
                    taskScore = 0;
                    updateScoreDisplay(score, taskScore);
                    showNotification('Task Completed!');
                    setTimeout(() => {
                        currentTaskIndex++;
                        loadTask();
                        initBoard();
                        updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                        updateScoreDisplay(score, taskScore);
                        render();
                        isTaskProcessing = false;
                    }, 2000);
                } else if (movesLeft <= 0) {
                    console.log(`Task failed: Ran out of moves. Collected ${collectedShapes[task.shape]}/${task.count} ${task.shape}`);
                    taskScore = 0;
                    updateScoreDisplay(score, taskScore);
                    showNotification('Task Failed! Try Again.');
                    setTimeout(() => {
                        loadTask();
                        initBoard();
                        updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                        updateScoreDisplay(score, taskScore);
                        render();
                        isTaskProcessing = false;
                    }, 2000);
                } else {
                    isTaskProcessing = false;
                }
            } catch (e) {
                console.error(`Failed to check task completion: ${e.message}`);
                isTaskProcessing = false;
            }
        }

        function initBoard() {
            console.log('Initializing board...');
            try {
                // Validate constants
                if (!Number.isInteger(GRID_HEIGHT) || !Number.isInteger(GRID_WIDTH) || GRID_HEIGHT <= 0 || GRID_WIDTH <= 0) {
                    throw new Error(`Invalid GRID_HEIGHT (${GRID_HEIGHT}) or GRID_WIDTH (${GRID_WIDTH})`);
                }

                // Initialize board as a 2D array
                console.log(`Creating board with ${GRID_HEIGHT} rows and ${GRID_WIDTH} columns`);
                board = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(null));
                console.log('Board array created:', board);

                // Populate the board
                for (let row = 0; row < GRID_HEIGHT; row++) {
                    console.log(`Initializing row ${row}`);
                    if (!board[row]) {
                        throw new Error(`board[${row}] is undefined after initialization`);
                    }
                    for (let col = 0; col < GRID_WIDTH; col++) {
                        board[row][col] = {
                            type: Math.floor(Math.random() * selectedShapes.length),
                            bonusType: null,
                            x: col * TILE_SIZE,
                            y: row * TILE_SIZE,
                            targetX: col * TILE_SIZE,
                            targetY: row * TILE_SIZE,
                            disappearing: false,
                            disappearProgress: 0
                        };
                    }
                }
                console.log('Board populated:', board);

                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
                resolveInitialMatches();
                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
                console.log('Board initialized successfully');
            } catch (e) {
                console.error(`Failed to initialize board: ${e.message}`);
                throw e;
            }
        }

        function resolveInitialMatches() {
            console.log('Resolving initial matches...');
            try {
                let iteration = 0;
                const maxIterations = 100;
                while (true) {
                    const matches = checkMatches();
                    if (!matches || iteration >= maxIterations) {
                        console.log(`Initial matches resolved after ${iteration} iterations`);
                        break;
                    }
                    matches.forEach(match => {
                        match.positions.forEach(pos => {
                            if (!board[pos.row] || !board[pos.row][pos.col]) {
                                throw new Error(`Invalid board access at row ${pos.row}, col ${pos.col}`);
                            }
                            board[pos.row][pos.col].type = Math.floor(Math.random() * selectedShapes.length);
                            board[pos.row][pos.col].bonusType = null;
                        });
                    });
                    //validateBoard();
                    validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
                    iteration++;
                }
            } catch (e) {
                console.error(`Failed to resolve initial matches: ${e.message}`);
                throw e;
            }
        }

        function checkMatches() {
            console.log('Checking matches...');
            try {
                const matches = [];

                // Horizontal matches
                for (let row = 0; row < GRID_HEIGHT; row++) {
                    let col = 0;
                    while (col < GRID_WIDTH) {
                        const currentTile = board[row][col];
                        if (!currentTile || currentTile.bonusType || currentTile.disappearing) {
                            col++;
                            continue;
                        }
                        const type = currentTile.type;
                        let matchLength = 1;
                        let matchCols = [col];
                        let nextCol = col + 1;
                        while (nextCol < GRID_WIDTH) {
                            const nextTile = board[row][nextCol];
                            if (!nextTile || nextTile.type !== type || nextTile.bonusType || nextTile.disappearing) {
                                break;
                            }
                            matchCols.push(nextCol);
                            matchLength++;
                            nextCol++;
                        }
                        if (matchLength >= 3) {
                            matches.push({ positions: matchCols.map(c => ({ row, col: c })), length: matchLength, direction: 'horizontal', type });
                            console.log(`Horizontal match at row ${row}: ${matchLength} ${selectedShapes[type]} tiles`);
                        }
                        col = nextCol;
                    }
                }

                // Vertical matches
                for (let col = 0; col < GRID_WIDTH; col++) {
                    let row = 0;
                    while (row < GRID_HEIGHT) {
                        const currentTile = board[row][col];
                        if (!currentTile || currentTile.bonusType || currentTile.disappearing) {
                            row++;
                            continue;
                        }
                        const type = currentTile.type;
                        let matchLength = 1;
                        let matchRows = [row];
                        let nextRow = row + 1;
                        while (nextRow < GRID_HEIGHT) {
                            const nextTile = board[nextRow][col];
                            if (!nextTile || nextTile.type !== type || nextTile.bonusType || nextTile.disappearing) {
                                break;
                            }
                            matchRows.push(nextRow);
                            matchLength++;
                            nextRow++;
                        }
                        if (matchLength >= 3) {
                            matches.push({ positions: matchRows.map(r => ({ row: r, col })), length: matchLength, direction: 'vertical', type });
                            console.log(`Vertical match at col ${col}: ${matchLength} ${selectedShapes[type]} tiles`);
                        }
                        row = nextRow;
                    }
                }

                // L-shaped matches for bonus star
                for (let row = 0; row < GRID_HEIGHT; row++) {
                    for (let col = 0; col < GRID_WIDTH; col++) {
                        const currentTile = board[row][col];
                        if (!currentTile || currentTile.bonusType || currentTile.disappearing) continue;
                        const type = currentTile.type;
                        let hCount = 1, vCount = 1;
                        let hPositions = [{ row, col }], vPositions = [{ row, col }];

                        for (let c = col + 1; c < GRID_WIDTH; c++) {
                            const tile = board[row][c];
                            if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                            hPositions.push({ row, col: c });
                            hCount++;
                        }
                        for (let c = col - 1; c >= 0; c--) {
                            const tile = board[row][c];
                            if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                            hPositions.push({ row, col: c });
                            hCount++;
                        }

                        for (let r = row + 1; r < GRID_HEIGHT; r++) {
                            const tile = board[r][col];
                            if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                            vPositions.push({ row: r, col });
                            vCount++;
                        }
                        for (let r = row - 1; r >= 0; r--) {
                            const tile = board[r][col];
                            if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                            vPositions.push({ row: r, col });
                            vCount++;
                        }

                        if (hCount >= 3 && vCount >= 3) {
                            const positions = [...hPositions, ...vPositions.filter(p => !hPositions.some(hp => hp.row === p.row && hp.col === p.col))];
                            if (positions.length >= 5) {
                                matches.push({ positions, length: positions.length, direction: 'l-shaped', intersection: { row, col }, type });
                                console.log(`L-shaped match at (${row}, ${col}): ${positions.length} tiles`);
                            }
                        }
                    }
                }

                return matches.length > 0 ? matches : null;
            } catch (e) {
                console.error(`Error in checkMatches: ${e.message}`);
                return null;
            }
        }

        async function handleMatches() {
            console.log('Handling matches...');
            try {
                let matches = checkMatches();
                while (matches) {
                    const tilesToRemove = new Set();
                    const bonusTilesToPlace = [];
                    let bonusStarPlaced = false;

                    matches.forEach(match => {
                        let bonusType = null;
                        let bonusPos = null;
                        if (match.length === 4) {
                            if (match.direction === 'vertical') {
                                bonusType = 'horizontal_arrow';
                                bonusPos = match.positions.sort((a, b) => b.row - a.row)[0];
                            } else if (match.direction === 'horizontal') {
                                bonusType = 'vertical_arrow';
                                bonusPos = match.positions.sort((a, b) => b.col - a.col)[0];
                            }
                        } else if (match.length >= 5 && match.direction === 'l-shaped' && !bonusStarPlaced) {
                            bonusType = 'bonus_star';
                            bonusPos = match.intersection;
                            bonusStarPlaced = true;
                        }
                        match.positions.forEach(pos => {
                            const tile = board[pos.row][pos.col];
                            if (tile && !tile.disappearing) {
                                tile.disappearing = true;
                                tile.disappearProgress = 0;
                                tilesToRemove.add(`${pos.row},${pos.col}`);
                                if (selectedShapes[tile.type] === task.shape && !tile.bonusType) {
                                    collectedShapes[task.shape]++;
                                }
                            }
                        });
                        if (bonusType && bonusPos) {
                            bonusTilesToPlace.push({ row: bonusPos.row, col: bonusPos.col, bonusType });
                            console.log(`Scheduled bonus tile: ${bonusType} at (${bonusPos.row}, ${bonusPos.col})`);
                        }
                    });

                    const points = tilesToRemove.size * 10;
                    taskScore += points;
                    updateScoreDisplay(score, taskScore);
                    updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                    render();
                    await new Promise(resolve => setTimeout(resolve, 400));

                    tilesToRemove.forEach(pos => {
                        const [row, col] = pos.split(',').map(Number);
                        board[row][col] = null;
                    });

                    dropTiles();
                    fillBoard();
                    //validateBoard();
                    validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
                    bonusTilesToPlace.forEach(bonus => {
                        console.log(`Placing bonus tile: ${bonus.bonusType} at (${bonus.row}, ${bonus.col})`);
                        board[bonus.row][bonus.col].bonusType = bonus.bonusType;
                        board[bonus.row][bonus.col].type = 0;
                    });

                    render();
                    await new Promise(resolve => setTimeout(resolve, 400));
                    matches = checkMatches();
                }
                isProcessing = false;
                console.log(`Task status: ${collectedShapes[task.shape]}/${task.count}`);
                checkTaskCompletion();
            } catch (e) {
                console.error(`Error in handleMatches: ${e.message}`);
                isProcessing = false;
            }
        }

        async function handleBonusTileAction(row, col, bonusType) {
            console.log(`Activating bonus tile: ${bonusType} at (${row}, ${col})`);
            try {
                movesLeft--; // Count as a move
                updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes); // Update UI to reflect move count

                let tilesToRemove = [];
                if (bonusType === 'horizontal_arrow') {
                    for (let c = 0; c < GRID_WIDTH; c++) {
                        if (board[row][c] && !board[row][c].disappearing) {
                            tilesToRemove.push({ row, col: c });
                        }
                    }
                } else if (bonusType === 'vertical_arrow') {
                    for (let r = 0; r < GRID_HEIGHT; r++) {
                        if (board[r][col] && !board[r][col].disappearing) {
                            tilesToRemove.push({ row: r, col });
                        }
                    }
                }

                let points = 0;
                tilesToRemove.forEach(pos => {
                    const tile = board[pos.row][pos.col];
                    tile.disappearing = true;
                    tile.disappearProgress = 0;
                    if (selectedShapes[tile.type] === task.shape && !tile.bonusType) {
                        collectedShapes[task.shape]++;
                    }
                    points += 10;
                });

                taskScore += points;
                updateScoreDisplay(score, taskScore);
                updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                render();
                await new Promise(resolve => setTimeout(resolve, 400));

                tilesToRemove.forEach(pos => {
                    board[pos.row][pos.col] = null;
                });

                dropTiles();
                fillBoard();
                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
                render();
                await new Promise(resolve => setTimeout(resolve, 400));

                const matches = checkMatches();
                if (matches) {
                    await handleMatches();
                }
            } catch (e) {
                console.error(`Error in handleBonusTileAction: ${e.message}`);
            }
        }

        async function handleBonusStarSwap(r1, c1, r2, c2) {
            try {
                const tile1 = board[r1][c1];
                const tile2 = board[r2][c2];
                const targetType = tile1.bonusType === 'bonus_star' ? tile2.type : tile1.type;
                console.log(`Bonus star swap: removing all ${selectedShapes[targetType]} tiles`);

                let tilesToRemove = [];
                for (let r = 0; r < GRID_HEIGHT; r++) {
                    for (let c = 0; c < GRID_WIDTH; c++) {
                        if (board[r][c] && board[r][c].type === targetType && !board[r][c].disappearing) {
                            tilesToRemove.push({ row: r, col: c });
                        }
                    }
                }

                const starPos = tile1.bonusType === 'bonus_star' ? { row: r1, col: c1 } : { row: r2, col: c2 };
                tilesToRemove.push(starPos);

                let points = 0;
                tilesToRemove.forEach(pos => {
                    const tile = board[pos.row][pos.col];
                    if (tile) {
                        tile.disappearing = true;
                        tile.disappearProgress = 0;
                        if (selectedShapes[tile.type] === task.shape && !tile.bonusType) {
                            collectedShapes[task.shape]++;
                        }
                        points += 10;
                    }
                });

                taskScore += points;
                updateScoreDisplay(score, taskScore);
                updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                render();
                await new Promise(resolve => setTimeout(resolve, 400));

                tilesToRemove.forEach(pos => {
                    board[pos.row][pos.col] = null;
                });

                dropTiles();
                fillBoard();
                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
                render();
                await new Promise(resolve => setTimeout(resolve, 400));

                const matches = checkMatches();
                if (matches) {
                    await handleMatches();
                }
            } catch (e) {
                console.error(`Error in handleBonusStarSwap: ${e.message}`);
            }
        }

        function dropTiles() {
            try {
                for (let col = 0; col < GRID_WIDTH; col++) {
                    let emptyRow = GRID_HEIGHT - 1;
                    for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
                        if (board[row][col] && !board[row][col].disappearing) {
                            if (row !== emptyRow) {
                                board[emptyRow][col] = board[row][col];
                                board[emptyRow][col].targetY = emptyRow * TILE_SIZE;
                                animations.push({ row: emptyRow, col });
                                board[row][col] = null;
                            }
                            emptyRow--;
                        }
                    }
                }
                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
            } catch (e) {
                console.error(`Error in dropTiles: ${e.message}`);
            }
        }

        function fillBoard() {
            try {
                for (let row = 0; row < GRID_HEIGHT; row++) {
                    for (let col = 0; col < GRID_WIDTH; col++) {
                        if (!board[row][col]) {
                            board[row][col] = {
                                type: Math.floor(Math.random() * selectedShapes.length),
                                bonusType: null,
                                x: col * TILE_SIZE,
                                y: -TILE_SIZE,
                                targetX: col * TILE_SIZE,
                                targetY: row * TILE_SIZE,
                                disappearing: false,
                                disappearProgress: 0
                            };
                            animations.push({ row, col });
                        }
                    }
                }
                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
            } catch (e) {
                console.error(`Error in fillBoard: ${e.message}`);
            }
        }

        let touchStartTile = null;
        let touchMoved = false;

        function handleTouchStart(event) {
            if (isProcessing) return;
            event.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = event.touches[0].clientX - rect.left;
            const y = event.touches[0].clientY - rect.top;
            const col = Math.floor(x / TILE_SIZE);
            const row = Math.floor(y / TILE_SIZE);
            if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH || !board[row]?.[col]) return;

            touchStartTile = { row, col };
            touchMoved = false;
            selectedTile = { row, col };
            render();
        }

        function handleTouchMove(event) {
            if (!touchStartTile) return;
            event.preventDefault();
            touchMoved = true;
        }

        function handleTouchEnd(event) {
            if (!touchStartTile) return;
            event.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = event.changedTouches[0].clientX - rect.left;
            const y = event.changedTouches[0].clientY - rect.top;
            const col = Math.floor(x / TILE_SIZE);
            const row = Math.floor(y / TILE_SIZE);

            if (!touchMoved) {
                const tile = board[touchStartTile.row][touchStartTile.col];
                if (tile.bonusType === 'horizontal_arrow' || tile.bonusType === 'vertical_arrow') {
                    isProcessing = true;
                    handleBonusTileAction(touchStartTile.row, touchStartTile.col, tile.bonusType).then(() => {
                        checkTaskCompletion();
                        isProcessing = false;
                        render();
                    });
                }
            } else if (row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH && board[row]?.[col]) {
                const sr = touchStartTile.row;
                const sc = touchStartTile.col;
                if (isAdjacent(sr, sc, row, col)) {
                    isProcessing = true;
                    movesLeft--;
                    updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                    const tile1 = board[sr][sc];
                    const tile2 = board[row][col];
                    if (tile1.bonusType === 'bonus_star' || tile2.bonusType === 'bonus_star') {
                        handleBonusStarSwap(sr, sc, row, col).then(() => {
                            checkTaskCompletion();
                            isProcessing = false;
                            render();
                        });
                    } else {
                        swapTiles(sr, sc, row, col).then(() => {
                            const matches = checkMatches();
                            if (matches) {
                                handleMatches().then(checkTaskCompletion);
                            } else {
                                swapTiles(sr, sc, row, col).then(() => {
                                    isProcessing = false;
                                    movesLeft++;
                                    updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                                    render();
                                });
                            }
                            selectedTile = null;
                        });
                    }
                }
            }

            touchStartTile = null;
            selectedTile = null;
            render();
        }

        function handleDoubleClick(event) {
            if (isProcessing) return;
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const col = Math.floor(x / TILE_SIZE);
            const row = Math.floor(y / TILE_SIZE);
            if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH || !board[row]?.[col]) return;

            const tile = board[row][col];
            if (tile.bonusType === 'horizontal_arrow' || tile.bonusType === 'vertical_arrow') {
                isProcessing = true;
                handleBonusTileAction(row, col, tile.bonusType).then(() => {
                    checkTaskCompletion();
                    isProcessing = false;
                    render();
                });
            }
        }

        function handleClick(event) {
            if (isProcessing) return;
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const col = Math.floor(x / TILE_SIZE);
            const row = Math.floor(y / TILE_SIZE);
            if (row < 0 || row >= GRID_HEIGHT || col < 0 || col >= GRID_WIDTH || !board[row]?.[col]) return;

            if (!selectedTile) {
                selectedTile = { row, col };
                render();
            } else {
                const sr = selectedTile.row;
                const sc = selectedTile.col;
                if (isAdjacent(sr, sc, row, col)) {
                    isProcessing = true;
                    movesLeft--;
                    updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                    const tile1 = board[sr][sc];
                    const tile2 = board[row][col];
                    if (tile1.bonusType === 'bonus_star' || tile2.bonusType === 'bonus_star') {
                        handleBonusStarSwap(sr, sc, row, col).then(() => {
                            checkTaskCompletion();
                            isProcessing = false;
                            render();
                        });
                    } else {
                        swapTiles(sr, sc, row, col).then(() => {
                            const matches = checkMatches();
                            if (matches) {
                                handleMatches().then(checkTaskCompletion);
                            } else {
                                swapTiles(sr, sc, row, col).then(() => {
                                    isProcessing = false;
                                    movesLeft++;
                                    updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes);
                                    render();
                                });
                            }
                            selectedTile = null;
                        });
                    }
                } else {
                    selectedTile = { row, col };
                    render();
                }
            }
        }

        //function isAdjacent(r1, c1, r2, c2) {
        //    return (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
        //}

        async function swapTiles(r1, c1, r2, c2) {
            try {
                const tile1 = board[r1][c1];
                const tile2 = board[r2][c2];
                board[r1][c1] = tile2;
                board[r2][c2] = tile1;

                tile1.targetX = c2 * TILE_SIZE;
                tile1.targetY = r2 * TILE_SIZE;
                tile2.targetX = c1 * TILE_SIZE;
                tile2.targetY = r1 * TILE_SIZE;

                animations.push({ row: r1, col: c1 }, { row: r2, col: c2 });
                render();
                await new Promise(resolve => setTimeout(resolve, 200));
                //validateBoard();
                validateBoard(board, GRID_WIDTH, GRID_HEIGHT);
            } catch (e) {
                console.error(`Error in swapTiles: ${e.message}`);
            }
        }

        function render() {
            try {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.strokeStyle = '#999';
                ctx.lineWidth = 2;
                for (let i = 0; i <= GRID_WIDTH; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * TILE_SIZE, 0);
                    ctx.lineTo(i * TILE_SIZE, canvas.height);
                    ctx.stroke();
                }
                for (let i = 0; i <= GRID_HEIGHT; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, i * TILE_SIZE);
                    ctx.lineTo(canvas.width, i * TILE_SIZE);
                    ctx.stroke();
                }

                if (!board || !Array.isArray(board)) {
                    console.warn('render: board is not initialized');
                    return;
                }

                for (let row = 0; row < GRID_HEIGHT; row++) {
                    if (!board[row] || !Array.isArray(board[row])) {
                        console.warn(`render: board[${row}] is undefined or not an array`);
                        continue;
                    }
                    for (let col = 0; col < GRID_WIDTH; col++) {
                        const tile = board[row][col];
                        if (tile) {
                            ctx.fillStyle = tile.bonusType ? '#444444' : selectedColors[tile.type];
                            const x = tile.x + TILE_SIZE / 2;
                            const y = tile.y + TILE_SIZE / 2;
                            let size = TILE_SIZE - 8;

                            if (tile.disappearing) {
                                tile.disappearProgress = Math.min(1, tile.disappearProgress + 0.016);
                                size *= (1 - tile.disappearProgress);
                                ctx.globalAlpha = 1 - tile.disappearProgress;
                                if (tile.disappearProgress >= 1) {
                                    board[row][col] = null;
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
                                switch (selectedShapes[tile.type]) {
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

                            if (selectedTile && selectedTile.row === row && selectedTile.col === col) {
                                ctx.strokeStyle = 'white';
                                ctx.lineWidth = 4;
                                ctx.beginPath();
                                ctx.rect(tile.x + 2, tile.y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                                ctx.stroke();
                            }
                        }
                    }
                }

                updateAnimations();
                if (animations.length > 0 || board.some(row => Array.isArray(row) && row.some(tile => tile && tile.disappearing))) {
                    requestAnimationFrame(render);
                }
            } catch (e) {
                console.error(`Error in render: ${e.message}`);
            }
        }

        function updateAnimations() {
            try {
                animations = animations.filter(anim => {
                    const tile = board[anim.row]?.[anim.col];
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
        createShapeCanvas('square', '#ff5555', shapeCanvases);
        createShapeCanvas('circle', '#55ff55', shapeCanvases);
        createShapeCanvas('triangle', '#5555ff', shapeCanvases);

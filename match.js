import state from './state.js';
import { validateBoard } from './utils.js';
import { updateScoreDisplay, updateTaskDisplay } from './ui.js';
import { showNotification } from './ui.js';

/**
 * Проверка матчей на поле.
 * Возвращает массив матчей или null, если совпадений нет.
 */
export function checkMatches() {
    const matches = [];

    // Горизонтальные совпадения
    for (let row = 0; row < state.GRID_HEIGHT; row++) {
        let col = 0;
        while (col < state.GRID_WIDTH) {
            const currentTile = state.board[row][col];
            if (!currentTile || currentTile.bonusType || currentTile.disappearing) {
                col++;
                continue;
            }
            const type = currentTile.type;
            let matchLength = 1;
            let matchCols = [col];
            let nextCol = col + 1;
            while (nextCol < state.GRID_WIDTH) {
                const nextTile = state.board[row][nextCol];
                if (!nextTile || nextTile.type !== type || nextTile.bonusType || nextTile.disappearing) {
                    break;
                }
                matchCols.push(nextCol);
                matchLength++;
                nextCol++;
            }
            if (matchLength >= 3) {
                matches.push({ positions: matchCols.map(c => ({ row, col: c })), length: matchLength, direction: 'horizontal', type });
            }
            col = nextCol;
        }
    }

    // Вертикальные совпадения
    for (let col = 0; col < state.GRID_WIDTH; col++) {
        let row = 0;
        while (row < state.GRID_HEIGHT) {
            const currentTile = state.board[row][col];
            if (!currentTile || currentTile.bonusType || currentTile.disappearing) {
                row++;
                continue;
            }
            const type = currentTile.type;
            let matchLength = 1;
            let matchRows = [row];
            let nextRow = row + 1;
            while (nextRow < state.GRID_HEIGHT) {
                const nextTile = state.board[nextRow][col];
                if (!nextTile || nextTile.type !== type || nextTile.bonusType || nextTile.disappearing) {
                    break;
                }
                matchRows.push(nextRow);
                matchLength++;
                nextRow++;
            }
            if (matchLength >= 3) {
                matches.push({ positions: matchRows.map(r => ({ row: r, col })), length: matchLength, direction: 'vertical', type });
            }
            row = nextRow;
        }
    }

    // L-образные совпадения для бонуса "звезда"
    for (let row = 0; row < state.GRID_HEIGHT; row++) {
        for (let col = 0; col < state.GRID_WIDTH; col++) {
            const currentTile = state.board[row][col];
            if (!currentTile || currentTile.bonusType || currentTile.disappearing) continue;
            const type = currentTile.type;
            let hCount = 1, vCount = 1;
            let hPositions = [{ row, col }], vPositions = [{ row, col }];

            for (let c = col + 1; c < state.GRID_WIDTH; c++) {
                const tile = state.board[row][c];
                if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                hPositions.push({ row, col: c });
                hCount++;
            }
            for (let c = col - 1; c >= 0; c--) {
                const tile = state.board[row][c];
                if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                hPositions.push({ row, col: c });
                hCount++;
            }

            for (let r = row + 1; r < state.GRID_HEIGHT; r++) {
                const tile = state.board[r][col];
                if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                vPositions.push({ row: r, col });
                vCount++;
            }
            for (let r = row - 1; r >= 0; r--) {
                const tile = state.board[r][col];
                if (!tile || tile.type !== type || tile.bonusType || tile.disappearing) break;
                vPositions.push({ row: r, col });
                vCount++;
            }

            if (hCount >= 3 && vCount >= 3) {
                const positions = [...hPositions, ...vPositions.filter(p => !hPositions.some(hp => hp.row === p.row && hp.col === p.col))];
                if (positions.length >= 5) {
                    matches.push({ positions, length: positions.length, direction: 'l-shaped', intersection: { row, col }, type });
                }
            }
        }
    }

    return matches.length > 0 ? matches : null;
}

/**
 * Обработка всех совпадений на поле (удаление, начисление очков, анимация, генерация бонусов).
 */
export async function handleMatches(render, checkTaskCompletion, dropTiles, fillBoard) {
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
                const tile = state.board[pos.row][pos.col];
                if (tile && !tile.disappearing) {
                    tile.disappearing = true;
                    tile.disappearProgress = 0;
                    tilesToRemove.add(`${pos.row},${pos.col}`);
                    if (state.selectedShapes[tile.type] === state.task.shape && !tile.bonusType) {
                        state.collectedShapes[state.task.shape]++;
                    }
                }
            });
            if (bonusType && bonusPos) {
                bonusTilesToPlace.push({ row: bonusPos.row, col: bonusPos.col, bonusType });
            }
        });

        const points = tilesToRemove.size * 10;
        state.taskScore += points;
        updateScoreDisplay(state.score, state.taskScore);
        updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
        render();
        await new Promise(resolve => setTimeout(resolve, 400));

        tilesToRemove.forEach(pos => {
            const [row, col] = pos.split(',').map(Number);
            state.board[row][col] = null;
        });

        dropTiles();
        fillBoard();
        validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
        bonusTilesToPlace.forEach(bonus => {
            state.board[bonus.row][bonus.col].bonusType = bonus.bonusType;
            state.board[bonus.row][bonus.col].type = 0;
        });

        render();
        await new Promise(resolve => setTimeout(resolve, 400));
        matches = checkMatches();
    }
    state.isProcessing = false;
    checkTaskCompletion();
}

/**
 * Обработка активации бонусной плитки (стрелка).
 */
export async function handleBonusTileAction(row, col, bonusType, render, checkTaskCompletion, dropTiles, fillBoard) {
    state.movesLeft--;
    updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);

    let tilesToRemove = [];
    if (bonusType === 'horizontal_arrow') {
        for (let c = 0; c < state.GRID_WIDTH; c++) {
            if (state.board[row][c] && !state.board[row][c].disappearing) {
                tilesToRemove.push({ row, col: c });
            }
        }
    } else if (bonusType === 'vertical_arrow') {
        for (let r = 0; r < state.GRID_HEIGHT; r++) {
            if (state.board[r][col] && !state.board[r][col].disappearing) {
                tilesToRemove.push({ row: r, col });
            }
        }
    }

    let points = 0;
    tilesToRemove.forEach(pos => {
        const tile = state.board[pos.row][pos.col];
        tile.disappearing = true;
        tile.disappearProgress = 0;
        if (state.selectedShapes[tile.type] === state.task.shape && !tile.bonusType) {
            state.collectedShapes[state.task.shape]++;
        }
        points += 10;
    });

    state.taskScore += points;
    updateScoreDisplay(state.score, state.taskScore);
    updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
    render();
    await new Promise(resolve => setTimeout(resolve, 400));

    tilesToRemove.forEach(pos => {
        state.board[pos.row][pos.col] = null;
    });

    dropTiles();
    fillBoard();
    validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
    render();
    await new Promise(resolve => setTimeout(resolve, 400));

    const matches = checkMatches();
    if (matches) {
        await handleMatches(render, checkTaskCompletion, dropTiles, fillBoard);
    }
}

/**
 * Обработка бонуса "звезда" (удалить все тайлы определенного типа).
 */
export async function handleBonusStarSwap(r1, c1, r2, c2, render, checkTaskCompletion, dropTiles, fillBoard) {
    const tile1 = state.board[r1][c1];
    const tile2 = state.board[r2][c2];
    const targetType = tile1.bonusType === 'bonus_star' ? tile2.type : tile1.type;

    let tilesToRemove = [];
    for (let r = 0; r < state.GRID_HEIGHT; r++) {
        for (let c = 0; c < state.GRID_WIDTH; c++) {
            if (state.board[r][c] && state.board[r][c].type === targetType && !state.board[r][c].disappearing) {
                tilesToRemove.push({ row: r, col: c });
            }
        }
    }

    const starPos = tile1.bonusType === 'bonus_star' ? { row: r1, col: c1 } : { row: r2, col: c2 };
    tilesToRemove.push(starPos);

    let points = 0;
    tilesToRemove.forEach(pos => {
        const tile = state.board[pos.row][pos.col];
        if (tile) {
            tile.disappearing = true;
            tile.disappearProgress = 0;
            if (state.selectedShapes[tile.type] === state.task.shape && !tile.bonusType) {
                state.collectedShapes[state.task.shape]++;
            }
            points += 10;
        }
    });

    state.taskScore += points;
    updateScoreDisplay(state.score, state.taskScore);
    updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
    render();
    await new Promise(resolve => setTimeout(resolve, 400));

    tilesToRemove.forEach(pos => {
        state.board[pos.row][pos.col] = null;
    });

    dropTiles();
    fillBoard();
    validateBoard(state.board, state.GRID_WIDTH, state.GRID_HEIGHT);
    render();
    await new Promise(resolve => setTimeout(resolve, 400));

    const matches = checkMatches();
    if (matches) {
        await handleMatches(render, checkTaskCompletion, dropTiles, fillBoard);
    }
}
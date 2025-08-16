// state.js

// Главное состояние игры
const state = {
    GRID_WIDTH: 6,
    GRID_HEIGHT: 6,
    TILE_SIZE: 50,
    ALL_SHAPES: ['square', 'circle', 'triangle'],
    ALL_COLORS: ['#ff5555', '#55ff55', '#5555ff'],
    selectedShapes: ['square', 'circle', 'triangle'],
    selectedColors: ['#ff5555', '#55ff55', '#5555ff'],
    board: [],
    selectedTile: null,
    isProcessing: false,
    score: 0,
    taskScore: 0,
    task: { shape: 'square', count: 10 },
    collectedShapes: { square: 0 },
    movesLeft: 15,
    shapeCanvases: {},
    animations: [],
    currentTaskIndex: 0,
    predefinedTasks: [
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
    ],
    isGameInitialized: false,
    isTaskProcessing: false,
    touchStartTile: null,
    touchMoved: false,
};

export default state;
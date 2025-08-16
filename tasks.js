import state from './state.js';
import { updateTaskDisplay, updateScoreDisplay, showNotification } from './ui.js';

/**
 * Загружает текущую задачу из списка предопределённых или генерирует новую.
 */
export function loadTask() {
    try {
        console.log(`Loading task at index ${state.currentTaskIndex}`);
        if (state.currentTaskIndex < state.predefinedTasks.length) {
            state.task = state.predefinedTasks[state.currentTaskIndex];
            state.movesLeft = state.task.moves;
            console.log(`Loaded predefined task ${state.currentTaskIndex + 1}: Collect ${state.task.count} ${state.task.shape} in ${state.movesLeft} moves`);
        } else {
            generateNewTask();
        }
        state.collectedShapes = { [state.task.shape]: 0 };
        state.taskScore = 0;
        updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
        updateScoreDisplay(state.score, state.taskScore);
    } catch (e) {
        console.error(`Failed to load task: ${e.message}`);
    }
}

/**
 * Случайная генерация новой задачи.
 */
export function generateNewTask() {
    try {
        const shapes = ['square', 'circle', 'triangle'];
        state.task = {
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            count: Math.floor(Math.random() * 8) + 8 // 8–15
        };
        state.collectedShapes = { [state.task.shape]: 0 };
        state.movesLeft = Math.floor(Math.random() * 9) + 12; // 12–20
        state.taskScore = 0;
        console.log(`New random task: Collect ${state.task.count} ${state.task.shape} in ${state.movesLeft} moves`);
        if (typeof window.initBoard === 'function') {
            window.initBoard();
        }
        updateTaskDisplay(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
        updateScoreDisplay(state.score, state.taskScore);
        if (typeof window.render === 'function') {
            window.render();
        }
    } catch (e) {
        console.error(`Failed to generate new task: ${e.message}`);
    }
}

/**
 * Проверяет выполнение задачи и обновляет состояние.
 */
export function checkTaskCompletion(initBoard, updateTaskDisplayFn, updateScoreDisplayFn, renderFn) {
    try {
        if (state.isTaskProcessing) {
            console.log('checkTaskCompletion: Task processing in progress, skipping...');
            return;
        }
        state.isTaskProcessing = true;

        if (state.collectedShapes[state.task.shape] >= state.task.count) {
            console.log(`Task completed: Collected ${state.collectedShapes[state.task.shape]}/${state.task.count} ${state.task.shape}`);
            state.score += state.taskScore;
            state.taskScore = 0;
            (updateScoreDisplayFn || updateScoreDisplay)(state.score, state.taskScore);
            showNotification('Task Completed!');
            setTimeout(() => {
                state.currentTaskIndex++;
                loadTask();
                if (initBoard) initBoard();
                (updateTaskDisplayFn || updateTaskDisplay)(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
                (updateScoreDisplayFn || updateScoreDisplay)(state.score, state.taskScore);
                if (renderFn) renderFn();
                state.isTaskProcessing = false;
            }, 2000);
        } else if (state.movesLeft <= 0) {
            console.log(`Task failed: Ran out of moves. Collected ${state.collectedShapes[state.task.shape]}/${state.task.count} ${state.task.shape}`);
            state.taskScore = 0;
            (updateScoreDisplayFn || updateScoreDisplay)(state.score, state.taskScore);
            showNotification('Task Failed! Try Again.');
            setTimeout(() => {
                loadTask();
                if (initBoard) initBoard();
                (updateTaskDisplayFn || updateTaskDisplay)(state.task, state.collectedShapes, state.movesLeft, state.shapeCanvases, state.selectedColors, state.selectedShapes);
                (updateScoreDisplayFn || updateScoreDisplay)(state.score, state.taskScore);
                if (renderFn) renderFn();
                state.isTaskProcessing = false;
            }, 2000);
        } else {
            state.isTaskProcessing = false;
        }
    } catch (e) {
        console.error(`Failed to check task completion: ${e.message}`);
        state.isTaskProcessing = false;
    }
}
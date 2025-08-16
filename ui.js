export function createShapeCanvas(shape, color, shapeCanvases) {
    if (shapeCanvases && shapeCanvases[shape]) return shapeCanvases[shape];
    const c = document.createElement('canvas');
    c.width = 18;
    c.height = 18;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    const x = 9, y = 9, size = 14;
    switch (shape) {
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
    if (shapeCanvases) shapeCanvases[shape] = c;
    return c;
}

export function updateScoreDisplay(score, taskScore) {
    document.getElementById('score-value').textContent = score;
    document.getElementById('task-score-value').textContent = taskScore;
}

export function updateTaskDisplay(task, collectedShapes, movesLeft, shapeCanvases, selectedColors, selectedShapes) {
    let html = `Collect ${collectedShapes[task.shape]}/${task.count} `;
    html += '<canvas width="18" height="18"></canvas>';
    html += ` in ${movesLeft} moves`;
    const el = document.getElementById('task-description');
    el.innerHTML = html;
    const canvas = el.querySelector('canvas');
    // shapeCanvases, selectedColors, selectedShapes должны быть переданы из game.js
    if (canvas && shapeCanvases && selectedColors && selectedShapes) {
        const shapeIndex = selectedShapes.indexOf(task.shape);
        const shapeColor = selectedColors[shapeIndex];
        if (!shapeCanvases[task.shape]) {
            createShapeCanvas(task.shape, shapeColor, shapeCanvases);
        }
        if (shapeCanvases[task.shape]) {
            canvas.getContext('2d').drawImage(shapeCanvases[task.shape], 0, 0);
        }
    }
}

export function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hidden');
    }, 2000);
}
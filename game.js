const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const score1Elem = document.getElementById('score1');
const score2Elem = document.getElementById('score2');
const modeSelect = document.getElementById('mode-select');
const settingsDiv = document.getElementById('settings');
const settingsForm = document.getElementById('settings-form');
const difficultyGroup = document.getElementById('difficulty-group');
const scoreboard = document.getElementById('scoreboard');
const controls = document.getElementById('controls');
const controls1p = document.getElementById('controls-1p');
const controls2p = document.getElementById('controls-2p');
const controlsMobile = document.getElementById('controls-mobile');
const pauseControls = document.getElementById('pause-controls');
const paddle1ColorInput = document.getElementById('paddle1-color');
const paddle2ColorInput = document.getElementById('paddle2-color');
const timerDiv = document.getElementById('timer');

// Touch control buttons
const touchControls = document.getElementById('touch-controls');
const p1UpBtn = document.getElementById('p1-up');
const p1DownBtn = document.getElementById('p1-down');
const p2UpBtn = document.getElementById('p2-up');
const p2DownBtn = document.getElementById('p2-down');

const PADDLE_WIDTH = 12, PADDLE_HEIGHT = 90, PADDLE_SPEED = 6;
const BALL_SIZE = 14, BALL_SPEED = 6;

let mode = 1; // 1: single player, 2: two player
let aiDifficulty = "easy";
let aiSpeed = 4;
let score1 = 0, score2 = 0;
let p1Y, p2Y, p1DY = 0, p2DY = 0;
let ballX, ballY, ballDX, ballDY;
let running = false;
let paused = false;
let paddle1Color = "#00ffff";
let paddle2Color = "#ffff00";

let timeLimit = 0; // in seconds; 0 for unlimited
let timeStart = 0; // timestamp in ms
let timeLeft = 0;
let timerInterval = null;
let gameEnded = false;
let timeEndMsg = "";
let showEndMsg = false;
let endMsgTimer = null;

// Touch state for paddles
let p1Touch = 0, p2Touch = 0;

// Responsive canvas sizing
function resizeCanvas() {
    // Maintain aspect ratio 16:10
    let w = window.innerWidth * 0.98;
    let h = window.innerHeight * 0.6;
    let ratio = 800/500;
    if (w/h > ratio) w = h * ratio;
    else h = w / ratio;
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
}
window.addEventListener('resize', () => {
    if (canvas.style.display !== 'none') resizeCanvas();
});
function showSettings(selectedMode) {
    mode = selectedMode;
    modeSelect.style.display = "none";
    settingsDiv.style.display = "";
    difficultyGroup.style.display = (mode === 1) ? "" : "none";
}
function backToModeSelect() {
    settingsDiv.style.display = "none";
    modeSelect.style.display = "";
}
function startGameFromSettings() {
    paddle1Color = paddle1ColorInput.value;
    paddle2Color = paddle2ColorInput.value;
    if (mode === 1) {
        aiDifficulty = settingsForm.difficulty.value;
        if (aiDifficulty === "easy") aiSpeed = 3;
        else if (aiDifficulty === "medium") aiSpeed = 5;
        else aiSpeed = 7;
    }
    // Time limit
    timeLimit = parseInt(settingsForm.timelimit.value, 10);
    startGame(mode);
}
function resetPositions() {
    p1Y = canvas.height/2 - PADDLE_HEIGHT/2;
    p2Y = canvas.height/2 - PADDLE_HEIGHT/2;
    ballX = canvas.width/2 - BALL_SIZE/2;
    ballY = canvas.height/2 - BALL_SIZE/2;
    ballDX = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ballDY = BALL_SPEED * (Math.random() * 2 - 1);
}
function startGame(selectedMode) {
    mode = selectedMode;
    settingsDiv.style.display = "none";
    modeSelect.style.display = "none";
    scoreboard.style.display = "";
    canvas.style.display = "";
    controls.style.display = "";
    pauseControls.style.display = "";
    controls1p.style.display = mode === 1 ? "" : "none";
    controls2p.style.display = mode === 2 ? "" : "none";
    // Show mobile controls if needed
    if (isMobile()) {
        controlsMobile.style.display = "";
        touchControls.style.display = "";
    } else {
        controlsMobile.style.display = "none";
        touchControls.style.display = "none";
    }
    timerDiv.style.display = (timeLimit > 0) ? "" : "none";
    score1 = score2 = 0;
    score1Elem.textContent = score1;
    score2Elem.textContent = score2;
    resizeCanvas();
    resetPositions();
    running = true;
    paused = false;
    gameEnded = false;
    showEndMsg = false;
    timeEndMsg = "";
    // Time limit logic
    if (timerInterval) clearInterval(timerInterval);
    if (timeLimit > 0) {
        timeLeft = timeLimit;
        updateTimerDisplay();
        timeStart = Date.now();
        timerInterval = setInterval(() => {
            if (paused || !running) return;
            const elapsed = Math.floor((Date.now() - timeStart) / 1000);
            timeLeft = Math.max(timeLimit - elapsed, 0);
            updateTimerDisplay();
            if (timeLeft <= 0) {
                endGameByTime();
            }
        }, 200);
    } else {
        timerDiv.textContent = "";
        if (timerInterval) clearInterval(timerInterval);
    }
    requestAnimationFrame(gameLoop);
}

function updateTimerDisplay() {
    if (timeLeft <= 0 && gameEnded) {
        timerDiv.textContent = "Time's up!";
        return;
    }
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    timerDiv.textContent = `Time Left: ${min}:${sec.toString().padStart(2, '0')}`;
}

function endGameByTime() {
    running = false;
    paused = false;
    gameEnded = true;
    timerDiv.style.display = "";
    updateTimerDisplay();

    // Choose winner message
    if (mode === 1) {
        if (score1 > score2) timeEndMsg = "Player 1 Wins!";
        else if (score2 > score1) timeEndMsg = "Computer Wins!";
        else timeEndMsg = "It's a Tie!";
    } else {
        if (score1 > score2) timeEndMsg = "Player 1 Wins!";
        else if (score2 > score1) timeEndMsg = "Player 2 Wins!";
        else timeEndMsg = "It's a Tie!";
    }
    showEndMsg = true;
    draw(); // Draw one last time with end message

    // Show message for 2 seconds, then pause/return to menu
    endMsgTimer = setTimeout(() => {
        showEndMsg = false;
        pauseGame();
    }, 2000);
}

function pauseGame() {
    paused = true;
    running = false;
    pauseControls.style.display = 'none';
    canvas.style.display = 'none';
    scoreboard.style.display = 'none';
    controls.style.display = 'none';
    settingsDiv.style.display = 'none';
    timerDiv.style.display = 'none';
    modeSelect.style.display = '';
    if (timerInterval) clearInterval(timerInterval);
    if (endMsgTimer) clearTimeout(endMsgTimer);
    touchControls.style.display = "none";
}

function draw() {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#444";
    for (let i = 10; i < canvas.height; i += 40)
        ctx.fillRect(canvas.width/2 - 2, i, 4, 24);

    ctx.fillStyle = paddle1Color;
    ctx.fillRect(0, p1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = paddle2Color;
    ctx.fillRect(canvas.width - PADDLE_WIDTH, p2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_SIZE/2, 0, 2*Math.PI);
    ctx.fill();

    // Draw end message in center when time's up
    if (showEndMsg && timeEndMsg) {
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#181818";
        ctx.fillRect(0, canvas.height/2 - 60, canvas.width, 120);
        ctx.globalAlpha = 1;
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = "#0ff";
        ctx.textAlign = "center";
        ctx.fillText("Time's up!", canvas.width/2, canvas.height/2 - 10);
        ctx.font = "bold 40px Arial";
        ctx.fillStyle = "#fff";
        ctx.fillText(timeEndMsg, canvas.width/2, canvas.height/2 + 40);
        ctx.restore();
    }
}

function update() {
    // Move paddles
    p1Y += p1DY + p1Touch;
    if (p1Y < 0) p1Y = 0;
    if (p1Y + PADDLE_HEIGHT > canvas.height) p1Y = canvas.height - PADDLE_HEIGHT;

    if (mode === 1) {
        // AI for Player 2 (right) - speed depends on difficulty
        let center = p2Y + PADDLE_HEIGHT/2;
        if (ballY < center - 20) p2Y -= aiSpeed;
        else if (ballY > center + 20) p2Y += aiSpeed;
    } else {
        // 2P mode: Human controls or touch
        p2Y += p2DY + p2Touch;
    }
    if (p2Y < 0) p2Y = 0;
    if (p2Y + PADDLE_HEIGHT > canvas.height) p2Y = canvas.height - PADDLE_HEIGHT;

    // Move ball
    ballX += ballDX;
    ballY += ballDY;

    // Wall collision
    if (ballY - BALL_SIZE/2 < 0 || ballY + BALL_SIZE/2 > canvas.height) {
        ballDY = -ballDY;
        ballY = Math.max(BALL_SIZE/2, Math.min(ballY, canvas.height - BALL_SIZE/2));
    }

    // Paddle collision - Left
    if (ballX - BALL_SIZE/2 < PADDLE_WIDTH &&
        ballY > p1Y && ballY < p1Y + PADDLE_HEIGHT
    ) {
        ballX = PADDLE_WIDTH + BALL_SIZE/2;
        ballDX = -ballDX;
        ballDY += (ballY - (p1Y + PADDLE_HEIGHT/2)) * 0.13;
    }

    // Paddle collision - Right
    if (ballX + BALL_SIZE/2 > canvas.width - PADDLE_WIDTH &&
        ballY > p2Y && ballY < p2Y + PADDLE_HEIGHT
    ) {
        ballX = canvas.width - PADDLE_WIDTH - BALL_SIZE/2;
        ballDX = -ballDX;
        ballDY += (ballY - (p2Y + PADDLE_HEIGHT/2)) * 0.13;
    }

    // Score
    if (ballX < 0) {
        score2++;
        score2Elem.textContent = score2;
        resetPositions();
    } else if (ballX > canvas.width) {
        score1++;
        score1Elem.textContent = score1;
        resetPositions();
    }
}

// Desktop keyboard controls
document.addEventListener('keydown', e => {
    // Player 1 (W/S or Up/Down)
    if (e.key === 'w' || e.key === 'W' || e.key === '') p1DY = -PADDLE_SPEED;
    if (e.key === 's' || e.key === 'S' || e.key === '') p1DY = PADDLE_SPEED;
    // Player 2 (2P mode: Up/Down)
    if (mode === 2) {
        if (e.key === '0') p2DY = -PADDLE_SPEED;
        if (e.key === 'o') p2DY = PADDLE_SPEED;
    }
    // Also allow pressing Escape to pause/quit
    if (running && (e.key === 'Escape' || e.key === 'Esc')) {
        pauseGame();
    }
});
document.addEventListener('keyup', e => {
    // Player 1
    if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S' ||
        (mode === 1 && (e.key === '' || e.key === ''))
    ) p1DY = 0;
    // Player 2
    if (mode === 2 && (e.key === '0' || e.key === 'o')) p2DY = 0;
});

// --- Touch controls for mobile ---
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function setupTouchControls() {
    let intervalId1, intervalId2, intervalId3, intervalId4;
    // Player 1 up
    p1UpBtn.ontouchstart = function(e) {
        e.preventDefault();
        p1Touch = -PADDLE_SPEED;
        clearInterval(intervalId1);
        intervalId1 = setInterval(() => { p1Touch = -PADDLE_SPEED; }, 16);
    };
    p1UpBtn.ontouchend = function(e) {
        e.preventDefault();
        p1Touch = 0;
        clearInterval(intervalId1);
    };
    // Player 1 down
    p1DownBtn.ontouchstart = function(e) {
        e.preventDefault();
        p1Touch = PADDLE_SPEED;
        clearInterval(intervalId2);
        intervalId2 = setInterval(() => { p1Touch = PADDLE_SPEED; }, 16);
    };
    p1DownBtn.ontouchend = function(e) {
        e.preventDefault();
        p1Touch = 0;
        clearInterval(intervalId2);
    };
    // Player 2 up (only in 2P)
    p2UpBtn.ontouchstart = function(e) {
        e.preventDefault();
        if (mode === 2) {
            p2Touch = -PADDLE_SPEED;
            clearInterval(intervalId3);
            intervalId3 = setInterval(() => { p2Touch = -PADDLE_SPEED; }, 16);
        }
    };
    p2UpBtn.ontouchend = function(e) {
        e.preventDefault();
        p2Touch = 0;
        clearInterval(intervalId3);
    };
    // Player 2 down
    p2DownBtn.ontouchstart = function(e) {
        e.preventDefault();
        if (mode === 2) {
            p2Touch = PADDLE_SPEED;
            clearInterval(intervalId4);
            intervalId4 = setInterval(() => { p2Touch = PADDLE_SPEED; }, 16);
        }
    };
    p2DownBtn.ontouchend = function(e) {
        e.preventDefault();
        p2Touch = 0;
        clearInterval(intervalId4);
    };
}
setupTouchControls();

function gameLoop() {
    if (!running) return;
    if (!paused && !gameEnded) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    } else if (showEndMsg && timeEndMsg) {
        // Draw end message if needed, then keep waiting for the timer to finish (handled by setTimeout)
        draw();
    }
}
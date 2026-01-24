// 게임 상태
let gameState = 'start'; // 'start', 'playing', 'gameover'
let score = 777;
let highScore = localStorage.getItem('highScore') || 0;
let gameSpeed = 5;
let gameSpeedIncrease = 0.001;
let obstacleInterval = 2000;
let lastObstacleTime = 0;

// DOM 요소
const dino = document.getElementById('dino');
const obstacle = document.getElementById('obstacle');
const cloud = document.getElementById('cloud');
const gameScreen = document.getElementById('gameScreen');
const gameOver = document.getElementById('gameOver');
const startScreen = document.getElementById('startScreen');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const finalScoreElement = document.getElementById('finalScore');

// 초기화
highScoreElement.textContent = highScore;

// 공룡 상태
let isJumping = false;
let isDucking = false;
let dinoY = 30;
let jumpVelocity = 0;
const gravity = 1.2;
const jumpPower = -18;

// 키보드 입력
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (gameState === 'start' && (e.code === 'Space' || e.code === 'ArrowUp')) {
        startGame();
    } else if (gameState === 'gameover' && (e.code === 'Space' || e.code === 'ArrowUp')) {
        resetGame();
    }
    
    if (gameState === 'playing') {
        if ((e.code === 'Space' || e.code === 'ArrowUp') && !isJumping && !isDucking) {
            jump();
        }
        if (e.code === 'ArrowDown') {
            duck();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    
    if (gameState === 'playing' && e.code === 'ArrowDown') {
        stopDuck();
    }
});

// 게임 시작
function startGame() {
    gameState = 'playing';
    startScreen.classList.add('hide');
    gameOver.classList.remove('show');
    score = 0;
    gameSpeed = 5;
    lastObstacleTime = Date.now();
    obstacle.style.display = 'none';
    cloud.style.display = 'none';
    updateScore();
    gameLoop();
}

// 게임 리셋
function resetGame() {
    dino.classList.remove('jump', 'duck');
    isJumping = false;
    isDucking = false;
    dinoY = 30;
    jumpVelocity = 0;
    obstacle.style.display = 'none';
    cloud.style.display = 'none';
    startGame();
}

// 점프
function jump() {
    if (!isJumping) {
        isJumping = true;
        isDucking = false;
        dino.classList.remove('duck');
        dino.classList.add('jump');
        jumpVelocity = jumpPower;
    }
}

// 숙이기
function duck() {
    if (!isJumping && !isDucking) {
        isDucking = true;
        dino.classList.add('duck');
    }
}

// 숙이기 해제
function stopDuck() {
    if (isDucking) {
        isDucking = false;
        dino.classList.remove('duck');
    }
}

// 장애물 생성
function createObstacle() {
    const now = Date.now();
    if (now - lastObstacleTime > obstacleInterval) {
        lastObstacleTime = now;
        
        // 기존 장애물 제거
        const existingObstacles = document.querySelectorAll('.obstacle-item');
        existingObstacles.forEach(obs => obs.remove());
        
        // 새 장애물 생성
        const newObstacle = document.createElement('div');
        newObstacle.className = 'obstacle obstacle-item';
        
        // 랜덤하게 선인장 또는 프테라노돈 선택
        const obstacleType = Math.random() > 0.5 ? 'cactus' : 'pterodactyl';
        newObstacle.classList.add(obstacleType);
        
        if (obstacleType === 'pterodactyl') {
            newObstacle.style.bottom = Math.random() > 0.5 ? '100px' : '80px';
        } else {
            newObstacle.style.bottom = '30px';
        }
        
        newObstacle.style.right = '-50px';
        gameScreen.appendChild(newObstacle);
    }
}

// 구름 생성
function createCloud() {
    const clouds = document.querySelectorAll('.cloud-item');
    if (clouds.length < 3) {
        const newCloud = document.createElement('div');
        newCloud.className = 'cloud cloud-item';
        newCloud.style.top = Math.random() * 100 + 30 + 'px';
        newCloud.style.right = '-100px';
        gameScreen.appendChild(newCloud);
    }
}

// 충돌 감지
function checkCollision() {
    const dinoRect = {
        left: 50,
        right: isDucking ? 100 : 90,
        top: isJumping ? dinoY : 30,
        bottom: isJumping ? dinoY + 50 : 80
    };
    
    const obstacles = document.querySelectorAll('.obstacle-item');
    
    for (let obs of obstacles) {
        const obsRect = obs.getBoundingClientRect();
        const gameRect = gameScreen.getBoundingClientRect();
        
        const obsLeft = obsRect.left - gameRect.left;
        const obsRight = obsRect.right - gameRect.left;
        const obsTop = obsRect.top - gameRect.top;
        const obsBottom = obsRect.bottom - gameRect.top;
        
        if (
            dinoRect.right > obsLeft &&
            dinoRect.left < obsRight &&
            dinoRect.bottom > obsTop &&
            dinoRect.top < obsBottom
        ) {
            return true;
        }
    }
    
    return false;
}

// 게임 오버
function gameOverScreen() {
    gameState = 'gameover';
    finalScoreElement.textContent = score;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    gameOver.classList.add('show');
}

// 점수 업데이트
function updateScore() {
    scoreElement.textContent = Math.floor(score);
}

// 게임 루프
function gameLoop() {
    if (gameState !== 'playing') return;
    
    // 점프 물리
    if (isJumping) {
        jumpVelocity += gravity;
        dinoY += jumpVelocity;
        
        if (dinoY <= 30) {
            dinoY = 30;
            jumpVelocity = 0;
            isJumping = false;
            dino.classList.remove('jump');
        }
    }
    
    // 속도 증가
    gameSpeed += gameSpeedIncrease;
    obstacleInterval = Math.max(1000, 2000 - gameSpeed * 50);
    
    // 점수 증가
    score += gameSpeed * 0.1;
    updateScore();
    
    // 장애물 이동
    const obstacles = document.querySelectorAll('.obstacle-item');
    obstacles.forEach(obs => {
        const currentRight = parseInt(obs.style.right) || -50;
        obs.style.right = (currentRight + gameSpeed) + 'px';
        
        if (currentRight > 850) {
            obs.remove();
        }
    });
    
    // 구름 이동
    const clouds = document.querySelectorAll('.cloud-item');
    clouds.forEach(cloud => {
        const currentRight = parseInt(cloud.style.right) || -100;
        cloud.style.right = (currentRight + gameSpeed * 0.5) + 'px';
        
        if (currentRight > 850) {
            cloud.remove();
        }
    });
    
    // 장애물 및 구름 생성
    createObstacle();
    if (Math.random() > 0.98) {
        createCloud();
    }
    
    // 충돌 체크
    if (checkCollision()) {
        gameOverScreen();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

// 초기 구름 생성
for (let i = 0; i < 2; i++) {
    setTimeout(() => {
        createCloud();
    }, i * 2000);
}

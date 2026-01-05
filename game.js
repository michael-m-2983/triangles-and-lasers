const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = new Player(canvas.width / 2, canvas.height / 2);
let bots = [];
let projectiles = [];
let particles = [];
let mouseActiveTime = 0;
let ui = new UI({ player, bots, projectiles, particles });

let keys = {};
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;
let mouseAim = false;
let mouseAimTimeout;

let lastTime = 0;
let botSpawnTimer = 0;

function init() {
    for (let i = 0; i < 10; i++) {
        spawnBot();
    }
}

function spawnBot() {
    const types = ['expert', 'skilled', 'medium', 'noob', 'afk'];
    const level = player.level;
    let weights = [1, 2, 3, 3, 1];
    if (level > 1) {
        weights[0] += level - 1;
        weights[1] += Math.floor(level / 2);
    }
    const totalWeight = weights.reduce((a,b)=>a+b);
    let rand = Math.random() * totalWeight;
    let type;
    for (let i = 0; i < types.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
            type = types[i];
            break;
        }
    }
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(canvas.width, canvas.height) / 2 + 100;
    const x = player.x + Math.cos(angle) * distance;
    const y = player.y + Math.sin(angle) * distance;
    bots.push(new Bot(x, y, type));
}

function update(deltaTime) {
    const worldMouseX = player.x + (mouseX - canvas.width / 2);
    const worldMouseY = player.y + (mouseY - canvas.height / 2);
    player.update(deltaTime, worldMouseX, worldMouseY, keys, mouseAim, mouseActiveTime);

    bots.forEach(bot => bot.update(deltaTime, player, bots));

    projectiles.forEach(projectile => projectile.update(deltaTime));
    projectiles.forEach(projectile => {
        if (projectile.homing) {
            const enemies = [...bots];
            if (enemies.length > 0) {
                const nearest = enemies.reduce((closest, e) => {
                    const d1 = Math.sqrt((projectile.x - closest.x)**2 + (projectile.y - closest.y)**2);
                    const d2 = Math.sqrt((projectile.x - e.x)**2 + (projectile.y - e.y)**2);
                    return d2 < d1 ? e : closest;
                });
                const dx = nearest.x - projectile.x;
                const dy = nearest.y - projectile.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 0) {
                    projectile.vx = (dx / dist) * 500;
                    projectile.vy = (dy / dist) * 500;
                }
            }
        }
    });
    projectiles = projectiles.filter(p => !p.isExpired());

    particles.forEach(particle => particle.update(deltaTime));
    particles = particles.filter(p => !p.isExpired());

    let deadBots = [];
    projectiles.forEach(projectile => {
        let hit = false;
        [...bots, player].forEach(entity => {
            if (entity === projectile.owner) return;            
            if (entity === player && player.invincible) return;
            if (!hit && projectile.collidesWith(entity)) {
                entity.health -= 25;
                projectile.lifetime = 0;
                hit = true;
                if (entity.health <= 0) {
                    if (entity === player) {
                        for (let i = 0; i < 20; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 100 + Math.random() * 200;
                            particles.push(new Particle(player.x, player.y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#00ff00', 2));
                        }
                        player.health = 100;
                        player.x = canvas.width / 2;
                        player.y = canvas.height / 2;
                        player.xp = Math.max(0, player.xp - 50);
                        player.killstreak = 0;
                        player.distanceTravelled = 0;
                        player.invincible = true;
                        player.invincibleTime = 3;
                    } else {
                        
                        const botIndex = bots.indexOf(entity);
                        
                        for (let i = 0; i < 10; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 50 + Math.random() * 100;
                            particles.push(new Particle(entity.x, entity.y, Math.cos(angle) * speed, Math.sin(angle) * speed, entity.color, 1));
                        }
                        player.gainXP(10);
                        player.killstreak++;
                        player.score += 100;
                        deadBots.push(botIndex);
                    }
                }
            }
        });
    });
    deadBots.sort((a,b)=>b-a).forEach(index => bots.splice(index, 1));

    const spawnRate = 1 + player.distanceTravelled / 10000;
    botSpawnTimer += deltaTime * spawnRate;
    if (botSpawnTimer > 1) { // Every second
        spawnBot();
        botSpawnTimer = 0;
    }

    ui.updateMinimap();
    ui.updateLeaderboard(deltaTime);
    ui.updateProgression();
}

function render() {
    const hue = (player.x * 0.01 + player.y * 0.01) % 360;
    const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height));
    gradient.addColorStop(0, `hsl(${hue}, 50%, 20%)`);
    gradient.addColorStop(1, `hsl(${(hue + 180) % 360}, 50%, 10%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 - player.x, canvas.height / 2 - player.y);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const startX = Math.floor((player.x - canvas.width / 2) / gridSize) * gridSize;
    const endX = Math.floor((player.x + canvas.width / 2) / gridSize) * gridSize + gridSize;
    const startY = Math.floor((player.y - canvas.height / 2) / gridSize) * gridSize;
    const endY = Math.floor((player.y + canvas.height / 2) / gridSize) * gridSize + gridSize;
    for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }

    bots.forEach(bot => bot.draw(ctx));
    projectiles.forEach(projectile => projectile.draw(ctx));
    particles.forEach(particle => particle.draw(ctx));
    player.draw(ctx);

    ctx.restore();
}

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.startsWith('Arrow')) {
        keys[e.key] = true;
    }
    if (e.key === ' ') {
        mouseDown = true;
    }
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.key.toLowerCase())) {
        mouseAim = false;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key.startsWith('Arrow')) {
        keys[e.key] = false;
    }
    if (e.key === ' ') {
        mouseDown = false;
    }
});

canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseActiveTime = Date.now();
    const worldMouseX = player.x + (mouseX - canvas.width / 2);
    const worldMouseY = player.y + (mouseY - canvas.height / 2);
    player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
});

canvas.addEventListener('mousedown', () => {
    mouseDown = true;
});

canvas.addEventListener('mouseup', () => {
    mouseDown = false;
});

init();
requestAnimationFrame(gameLoop);
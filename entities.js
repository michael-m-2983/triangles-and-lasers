class Entity {
    constructor(x, y, size, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.vx = 0;
        this.vy = 0;
        this.health = 100;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Health bar
        const barWidth = this.size * 2;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 10;
        ctx.fillStyle = '#000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(barX, barY, barWidth * (this.health / 100), barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    collidesWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + other.size;
    }
}

class Projectile {
    constructor(x, y, angle, color, homing, speed = 500, owner) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = 5;
        this.color = owner ? owner.color : color;
        this.lifetime = 2; // seconds
        this.homing = homing;
        this.owner = owner;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.lifetime -= deltaTime;
    }

    draw(ctx) {
        const length = 10;
        const mag = Math.sqrt(this.vx**2 + this.vy**2);
        if (mag > 0) {
            const dirX = this.vx / mag;
            const dirY = this.vy / mag;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(this.x - dirX * length, this.y - dirY * length);
            ctx.lineTo(this.x + dirX * length, this.y + dirY * length);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    isExpired() {
        return this.lifetime <= 0;
    }

    collidesWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + other.size;
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 20, '#00ff00');
        this.angle = 0;
        this.speed = 200;
        this.shootCooldown = 0;
        this.xp = 0;
        this.level = 1;
        this.health = 100;
        this.name = 'Player';
        this.killstreak = 0;
        this.homingBuff = false;
        this.homingEndTime = 0;
        this.distanceTravelled = 0;
        this.invincible = false;
        this.invincibleTime = 0;
        this.score = 0;
    }

    update(deltaTime, mouseX, mouseY, keys, mouseAim, mouseActiveTime) {
        this.vx = 0;
        this.vy = 0;
        if (keys.w || keys['ArrowUp']) this.vy = -this.speed;
        if (keys.s || keys['ArrowDown']) this.vy = this.speed;
        if (keys.a || keys['ArrowLeft']) this.vx = -this.speed;
        if (keys.d || keys['ArrowRight']) this.vx = this.speed;

        const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (mag > 0) {
            this.vx = (this.vx / mag) * this.speed;
            this.vy = (this.vy / mag) * this.speed;
        }

        const useMouse = Date.now() - mouseActiveTime < 500;
        if (useMouse) {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            this.angle = Math.atan2(dy, dx);
        } else {
            let dx = 0, dy = 0;
            if (keys.w || keys['ArrowUp']) dy -= 1;
            if (keys.s || keys['ArrowDown']) dy += 1;
            if (keys.a || keys['ArrowLeft']) dx -= 1;
            if (keys.d || keys['ArrowRight']) dx += 1;
            if (dx !== 0 || dy !== 0) {
                this.angle = Math.atan2(dy, dx);
            }
        }

        // Shooting
        this.shootCooldown -= deltaTime;
        if (this.shootCooldown <= 0 && mouseDown) {
            this.shoot();
            this.shootCooldown = 0.1; // 100ms cooldown
        }

        super.update(deltaTime);
        this.distanceTravelled += Math.sqrt((this.vx * deltaTime)**2 + (this.vy * deltaTime)**2);
        this.health = Math.min(100, this.health + deltaTime * 5);
        if (this.invincible) {
            this.invincibleTime -= deltaTime;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }
    }

    shoot() {
        const offset = this.size + 5;
        const px = this.x + Math.cos(this.angle) * offset;
        const py = this.y + Math.sin(this.angle) * offset;
        const speed = 500 + this.level * 20;
        const projectile = new Projectile(px, py, this.angle, '#ffff00', this.homingBuff && Date.now() < this.homingEndTime, speed, this);
        projectiles.push(projectile);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        if (this.invincible) ctx.globalAlpha = 0.5;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * 0.7, this.size);
        ctx.lineTo(this.size * 0.7, this.size);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Health bar
        const barWidth = this.size * 2;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 10;
        ctx.fillStyle = '#000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(barX, barY, barWidth * (this.health / 100), barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y + this.size + 25);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    gainXP(amount) {
        this.xp += amount;
        const xpNeeded = this.level * 100;
        if (this.xp >= xpNeeded) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.xp -= (this.level - 1) * 100;
        // Buffs
        this.speed += 20;
        this.shootCooldown = Math.max(0.05, this.shootCooldown - 0.01); // Faster shooting
        // Notification
        const notification = document.getElementById('notification');
        notification.textContent = `Level Up! Speed +20, Fire Rate Increased!`;
        notification.style.opacity = '1';
        setTimeout(() => notification.style.opacity = '0', 1000); // Shorter time
        if (this.level % 5 === 0) {
            this.homingBuff = true;
            this.homingEndTime = Date.now() + 60000; // 1 minute
            notification.textContent = `Special Buff: Homing Projectiles for 1 minute!`;
            notification.style.opacity = '1';
            setTimeout(() => notification.style.opacity = '0', 1000);
        }
    }
}

class Bot extends Entity {
    constructor(x, y, type) {
        super(x, y, 15, `hsl(${Math.random() * 360}, 100%, 50%)`);
        this.speed = 100;
        this.angle = 0;
        this.shootCooldown = 0;
        this.type = type; // 'expert', 'skilled', 'medium', 'noob', 'afk'
        this.target = null;
        this.name = this.generateName();
        this.lastTargetChange = 0;
        this.adjustStats();
    }

    generateName() {
        const names = [
            'Pythagoras', 'Euclid', 'TriangleMaster', 'AcuteAngle', 'ObtuseOne', 'RightTriangle', 'Isosceles', 'Scalene', 'Vertex', 'Apex',
            'Admiral Ackbar', 'Darth Triangle', 'LaserLord', 'SpaceTriangle', 'Galactic', 'Nebula', 'Photon', 'Quantum', 'Vortex', 'Warp',
            'xX_Triangle_Xx', 'TriangleSlayer', 'LaserBeam', 'PewPew', 'Boom', 'Zap', 'Blaster', 'Gunner', 'Sniper', 'Elite',
            'Trigon', 'Hypotenuse', 'Angle', 'Geometry', 'MathLord', 'SharpEdge', 'ThreeSides', 'Polygon', 'ShapeShifter', 'VoidTriangle',
            'StarWars', 'SciFi', 'Beam', 'Pulse', 'Energy', 'Force', 'Power', 'Strike', 'Blast', 'Nova'
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    adjustStats() {
        switch (this.type) {
            case 'expert':
                this.speed = 150;
                this.shootCooldownMax = 0.2;
                break;
            case 'skilled':
                this.speed = 120;
                this.shootCooldownMax = 0.3;
                break;
            case 'medium':
                this.speed = 100;
                this.shootCooldownMax = 0.5;
                break;
            case 'noob':
                this.speed = 80;
                this.shootCooldownMax = 1.0;
                break;
            case 'afk':
                this.speed = 50;
                this.shootCooldownMax = 2.0;
                break;
        }
    }

    update(deltaTime, player, allEntities) {
        this.lastTargetChange += deltaTime;
        if (this.lastTargetChange > 2) { // Change target every 2 seconds
            this.lastTargetChange = 0;
            this.findTarget(player, allEntities);
        }

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            this.angle = Math.atan2(dy, dx);

            if (distance > 100) { // Move towards target
                this.vx = (dx / distance) * this.speed;
                this.vy = (dy / distance) * this.speed;
            } else {
                this.vx = 0;
                this.vy = 0;
            }

            // Shoot
            this.shootCooldown -= deltaTime;
            if (this.shootCooldown <= 0 && distance < 300) { // Only shoot if target is close
                this.shoot();
                this.shootCooldown = this.shootCooldownMax;
            }
        } else {
            // Wander
            if (Math.random() < 0.01) { // Randomly change direction
                this.angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(this.angle) * this.speed * 0.5;
                this.vy = Math.sin(this.angle) * this.speed * 0.5;
            }
        }

        super.update(deltaTime);
    }

    findTarget(player, allEntities) {
        // Target player or nearest bot
        let targets = [player, ...allEntities.filter(e => e !== this && e instanceof Bot)];
        if (targets.length === 0) {
            this.target = null;
            return;
        }
        this.target = targets.reduce((closest, t) => {
            const d1 = Math.sqrt((this.x - closest.x)**2 + (this.y - closest.y)**2);
            const d2 = Math.sqrt((this.x - t.x)**2 + (this.y - t.y)**2);
            return d2 < d1 ? t : closest;
        });
    }

    shoot() {
        const offset = this.size + 5;
        const px = this.x + Math.cos(this.angle) * offset;
        const py = this.y + Math.sin(this.angle) * offset;
        const projectile = new Projectile(px, py, this.angle, '#ffff00', false, 500, this); // Bots don't bounce
        projectiles.push(projectile);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * 0.7, this.size);
        ctx.lineTo(this.size * 0.7, this.size);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Health bar
        const barWidth = this.size * 2;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 10;
        ctx.fillStyle = '#000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(barX, barY, barWidth * (this.health / 100), barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        // Name
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y + this.size + 25);
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, vx, vy, color, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.lifetime -= deltaTime;
    }

    draw(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isExpired() {
        return this.lifetime <= 0;
    }
}
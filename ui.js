class UI {
    constructor(game) {
        this.game = game;
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.leaderboardList = document.getElementById('leaderboard-list');
        this.levelSpan = document.getElementById('level');
        this.xpSpan = document.getElementById('xp');
        this.xpNeededSpan = document.getElementById('xp-needed');
        this.xpFill = document.getElementById('xp-fill');
        this.killstreakSpan = document.getElementById('killstreak');
        this.scoreSpan = document.getElementById('score');
        this.leaderboardUpdateTimer = 0;
        this.botNames = [
            'Pythagoras', 'Euclid', 'TriangleMaster', 'AcuteAngle', 'ObtuseOne', 'RightTriangle', 'Isosceles', 'Scalene', 'Vertex', 'Apex',
            'Admiral Ackbar', 'Darth Triangle', 'LaserLord', 'SpaceTriangle', 'Galactic', 'Nebula', 'Photon', 'Quantum', 'Vortex', 'Warp',
            'xX_Triangle_Xx', 'TriangleSlayer', 'LaserBeam', 'PewPew', 'Boom', 'Zap', 'Blaster', 'Gunner', 'Sniper', 'Elite',
            'Trigon', 'Hypotenuse', 'Angle', 'Geometry', 'MathLord', 'SharpEdge', 'ThreeSides', 'Polygon', 'ShapeShifter', 'VoidTriangle',
            'StarWars', 'SciFi', 'Beam', 'Pulse', 'Energy', 'Force', 'Power', 'Strike', 'Blast', 'Nova'
        ];
    }

    updateMinimap() {
        const ctx = this.minimapCtx;
        const canvas = this.minimapCanvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scale = 0.05; // Scale down the world - zoomed in more
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(centerX - 2, centerY - 2, 4, 4);

        ctx.fillStyle = '#ff0000';
        this.game.bots.forEach(bot => {
            const dx = (bot.x - this.game.player.x) * scale;
            const dy = (bot.y - this.game.player.y) * scale;
            if (Math.abs(dx) < centerX && Math.abs(dy) < centerY) {
                ctx.fillRect(centerX + dx - 1, centerY + dy - 1, 2, 2);
            }
        });
    }

    updateLeaderboard(deltaTime) {
        this.leaderboardUpdateTimer += deltaTime;
        if (this.leaderboardUpdateTimer < 5) return; // Update every 5 seconds
        this.leaderboardUpdateTimer = 0;

        const baseScore = this.game.player.xp * 10;
        const entries = [
            { name: 'Player', score: baseScore },
        ];
        for (let i = 0; i < 4; i++) {
            entries.push({
                name: this.botNames[i],
                score: Math.max(0, baseScore + Math.floor(Math.random() * 2000 - 1000))
            });
        }

        entries.sort((a, b) => b.score - a.score);

        this.leaderboardList.innerHTML = '';
        entries.forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${entry.name}</span><span>${entry.score}</span>`;
            this.leaderboardList.appendChild(li);
        });
    }

    updateProgression() {
        this.levelSpan.textContent = this.game.player.level;
        this.xpSpan.textContent = this.game.player.xp;
        const xpNeeded = this.game.player.level * 100;
        this.xpNeededSpan.textContent = xpNeeded;
        const percentage = (this.game.player.xp / xpNeeded) * 100;
        this.xpFill.style.width = `${Math.min(percentage, 100)}%`;
        this.killstreakSpan.textContent = this.game.player.killstreak;
        this.scoreSpan.textContent = this.game.player.score;
    }
}
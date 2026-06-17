// ============================================
// INFECTRA v0.2 - Makrophagen (Block D)
// Phagozytose, Chemotaxis, M1/M2-Polarisierung
// ============================================

class Macrophage {
    constructor(x, y, homeBase) {
        this.x = x; this.y = y;
        this.homeBase = homeBase;
        this.radius = 22;
        this.speed = 1.4;
        this.health = 350;
        this.maxHealth = 350;
        this.alive = true;
        this.target = null;
        this.state = 'patrolling'; // patrolling | chasing | phagocytizing | returning
        this.type = 'macrophage';

        this.patrolAngle = Math.random() * Math.PI * 2;
        this.patrolRadius = 200 + Math.random() * 300;
        this.patrolTimer = 0;
        this.attackCooldown = 0;
        this.phagocytizeTimer = 0;
        this.pseudopodPhase = Math.random() * Math.PI * 2;

        // C3b-Sensitivität: opsonisierte Bakterien werden bevorzugt
        this.opsoninSensitivity = 3.0;
    }

    update(unitCtx) {
        if (!this.alive) return;
        this.pseudopodPhase += 0.04;
        if (this.attackCooldown > 0) this.attackCooldown--;

        const allBacteria = [
            ...(unitCtx.units || []),
            unitCtx.player ? [unitCtx.player] : []
        ].flat();

        // Ziel suchen (bevorzuge opsonisierte / C3b-markierte)
        if (!this.target || this.target.health <= 0 || !this.target.alive) {
            this.target = this._findTarget(allBacteria);
            if (!this.target) { this.state = 'patrolling'; }
        }

        if (this.target) {
            const d = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (d < this.radius + (this.target.radius || 8) + 5) {
                this.state = 'phagocytizing';
                this._phagocytize(this.target);
            } else {
                this.state = 'chasing';
                const dx = this.target.x - this.x, dy = this.target.y - this.y;
                this.x += (dx / d) * this.speed;
                this.y += (dy / d) * this.speed;
            }
        } else {
            this._patrol();
        }
    }

    _findTarget(bacteria) {
        let best = null, bestScore = -Infinity;
        for (const b of bacteria) {
            if (!b || b.health <= 0) continue;
            const d = Math.hypot(b.x - this.x, b.y - this.y);
            if (d > 600) continue;
            let score = -d;
            if (b.c3bMarked) score += 400 * this.opsoninSensitivity;
            if (score > bestScore) { bestScore = score; best = b; }
        }
        return best;
    }

    _phagocytize(b) {
        if (this.attackCooldown > 0) return;
        this.phagocytizeTimer++;
        if (this.phagocytizeTimer >= 90) { // 1.5s Einschluss
            b.health -= 120;
            this.phagocytizeTimer = 0;
            this.attackCooldown = 60;
            if (b.health <= 0) { this.target = null; this.state = 'patrolling'; }
        }
    }

    _patrol() {
        this.patrolTimer++;
        if (!this._patrolWP || this.patrolTimer > 240 ||
            Math.hypot(this._patrolWP.x - this.x, this._patrolWP.y - this.y) < 15) {
            // Neuer Wegpunkt: zufällig in der Welt, bis zu 2000px von Heimat
            const a = Math.random() * Math.PI * 2;
            const d = 300 + Math.random() * 1700;
            const hb = this.homeBase;
            this._patrolWP = {
                x: Math.max(100, Math.min(WORLD_WIDTH-100,  hb.x + Math.cos(a) * d)),
                y: Math.max(100, Math.min(WORLD_HEIGHT-100, hb.y + Math.sin(a) * d))
            };
            this.patrolTimer = 0;
        }
        const dx = this._patrolWP.x - this.x, dy = this._patrolWP.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) { this.x += (dx / dist) * this.speed * 0.65; this.y += (dy / dist) * this.speed * 0.65; }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        const ph = this.pseudopodPhase;
        const r = this.radius;

        // Pseudopodien (amöbenartige Ausläufer)
        const nPod = 7;
        ctx.fillStyle = this.state === 'phagocytizing' ? 'rgba(255,130,0,0.35)' : 'rgba(200,100,0,0.25)';
        for (let i = 0; i < nPod; i++) {
            const a = (i / nPod) * Math.PI * 2 + ph * 0.3;
            const podLen = r * (0.5 + Math.sin(ph * 1.3 + i * 2.1) * 0.35);
            const px = this.x + Math.cos(a) * (r + podLen);
            const py = this.y + Math.sin(a) * (r + podLen);
            ctx.beginPath();
            ctx.ellipse(px, py, podLen * 0.55, podLen * 0.35, a, 0, Math.PI * 2);
            ctx.fill();
        }

        // Körper
        const g = ctx.createRadialGradient(this.x, this.y, 3, this.x, this.y, r);
        g.addColorStop(0, '#ffcc88');
        g.addColorStop(0.55, '#cc6600');
        g.addColorStop(1, '#6b2200');
        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        // Nukleus (multilobär wie echter Makrophage)
        ctx.fillStyle = 'rgba(80,30,0,0.7)';
        ctx.beginPath(); ctx.ellipse(this.x - 4, this.y, r * 0.35, r * 0.25, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(this.x + 5, this.y + 2, r * 0.3, r * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();

        // Phagozytose-Glow
        if (this.state === 'phagocytizing') {
            const pulse = (Math.sin(ph * 6) + 1) / 2;
            ctx.globalAlpha = 0.2 + pulse * 0.25;
            ctx.beginPath(); ctx.arc(this.x, this.y, r + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 4; ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // HP-Bar
        if (this.health < this.maxHealth) {
            ctx.fillStyle = '#300';
            ctx.fillRect(this.x - r, this.y - r - 8, r * 2, 3);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(this.x - r, this.y - r - 8, r * 2 * (this.health / this.maxHealth), 3);
        }
        ctx.restore();
    }
}

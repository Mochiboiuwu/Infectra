// ============================================
// INFECTRA v0.2 - Neutrophile Granulozyten (Block D)
// Erste Immunlinie, schnell & kurzlebig, Chemotaxis, NET-Bildung
// ============================================

class Neutrophil {
    constructor(x, y, homeBase) {
        this.x = x; this.y = y;
        this.homeBase = homeBase;
        this.radius = 13;
        this.speed = 3.8;
        this.health = 90;
        this.maxHealth = 90;
        this.lifespan = 1800 + Math.floor(Math.random() * 600); // ~30-40s
        this.alive = true;
        this.target = null;
        this.state = 'seeking'; // seeking | chasing | attacking | net
        this.type = 'neutrophil';

        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.netTimer = 0;
        this.netActive = false;    // Neutrophil Extracellular Trap
        this.granulePhase = Math.random() * Math.PI * 2;
        this.searchAngle = Math.random() * Math.PI * 2;
    }

    update(unitCtx) {
        if (!this.alive) return;
        this.lifespan--;
        this.granulePhase += 0.06;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.lifespan <= 0) { this.alive = false; return; }

        // NET: erschöpfter Neutrophil wirft Chromatinnetz - stirbt dabei
        if (this.health < 20 && !this.netActive) {
            this.netActive = true;
            this.state = 'net';
            this.netTimer = 180; // NET bleibt 3s aktiv
        }

        if (this.netActive) {
            this.netTimer--;
            if (this.netTimer <= 0) { this.alive = false; }
            // NET-Schaden an Bakterien im Radius
            const allB = [...(unitCtx.units || [])];
            if (unitCtx.player) allB.push(unitCtx.player);
            for (const b of allB) {
                if (!b || b.health <= 0) continue;
                if (Math.hypot(b.x - this.x, b.y - this.y) < 40) {
                    b.health -= 0.3; // kontinuierlicher NET-Schaden
                }
            }
            return;
        }

        const allBacteria = [...(unitCtx.units || [])];
        if (unitCtx.player) allBacteria.push(unitCtx.player);

        if (!this.target || this.target.health <= 0) {
            this.target = this._findTarget(allBacteria);
            if (!this.target) this.state = 'seeking';
        }

        if (this.target) {
            const d = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (d < this.radius + (this.target.radius || 8) + 3) {
                this.state = 'attacking';
                this._attack(this.target);
            } else {
                this.state = 'chasing';
                const dx = this.target.x - this.x, dy = this.target.y - this.y;
                this.x += (dx / d) * this.speed;
                this.y += (dy / d) * this.speed;
            }
        } else {
            this._seek();
        }
    }

    _findTarget(bacteria) {
        let best = null, bestScore = -Infinity;
        for (const b of bacteria) {
            if (!b || b.health <= 0) continue;
            const d = Math.hypot(b.x - this.x, b.y - this.y);
            if (d > 450) continue;
            let score = -d;
            if (b.c3bMarked) score += 300;
            if (score > bestScore) { bestScore = score; best = b; }
        }
        return best;
    }

    _attack(b) {
        if (this.attackCooldown > 0) return;
        b.health -= 22; // Degranulierung: Enzyme + ROS
        this.health -= 3; // Selbstschaden durch ROS
        this.attackCooldown = 35;
        if (b.health <= 0) { this.target = null; }
    }

    _seek() {
        // Zielgerichtete Suche statt zufälliges Wandern
        if (!this._seekWP || Math.hypot(this._seekWP.x - this.x, this._seekWP.y - this.y) < 20) {
            const a = Math.random() * Math.PI * 2;
            const d = 400 + Math.random() * 1200;
            const hb = this.homeBase;
            this._seekWP = {
                x: Math.max(100, Math.min(WORLD_WIDTH-100,  hb.x + Math.cos(a) * d)),
                y: Math.max(100, Math.min(WORLD_HEIGHT-100, hb.y + Math.sin(a) * d))
            };
        }
        const dx = this._seekWP.x - this.x, dy = this._seekWP.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.x += (dx / dist) * this.speed * 0.8;
        this.y += (dy / dist) * this.speed * 0.8;
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        const ph = this.granulePhase;
        const r = this.radius;

        if (this.netActive) {
            // NET: Chromatinnetz-Visualisierung
            const fade = this.netTimer / 180;
            ctx.globalAlpha = fade * 0.6;
            ctx.strokeStyle = '#e8e860';
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40);
                ctx.stroke();
                // Querstreben
                const a2 = a + Math.PI / 8;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(a) * 15, this.y + Math.sin(a) * 15);
                ctx.lineTo(this.x + Math.cos(a2) * 30, this.y + Math.sin(a2) * 30);
                ctx.stroke();
            }
            ctx.globalAlpha = fade * 0.8;
            ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#cccc40'; ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        // Granula (kleine Flecken = Enzyme-Vesikel)
        ctx.fillStyle = 'rgba(220,210,100,0.3)';
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + ph * 0.4;
            const gr = r * (0.4 + Math.sin(ph + i) * 0.1);
            ctx.beginPath();
            ctx.arc(this.x + Math.cos(a) * gr, this.y + Math.sin(a) * gr, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Körper
        const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, r);
        g.addColorStop(0, '#fffff0');
        g.addColorStop(0.5, '#d4d480');
        g.addColorStop(1, '#6a6a20');
        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        // Multilobärer Kern (typisch für Neutrophile: 3-5 Lappen)
        ctx.fillStyle = 'rgba(50,50,10,0.65)';
        const lobes = 3;
        for (let i = 0; i < lobes; i++) {
            const a = (i / lobes) * Math.PI * 2 + ph * 0.05;
            ctx.beginPath();
            ctx.ellipse(
                this.x + Math.cos(a) * r * 0.28,
                this.y + Math.sin(a) * r * 0.28,
                r * 0.25, r * 0.2, a, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Angriffs-Glow
        if (this.state === 'attacking') {
            ctx.globalAlpha = 0.25 + Math.sin(ph * 8) * 0.15;
            ctx.beginPath(); ctx.arc(this.x, this.y, r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffff44'; ctx.lineWidth = 2; ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Lebensdauer-Indicator (verblasst mit der Zeit)
        const lifeFrac = this.lifespan / 2400;
        ctx.globalAlpha = 0.15 * (1 - lifeFrac);
        ctx.beginPath(); ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();
    }
}

// ============================================
// INFECTRA v0.2 - Entitäten
// ============================================

const WORLD_WIDTH  = 20000;
const WORLD_HEIGHT = 20000;

const ResourceType = { GLUCOSE: 'glucose', AMINO: 'amino', LIPID: 'lipid', IRON: 'iron' };

// ---- Basis-Bakterium ----
class Bacterium {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = 3;
        this.alive = true;
    }
    distanceTo(other) { return Math.hypot(this.x - other.x, this.y - other.y); }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// ---- Spieler-Bakterium ----
class PlayerBacterium extends Bacterium {
    constructor(x, y) {
        super(x, y, 20, '#00ff66');
        this.speed = 5;
        this.health = 100;
        this.maxHealth = 100;
        this.inBase = false;
        this.angle = 0;
        this.flagellaPhase = 0;

        // Blutbahn-Einrasten
        this.lockedVessel = null;   // aktuelle Blutbahn in der man steuert
        this.vesselT = 0;           // Position entlang der Bahn (0..1)
        this.exitTimer = 0;         // wie lange WASD gegen die Bahn gedrueckt wird
        this.exitThreshold = 120;   // ~2s bei 60fps
        this.exitProgress = 0;      // 0..1 fuer Ausbruchs-Anzeige
    }

    update(keys, base, vessels, unitCtx) {
        this.flagellaPhase += 0.15;
        const distToBase = this.distanceTo(base);
        this.inBase = distToBase < base.radius + this.radius + 60;

        const baseSpeed = 5 * (typeof GameState !== 'undefined' ? GameState.landSpeedMult : 1);

        if (this.lockedVessel) {
            this._updateInVessel(keys, baseSpeed);
        } else {
            this._updateOnLand(keys, baseSpeed, vessels);
        }

        // E = Interaktion: Ressourcen farmen oder Feinde angreifen
        if (keys['e'] && unitCtx) {
            this._interact(base, unitCtx);
        }
        // E-Cooldown und Aktion-Timer
        if (this._eActionTimer > 0) this._eActionTimer--;

        this.x = Math.max(this.radius, Math.min(WORLD_WIDTH  - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));
    }

    _interact(base, unitCtx) {
        if (!this._eActionTimer) this._eActionTimer = 0;
        if (this._eCooldown === undefined) this._eCooldown = 0;
        if (this._eCooldown > 0) { this._eCooldown--; return; }

        const range = this.radius + 80;

        // 1. Nahe Immune Zelle angreifen
        const cells = unitCtx.immuneCells || [];
        let closestEnemy = null, minDistE = range;
        for (const c of cells) {
            const d = Math.hypot(c.x - this.x, c.y - this.y);
            if (d < minDistE) { minDistE = d; closestEnemy = c; }
        }
        if (closestEnemy) {
            closestEnemy.health -= 18;
            this._eCooldown = 30;
            this._eFlash = 8;
            return;
        }

        // 2. Nahen Ressourcen-Node farmen
        const nodes = unitCtx.resourceNodes || [];
        let closestNode = null, minDistN = range;
        for (const n of nodes) {
            if (n.amount <= 0) continue;
            const d = Math.hypot(n.x - this.x, n.y - this.y);
            if (d < minDistN) { minDistN = d; closestNode = n; }
        }
        if (closestNode) {
            const harvMult = (typeof GameState !== 'undefined' ? GameState.harvestMult : 1);
            const got = Math.min(closestNode.amount, 8 * harvMult);
            closestNode.amount -= got;
            base.addResource(closestNode.type, Math.floor(got));
            this._eCooldown = 25;
            this._eFlash = 6;
        }
    }

    _updateOnLand(keys, baseSpeed, vessels) {
        let dx = 0, dy = 0;
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;
        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            this.x += (dx / len) * baseSpeed;
            this.y += (dy / len) * baseSpeed;
            this.angle = Math.atan2(dy, dx);
        }
        // Einrasten falls in einer Blutbahn und Pfeiltaste gedrueckt
        if (vessels && (keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'])) {
            for (const v of vessels) {
                if (v.containsPoint(this.x, this.y)) {
                    this.lockedVessel = v;
                    this.vesselT = v.projectT(this.x, this.y);
                    this.exitTimer = 0;
                    break;
                }
            }
        }
    }

    _updateInVessel(keys, baseSpeed) {
        const v = this.lockedVessel;
        const vMult = (typeof GameState !== 'undefined' ? GameState.vesselSpeedMult : 1);
        const speed = baseSpeed * 2.2 * vMult;

        // Richtung der Bahn
        const dx = v.x2 - v.x1, dy = v.y2 - v.y1;
        const along = speed / v.len;

        // Pfeiltasten: entlang der Bahn bewegen
        let moveDir = 0;
        // Projiziere Pfeiltasten-Input auf die Bahnrichtung
        let inX = 0, inY = 0;
        if (keys['arrowup'])    inY -= 1;
        if (keys['arrowdown'])  inY += 1;
        if (keys['arrowleft'])  inX -= 1;
        if (keys['arrowright']) inX += 1;
        if (inX !== 0 || inY !== 0) {
            const dot = (inX * dx + inY * dy) / v.len;
            moveDir = Math.sign(dot);
            this.vesselT = Math.max(0, Math.min(1, this.vesselT + along * moveDir));
            this.angle = Math.atan2(dy * moveDir, dx * moveDir);
        }

        // Position auf die Bahn setzen
        this.x = v.x1 + dx * this.vesselT;
        this.y = v.y1 + dy * this.vesselT;

        // Verlassen: WASD halten fuer ~2s -> Austritt in die gedrueckte Richtung
        let wx = 0, wy = 0;
        if (keys['w']) wy -= 1;
        if (keys['s']) wy += 1;
        if (keys['a']) wx -= 1;
        if (keys['d']) wx += 1;

        if (wx !== 0 || wy !== 0) {
            this.exitTimer++;
            // waehrend des Ausbruchs driftet man schon leicht in die Richtung (Feedback)
            const wlen = Math.hypot(wx, wy);
            this.x += (wx / wlen) * 0.6;
            this.y += (wy / wlen) * 0.6;
            this.exitProgress = this.exitTimer / this.exitThreshold; // 0..1 fuer UI/Render

            if (this.exitTimer >= this.exitThreshold) {
                // kompletter Austritt: kraeftiger Schub aus der Bahn
                this.x += (wx / wlen) * (v.width / 2 + this.radius + 8);
                this.y += (wy / wlen) * (v.width / 2 + this.radius + 8);
                this.lockedVessel = null;
                this.exitTimer = 0;
                this.exitProgress = 0;
            }
        } else {
            this.exitTimer = Math.max(0, this.exitTimer - 4);
            this.exitProgress = this.exitTimer / this.exitThreshold;
        }
    }

    draw(ctx) {
        ctx.save();
        const r = this.radius;

        // --- Flagellen (hinten, peitschend) ---
        const numFlagella = 5;
        for (let i = 0; i < numFlagella; i++) {
            const spread = 0.55;
            const baseAngle = this.angle + Math.PI + (i - (numFlagella - 1) / 2) * spread / numFlagella;
            const sx = this.x + Math.cos(baseAngle) * (r - 2);
            const sy = this.y + Math.sin(baseAngle) * (r - 2);
            const len = 28 + i % 2 * 8;

            ctx.strokeStyle = `rgba(0,220,90,${0.25 + i * 0.04})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            for (let t = 0.05; t <= 1; t += 0.05) {
                const perp = Math.sin(t * 18 + this.flagellaPhase + i * 1.3) * (7 * t);
                const px = -Math.sin(baseAngle), py = Math.cos(baseAngle);
                ctx.lineTo(
                    sx + Math.cos(baseAngle) * t * len + px * perp,
                    sy + Math.sin(baseAngle) * t * len + py * perp
                );
            }
            ctx.stroke();
        }

        // --- Outer membrane glow ---
        ctx.shadowBlur = 22;
        ctx.shadowColor = '#00e87a';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,232,122,0.14)';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // --- Zellwand (leicht rauer Ring) ---
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,200,90,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // --- Körper-Gradient ---
        const grad = ctx.createRadialGradient(this.x - r * 0.3, this.y - r * 0.3, r * 0.05, this.x, this.y, r);
        grad.addColorStop(0,   '#b8ffd8');
        grad.addColorStop(0.35,'#00e87a');
        grad.addColorStop(0.75,'#00773a');
        grad.addColorStop(1,   '#002e18');
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00e87a';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;

        // --- E-Interaktions-Flash ---
        if (this._eFlash > 0) {
            ctx.globalAlpha = this._eFlash / 8 * 0.5;
            ctx.beginPath(); ctx.arc(this.x, this.y, r + 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff'; ctx.fill();
            ctx.globalAlpha = 1;
            this._eFlash--;
        }

        // --- Nukleoid (unregelmäßige DNA-Region) ---
        ctx.save();
        ctx.translate(this.x + 2, this.y);
        ctx.rotate(this.angle + 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.32, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,50,25,0.65)';
        ctx.fill();
        ctx.restore();

        // --- Ribosomen-Punkte ---
        const ribCount = 6;
        for (let i = 0; i < ribCount; i++) {
            const a = (i / ribCount) * Math.PI * 2 + this.flagellaPhase * 0.03;
            const rr = r * 0.55;
            ctx.beginPath();
            ctx.arc(this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(180,255,210,0.35)';
            ctx.fill();
        }

        ctx.restore();
    }
}

// ---- Scout-Bakterium ----
class ScoutBacterium extends Bacterium {
    constructor(x, y, homeBase) {
        super(x, y, 9, '#00cc55');
        this.type = 'scout';
        this.task = 'gather';        // gather | patrol | build | defend
        this.homeBase = homeBase;
        this.state = 'idle'; // idle | moving_to_resource | harvesting | returning
        this.targetResource = null;
        this.carriedResource = null;
        this.carriedAmount = 0;
        this.maxCarry = 20;
        this.harvestTimer = 0;
        this.harvestRate = 80;
        this.idleTimer = Math.random() * 60;
        this.health = 25;
        this.canFight = true;
        this.baseSpeed = 4;
    }

    // ctx: { resourceNodes, base, units, immuneBases, buffField }
    update(ctx) {
        const resourceNodes = Array.isArray(ctx) ? ctx : ctx.resourceNodes;
        this.flagellaPhase = (this.flagellaPhase || 0) + 0.2;
        switch (this.state) {
            case 'idle':          this._idle(resourceNodes); break;
            case 'moving_to_resource': this._moveToResource(); break;
            case 'harvesting':    this._harvest(); break;
            case 'returning':     this._returnToBase(); break;
        }
    }

    // Welche Ressource wird gerade fuer die Forschung am meisten gebraucht?
    _researchPriority() {
        if (typeof Research === 'undefined' || !Research.active) return null;
        const node = Research.active;
        let worstType = null, worstRatio = Infinity;
        for (const [r, need] of Object.entries(node.cost)) {
            if (need <= 0) continue;
            const inv = Research.invested[r] || 0;
            const ratio = inv / need;
            if (ratio < worstRatio) { worstRatio = ratio; worstType = r; }
        }
        return worstType;
    }

    _idle(nodes) {
        this.idleTimer--;
        if (this.idleTimer > 0) return;

        const priority = this._researchPriority();
        let best = null, bestScore = -Infinity;

        for (const n of nodes) {
            if (n.amount <= 0) continue;
            // Nicht mehr als 2 Einheiten pro Node (Verteilung)
            const maxSlots = this.type === 'worker' ? 2 : 2;
            if (n.reserved >= maxSlots) continue;

            const dist = this.distanceTo(n);
            if (dist > 8000) continue; // zu weit weg ignorieren

            // Score: Nähe + Typ-Bonus wenn Forschung den Typ braucht
            let score = -dist * 0.001;
            if (n.amount > 50) score += 1;
            if (priority && n.type === priority) score += 5;

            if (score > bestScore) { bestScore = score; best = n; }
        }

        if (best) {
            if (this.targetResource) this.targetResource.reserved = Math.max(0, this.targetResource.reserved - 1);
            this.targetResource = best;
            best.reserved++;
            this.state = 'moving_to_resource';
        } else {
            this.idleTimer = 40 + Math.random() * 40;
        }
    }

    _moveToResource() {
        if (!this.targetResource || this.targetResource.amount <= 0) {
            if (this.targetResource) { this.targetResource.reserved = Math.max(0, this.targetResource.reserved - 1); this.targetResource = null; }
            this.state = 'idle'; this.idleTimer = 20; return;
        }
        const dx = this.targetResource.x - this.x;
        const dy = this.targetResource.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.radius + this.targetResource.radius + 2) {
            this.state = 'harvesting'; this.harvestTimer = 0;
        } else {
            // Bewege direkt auf Ziel zu (Blutbahn-Boost kommt vom speed-Multiplier im gameloop)
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            this.angle = Math.atan2(dy, dx);
        }
    }

    _harvest() {
        if (!this.targetResource || this.targetResource.amount <= 0) {
            if (this.targetResource) { this.targetResource.reserved = Math.max(0, this.targetResource.reserved - 1); this.targetResource = null; }
            this.state = 'returning'; return;
        }
        this.harvestTimer++;
        const cap = this.maxCarry * (typeof GameState !== 'undefined' ? GameState.carryMult : 1);
        if (this.harvestTimer >= this.harvestRate) {
            const hMult = (typeof GameState !== 'undefined' ? GameState.harvestMult : 1);
            const take = Math.min(5 * hMult, this.targetResource.amount, cap - this.carriedAmount);
            this.targetResource.amount -= take;
            this.carriedAmount += take;
            this.carriedResource = this.targetResource.type;
            this.harvestTimer = 0;
            if (this.carriedAmount >= cap || this.targetResource.amount <= 0) {
                this.state = 'returning';
            }
        }
    }

    _returnToBase() {
        const dx = this.homeBase.x - this.x;
        const dy = this.homeBase.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.homeBase.radius + this.radius + 5) {
            if (this.carriedResource && this.carriedAmount > 0) {
                this.homeBase.addResource(this.carriedResource, this.carriedAmount);
                this.carriedAmount = 0;
                this.carriedResource = null;
            }
            this.state = 'idle'; this.idleTimer = 15 + Math.random() * 30;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            // Flagellen zeigen nach hinten = entgegen Bewegungsrichtung → Winkel = Bewegungsrichtung
            this.angle = Math.atan2(dy, dx);
        }
    }

    draw(ctx) {
        ctx.save();
        const phase = this.flagellaPhase || 0;
        const col = this.state === 'harvesting' ? '#ffaa00' : this.state === 'returning' ? '#00ffcc' : '#00bb55';

        // 3 lange Flagellen hinten
        const numF = 3;
        for (let i = 0; i < numF; i++) {
            const fa = this.angle + Math.PI + (i - 1) * 0.45;
            const sx = this.x + Math.cos(fa) * (this.radius - 1);
            const sy = this.y + Math.sin(fa) * (this.radius - 1);
            ctx.strokeStyle = `rgba(0,200,80,0.5)`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            for (let t = 0.05; t <= 1; t += 0.05) {
                const perp = Math.sin(t * 14 + phase + i * 1.8) * (9 * t);
                const px = -Math.sin(fa), py = Math.cos(fa);
                ctx.lineTo(sx + Math.cos(fa)*t*45 + px*perp, sy + Math.sin(fa)*t*45 + py*perp);
            }
            ctx.stroke();
        }

        // Körper
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, this.radius);
        g.addColorStop(0, '#aaffcc'); g.addColorStop(1, '#006633');
        ctx.fillStyle = g; ctx.fill();

        // Cargo
        if (this.carriedAmount > 0) {
            const rC = { glucose:'#ffdd00', amino:'#ff66aa', lipid:'#8888ff', iron:'#cc4400' };
            ctx.fillStyle = rC[this.carriedResource] || '#fff';
            ctx.beginPath(); ctx.arc(this.x, this.y - this.radius - 5, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// ---- Mini-Scout: winzig, billig, kann nicht kaempfen, spottet Immun-Basen ----
class MiniScout extends ScoutBacterium {
    constructor(x, y, homeBase) {
        super(x, y, homeBase);
        this.type = 'miniScout';
        this.radius = 5;
        this.color = '#33ffaa';
        this.maxCarry = 6;
        this.harvestRate = 100;
        this.health = 8;
        this.canFight = false;
        this.baseSpeed = 5.5;        // schneller als normale Scouts
        this.spotted = null;         // {x, y} einer entdeckten Immun-Basis
        this.spotState = 'scouting'; // scouting | reporting
    }

    update(ctx) {
        const immuneBases = ctx.immuneBases || [];
        this.flagellaPhase = (this.flagellaPhase || 0) + 0.25;

        // Immun-Basen in Sichtweite entdecken
        for (const ib of immuneBases) {
            if (Math.hypot(ib.x - this.x, ib.y - this.y) < 400) {
                this.spotted = { x: ib.x, y: ib.y, ref: ib, t: Date.now() };
                this.spotState = 'reporting';
            }
        }

        // Wenn etwas gespottet -> zur Basis zurueck um es zu melden
        if (this.spotState === 'reporting') {
            const b = this.homeBase;
            const dx = b.x - this.x, dy = b.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < b.radius + this.radius + 5) {
                // Fund teilen: in bekannte Bedrohungen eintragen (frisch)
                if (this.spotted && typeof knownThreats !== 'undefined') {
                    knownThreats.set(this.spotted.ref || this.spotted, { x: this.spotted.x, y: this.spotted.y, t: Date.now() });
                }
                this.spotState = 'scouting';
                this.spotted = null;
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
            return;
        }

        // Sonst: normales (schwaches) Sammeln
        super.update(ctx);
    }

    draw(ctx) {
        ctx.save();
        const phase = this.flagellaPhase || 0;
        const col = this.spotState === 'reporting' ? '#ffee00' : '#33ffaa';

        // 2 sehr lange Spirocheten-Flagellen
        for (let i = 0; i < 2; i++) {
            const fa = this.angle + Math.PI + (i - 0.5) * 0.3;
            const sx = this.x + Math.cos(fa) * this.radius;
            const sy = this.y + Math.sin(fa) * this.radius;
            ctx.strokeStyle = `rgba(50,255,170,0.45)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            for (let t = 0.03; t <= 1; t += 0.03) {
                const perp = Math.sin(t * 22 + phase + i * 3) * (8 * (1-t*0.3));
                const px = -Math.sin(fa), py = Math.cos(fa);
                ctx.lineTo(sx + Math.cos(fa)*t*60 + px*perp, sy + Math.sin(fa)*t*60 + py*perp);
            }
            ctx.stroke();
        }

        // Körper: kleines Oval
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();

        // Spot-Indikator: gelber Puls wenn meldend
        if (this.spotState === 'reporting') {
            ctx.globalAlpha = 0.5 + Math.sin(phase * 3) * 0.3;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffee00'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }
}

// ---- Arbeiter: schwerer Sammler + Konstrukteur ----
class Worker extends ScoutBacterium {
    constructor(x, y, homeBase) {
        super(x, y, homeBase);
        this.type = 'worker';
        this.radius = 12;
        this.color = '#00aa66';
        this.maxCarry = 50;          // hohe Tragkapazitaet
        this.harvestRate = 70;
        this.health = 45;
        this.baseSpeed = 3;
        this.buildContribution = 0.04; // baut die Basis aus wenn task=build
    }

    update(ctx) {
        if (this.task === 'build') { this._build(ctx); return; }
        // Schwacher Kampf: greift Feinde in Nahkampfreichweite an
        const enemies = (ctx.immuneCells || []);
        for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < this.radius + (e.radius || 10) + 5) {
                if (!this._workFightCd || this._workFightCd <= 0) {
                    e.health -= 4; // schwacher Biss
                    this._workFightCd = 50;
                }
                break;
            }
        }
        if (this._workFightCd > 0) this._workFightCd--;
        super.update(ctx);
    }

    _build(ctx) {
        const b = ctx.base || this.homeBase;
        const dx = b.x - this.x, dy = b.y - this.y;
        const dist = Math.hypot(dx, dy);
        const ring = b.radius + this.radius + 8;
        if (dist > ring + 4) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            // an der Basis -> kreisen & ausbauen
            this.flagellaPhase += 0.1;
            const a = Math.atan2(dy, dx) + 0.02;
            this.x = b.x - Math.cos(a) * ring;
            this.y = b.y - Math.sin(a) * ring;
            if (b.health < b.maxHealth) b.health = Math.min(b.maxHealth, b.health + this.buildContribution);
            b.buildProgress = (b.buildProgress || 0) + this.buildContribution;
        }
    }

    draw(ctx) {
        ctx.save();
        const phase = this.flagellaPhase || 0;
        const col = this.task === 'build' ? '#33cc88' : (this.state === 'returning' ? '#00ffcc' : '#00aa66');

        // 4 kurze dicke Flagellen (Fortbewegung)
        for (let i = 0; i < 4; i++) {
            const fa = this.angle + Math.PI + (i - 1.5) * 0.4;
            const sx = this.x + Math.cos(fa) * (this.radius - 2);
            const sy = this.y + Math.sin(fa) * (this.radius - 2);
            ctx.strokeStyle = 'rgba(0,180,100,0.55)';
            ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            for (let t = 0.1; t <= 1; t += 0.1) {
                const perp = Math.sin(t * 10 + phase + i * 1.5) * (6 * t);
                const px = -Math.sin(fa), py = Math.cos(fa);
                ctx.lineTo(sx + Math.cos(fa)*t*24 + px*perp, sy + Math.sin(fa)*t*24 + py*perp);
            }
            ctx.stroke();
        }

        // Mandibeln vorne (Schaufel-Kiefer)
        const mAngle = this.angle;
        for (let s = -1; s <= 1; s += 2) {
            const jawAngle = mAngle + s * 0.45;
            const jx = this.x + Math.cos(mAngle) * (this.radius - 1);
            const jy = this.y + Math.sin(mAngle) * (this.radius - 1);
            const opening = 0.15 + Math.abs(Math.sin(phase * 1.2)) * 0.2; // Kiefer bewegen sich
            ctx.strokeStyle = 'rgba(0,220,120,0.85)';
            ctx.lineWidth = 2.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(jx, jy);
            const len = 14;
            ctx.lineTo(jx + Math.cos(jawAngle + s * opening) * len, jy + Math.sin(jawAngle + s * opening) * len);
            ctx.stroke();
        }

        // Breiter Körper (leicht oval)
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.beginPath(); ctx.ellipse(0, 0, this.radius * 1.2, this.radius * 0.88, 0, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * 1.2);
        g.addColorStop(0, '#88ffcc'); g.addColorStop(1, '#005533');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(0,255,150,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();

        // Cargo
        if (this.carriedAmount > 0) {
            const rC = { glucose:'#ffdd00', amino:'#ff66aa', lipid:'#8888ff', iron:'#cc4400' };
            ctx.fillStyle = rC[this.carriedResource] || '#fff';
            ctx.beginPath(); ctx.arc(this.x, this.y - this.radius - 5, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// ---- Kaempfer: patrouilliert, greift Feinde an, ruft Verstaerkung ----
class Fighter extends Bacterium {
    constructor(x, y, homeBase) {
        super(x, y, 11, '#ff5544');
        this.type = 'fighter';
        this.task = 'patrol';
        this.homeBase = homeBase;
        this.health = 80;
        this.maxHealth = 80;
        this.attack = 6;
        this.canFight = true;
        this.baseSpeed = 3.5;
        this.target = null;
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.patrolRadius = 160 + Math.random() * 120;
        this.state = 'patrol'; // patrol | chase | attack
        this.flagellaPhase = Math.random() * 10;
    }

    update(ctx) {
        this.flagellaPhase += 0.2;
        const enemies = (ctx.immuneCells || []).concat(ctx.immuneBases || []);

        // Feind in der Naehe?
        if (!this.target || this.target.health <= 0) {
            this.target = null;
            let nearest = null, md = 380;
            for (const e of enemies) {
                if (e.health <= 0) continue;
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < md) { md = d; nearest = e; }
            }
            if (nearest) { this.target = nearest; this.state = 'chase'; }
        }

        if (this.state === 'defend') {
            // Zur Basis zurück zur Verteidigung
            const b = this.homeBase;
            const dx = b.x - this.x, dy = b.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist > b.radius + 60) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                this.angle = Math.atan2(dy, dx);
            } else {
                this.state = 'patrol'; // angekommen, wieder patrouillieren
            }
        } else if (this.target) {
            const dx = this.target.x - this.x, dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);
            const reach = this.radius + (this.target.radius || 10);
            if (dist <= reach + 4) {
                this.state = 'attack';
                this.target.health -= this.attack * 0.05;
                this.angle = Math.atan2(dy, dx);
                if (typeof requestReinforcement === 'function') requestReinforcement(this.target, this);
            } else {
                this.state = 'chase';
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                this.angle = Math.atan2(dy, dx);
            }
        } else {
            // Dynamische Patrouille: zufällige Wegpunkte in der Umgebung
            this.state = 'patrol';
            if (!this._patrolWP || Math.hypot(this._patrolWP.x - this.x, this._patrolWP.y - this.y) < 20) {
                this._setNextWaypoint(ctx);
            }
            if (this._patrolWP) {
                const dx = this._patrolWP.x - this.x, dy = this._patrolWP.y - this.y;
                const dist = Math.hypot(dx, dy) || 1;
                this.x += (dx / dist) * this.speed * 0.75;
                this.y += (dy / dist) * this.speed * 0.75;
                this.angle = Math.atan2(dy, dx);
            }
        }
    }

    _setNextWaypoint(ctx) {
        const b = this.homeBase;
        const threats = ctx.knownThreats;

        // 30% Chance: bekannte Immunbasis angreifen (Krieg)
        if (threats && threats.size > 0 && Math.random() < 0.3) {
            const entries = [...threats.values()];
            const pick = entries[Math.floor(Math.random() * entries.length)];
            // Nur wenn nicht zu weit (>6000px)
            if (Math.hypot(pick.x - this.x, pick.y - this.y) < 6000) {
                this._patrolWP = { x: pick.x + (Math.random()-0.5)*200, y: pick.y + (Math.random()-0.5)*200 };
                return;
            }
        }

        // Sonst: zufälliger Punkt im Umkreis 100-600px um die Basis
        const angle = Math.random() * Math.PI * 2;
        const dist  = 100 + Math.random() * 500;
        this._patrolWP = {
            x: Math.max(50, Math.min(WORLD_WIDTH-50,  b.x + Math.cos(angle) * dist)),
            y: Math.max(50, Math.min(WORLD_HEIGHT-50, b.y + Math.sin(angle) * dist))
        };
    }

    draw(ctx) {
        ctx.save();
        const phase = this.flagellaPhase || 0;
        const attacking = this.state === 'attack';
        const chasing   = this.state === 'chase';
        const col = attacking ? '#ff1100' : chasing ? '#ff6622' : '#dd3322';

        // Kurze kräftige Bewegungs-Flagellen hinten
        for (let i = 0; i < 3; i++) {
            const fa = this.angle + Math.PI + (i - 1) * 0.5;
            const sx = this.x + Math.cos(fa) * (this.radius - 2);
            const sy = this.y + Math.sin(fa) * (this.radius - 2);
            ctx.strokeStyle = 'rgba(255,80,40,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            for (let t = 0.1; t <= 1; t += 0.1) {
                const perp = Math.sin(t * 12 + phase + i * 2) * (5 * t);
                const px = -Math.sin(fa), py = Math.cos(fa);
                ctx.lineTo(sx + Math.cos(fa)*t*20 + px*perp, sy + Math.sin(fa)*t*20 + py*perp);
            }
            ctx.stroke();
        }

        // Körper
        const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius);
        g.addColorStop(0, '#ff9977'); g.addColorStop(1, '#880011');
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        // HAUER: 2 große Kampfklauen vorne
        const hauLen = attacking ? 18 : 14;
        for (let s = -1; s <= 1; s += 2) {
            ctx.strokeStyle = attacking ? '#ffcc00' : '#ff8855';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            const baseA = this.angle + s * 0.55;
            const bx = this.x + Math.cos(baseA) * this.radius;
            const by = this.y + Math.sin(baseA) * this.radius;
            // Hauer: gerade nach vorne + Haken am Ende
            ctx.beginPath();
            ctx.moveTo(bx, by);
            const tipX = bx + Math.cos(this.angle) * hauLen;
            const tipY = by + Math.sin(this.angle) * hauLen;
            ctx.lineTo(tipX, tipY);
            // Haken zurück
            ctx.lineTo(tipX + Math.cos(this.angle + s * 2.4) * 6,
                       tipY + Math.sin(this.angle + s * 2.4) * 6);
            ctx.stroke();
        }

        // Angriffs-Glow
        if (attacking) {
            ctx.globalAlpha = 0.3 + Math.sin(phase * 5) * 0.2;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 3; ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // HP-Bar
        if (this.health < this.maxHealth) {
            ctx.fillStyle = '#300';
            ctx.fillRect(this.x - 11, this.y - this.radius - 8, 22, 3);
            ctx.fillStyle = '#ff4422';
            ctx.fillRect(this.x - 11, this.y - this.radius - 8, 22 * (this.health / this.maxHealth), 3);
        }
        ctx.restore();
    }
}

// ---- Bauer: bildet den lebenden Boden -> Buff-Feld ----
class Builder extends Bacterium {
    constructor(x, y, homeBase) {
        super(x, y, 8, '#66ddff');
        this.type = 'builder';
        this.task = 'build';
        this.homeBase = homeBase;
        this.health = 30;
        this.canFight = false;
        this.baseSpeed = 2.5;
        this.slotAngle = Math.random() * Math.PI * 2;
        this.slotRing = 0;
        this.settled = false;
        this.flagellaPhase = Math.random() * 10;
    }

    update(ctx) {
        // Slot-Zuweisung: Finde freien Platz im Areal um die Basis
        const b = this.homeBase;
        if (!this._slotAssigned) {
            this._assignSlot(b, ctx.units || []);
        }

        const tx = this._targetX || b.x;
        const ty = this._targetY || b.y;
        const dx = tx - this.x, dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
            this.settled = true;
            this.x = tx; this.y = ty;
        } else {
            this.settled = false;
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            this.angle = Math.atan2(dy, dx);
        }
        this.flagellaPhase = ((this.flagellaPhase || 0) + (this.settled ? 0.02 : 0.05)) % (Math.PI * 2);
    }

    _assignSlot(base, units) {
        // Baue ein Hex-Gitter um die Basis auf
        const spacing = 20; // Abstand zwischen Bauern
        const minR = base.radius + 12;
        const maxR = base.radius + 220;
        const builders = units.filter(u => u.type === 'builder');

        // Finde Slot der noch nicht besetzt ist
        for (let ring = 0; ring < 12; ring++) {
            const r = minR + ring * spacing;
            if (r > maxR) break;
            const nPerRing = Math.max(6, Math.floor((2 * Math.PI * r) / spacing));
            for (let i = 0; i < nPerRing; i++) {
                const a = (i / nPerRing) * Math.PI * 2;
                const sx = base.x + Math.cos(a) * r;
                const sy = base.y + Math.sin(a) * r;
                // Besetzt?
                const taken = builders.some(b2 => b2 !== this && b2._targetX !== undefined &&
                    Math.hypot(b2._targetX - sx, b2._targetY - sy) < spacing * 0.8);
                if (!taken) {
                    this._targetX = sx;
                    this._targetY = sy;
                    this._slotAssigned = true;
                    return;
                }
            }
        }
        // Fallback: zufälliger Punkt im Areal
        const a = Math.random() * Math.PI * 2;
        const r = minR + Math.random() * 180;
        this._targetX = base.x + Math.cos(a) * r;
        this._targetY = base.y + Math.sin(a) * r;
        this._slotAssigned = true;
    }

    draw(ctx) {
        ctx.save();
        const phase = this.flagellaPhase || 0;
        this.flagellaPhase = (phase + 0.015) % (Math.PI * 2);

        // Kurze dicke Stütz-Flagellen rundherum (wie Wurzeln im Boden)
        const nFlagella = 5;
        for (let i = 0; i < nFlagella; i++) {
            const fa = (i / nFlagella) * Math.PI * 2 + phase * 0.3;
            const sx = this.x + Math.cos(fa) * (this.radius - 3);
            const sy = this.y + Math.sin(fa) * (this.radius - 3);
            ctx.strokeStyle = this.settled ? 'rgba(100,210,255,0.5)' : 'rgba(80,170,220,0.4)';
            ctx.lineWidth = this.settled ? 2.8 : 2;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            // Kurz, leicht gewellt, nach außen
            for (let t = 0.1; t <= 1; t += 0.1) {
                const perp = Math.sin(t * 8 + phase + i) * (3 * t);
                const px = -Math.sin(fa), py = Math.cos(fa);
                const len = this.settled ? 18 : 12;
                ctx.lineTo(sx + Math.cos(fa)*t*len + px*perp, sy + Math.sin(fa)*t*len + py*perp);
            }
            ctx.stroke();
        }

        // Breiter, leicht abgeflachter Körper (Bauer = massig)
        const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius);
        if (this.settled) {
            g.addColorStop(0, '#aaeeff'); g.addColorStop(1, '#1a6688');
        } else {
            g.addColorStop(0, '#88ccee'); g.addColorStop(1, '#114466');
        }
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * 1.1, this.radius * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();

        // Membrane-Ring (settled = leuchtend)
        ctx.globalAlpha = this.settled ? 0.7 : 0.35;
        ctx.strokeStyle = '#66ddff'; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * 1.1, this.radius * 0.95, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Settled-Puls: zeigt an, dass er aktiv Puffer-Feld aufbaut
        if (this.settled) {
            const pAmt = (Math.sin(phase * 2) + 1) / 2;
            ctx.globalAlpha = 0.15 + pAmt * 0.1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5 + pAmt * 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#66ddff'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
    }
}

// Einheiten-Definitionen (Basis-Kosten; skaliert mit GameState.resourceCostMult)
const UNIT_DEFS = {
    scout:     { label: 'Scout',     cost: { amino: 10, glucose: 5 },              cls: 'ScoutBacterium', requires: null },
    miniScout: { label: 'Mini-Scout',cost: { amino: 4, glucose: 2 },               cls: 'MiniScout',       requires: 'miniScout' },
    worker:    { label: 'Arbeiter',  cost: { amino: 18, glucose: 10, lipid: 5 },   cls: 'Worker',          requires: 'worker' },
    fighter:   { label: 'Kaempfer',  cost: { amino: 25, glucose: 12, iron: 3 },    cls: 'Fighter',         requires: 'fighter' },
    builder:   { label: 'Bauer',     cost: { amino: 14, lipid: 8 },                cls: 'Builder',         requires: 'builder' }
};

function makeUnit(type, x, y, homeBase) {
    switch (type) {
        case 'miniScout': return new MiniScout(x, y, homeBase);
        case 'worker':    return new Worker(x, y, homeBase);
        case 'fighter':   return new Fighter(x, y, homeBase);
        case 'builder':   return new Builder(x, y, homeBase);
        default:          return new ScoutBacterium(x, y, homeBase);
    }
}

// ---- Basis ----
class Base {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 70;
        this.health = 1000;
        this.maxHealth = 1000;
        this.resources = { glucose: 300, amino: 200, lipid: 80, iron: 15 };
        this.scoutCost  = { amino: 10, glucose: 5 };
        this.level = 1;
        this.pulse = 0;
    }

    addResource(type, amount) {
        if (this.resources[type] !== undefined) this.resources[type] += amount;
    }

    canAfford(cost) {
        return Object.entries(cost).every(([r, a]) => (this.resources[r] || 0) >= a);
    }

    spend(cost) {
        Object.entries(cost).forEach(([r, a]) => { this.resources[r] -= a; });
    }

    // Skalierte Kosten fuer einen Einheitentyp
    scaledCost(type) {
        const def = UNIT_DEFS[type];
        const m = (typeof GameState !== 'undefined' ? GameState.resourceCostMult : 1);
        const out = {};
        for (const [k, v] of Object.entries(def.cost)) out[k] = Math.ceil(v * m);
        return out;
    }

    scaledScoutCost() { return this.scaledCost('scout'); }

    isUnlocked(type) {
        const req = UNIT_DEFS[type].requires;
        if (!req) return true;
        return (typeof GameState !== 'undefined') && GameState.unlockedUnits[req];
    }

    // Generische Produktion eines Einheitentyps
    produce(type) {
        if (!this.isUnlocked(type)) return null;
        const cost = this.scaledCost(type);
        if (!this.canAfford(cost)) return null;
        this.spend(cost);
        const angle = Math.random() * Math.PI * 2;
        return makeUnit(
            type,
            this.x + Math.cos(angle) * (this.radius + 25),
            this.y + Math.sin(angle) * (this.radius + 25),
            this
        );
    }

    produceScout() { return this.produce('scout'); }

    update() {
        this.pulse = (this.pulse + 0.018) % (Math.PI * 2);
    }

    draw(ctx) {
        ctx.save();
        const pr = this.radius + Math.sin(this.pulse) * 6;

        // Outer glow rings
        for (let i = 3; i >= 1; i--) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, pr + i * 12, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,255,100,${0.04 * i})`;
            ctx.lineWidth = 6;
            ctx.stroke();
        }

        // Body gradient
        const grad = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, pr);
        grad.addColorStop(0, '#00ff88');
        grad.addColorStop(0.5, '#00662a');
        grad.addColorStop(1, '#001a0d');
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#00ff66';
        ctx.beginPath();
        ctx.arc(this.x, this.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // HP-Bar
        const hp = this.health / this.maxHealth;
        const bw = pr * 2, bx = this.x - pr, by = this.y + pr + 12;
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(bx, by, bw, 7);
        ctx.fillStyle = hp > 0.5 ? '#00ff44' : hp > 0.25 ? '#ffaa00' : '#ff2200';
        ctx.fillRect(bx, by, bw * hp, 7);
        ctx.strokeStyle = '#00ff44';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, 7);

        ctx.restore();
    }
}

// ---- Wirtszelle ----
class HostCell {
    constructor(x, y, type = 'generic') {
        this.x = x; this.y = y; this.type = type;
        this.radius = type === 'erythrocyte' ? 8 : 22;
        this.maxHealth = type === 'erythrocyte' ? 30 : 100;
        this.health = this.maxHealth;
        this.isInfected = false;
        this.infectionTimer = 0;
        this.infectionBurst = 360;
        this.resourceYield = {
            erythrocyte: { iron: 8, glucose: 2 },
            epithelial:  { amino: 10, lipid: 5 },
            generic:     { glucose: 6, amino: 4 }
        }[type] || { glucose: 4 };
    }

    infect() {
        if (this.isInfected) return false;
        this.isInfected = true; this.infectionTimer = 0; return true;
    }

    update() {
        if (this.isInfected) {
            this.infectionTimer++;
            this.health = Math.max(0, this.health - 0.08);
        }
    }

    get isBursting() { return this.isInfected && this.infectionTimer >= this.infectionBurst; }

    draw(ctx) {
        ctx.save();
        const infected = this.isInfected;
        const progress = infected ? this.infectionTimer / this.infectionBurst : 0;

        if (this.type === 'erythrocyte') {
            // Bikonkave Scheibe
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = infected ? '#880033' : '#cc2244';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fill();
        } else {
            const baseColor = infected
                ? `rgba(${100 + Math.floor(progress * 60)}, 0, ${180 - Math.floor(progress * 60)}, 0.9)`
                : (this.type === 'epithelial' ? '#aa3366' : '#882244');
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = baseColor;
            ctx.fill();
            // Nukleus
            ctx.beginPath();
            ctx.ellipse(this.x + 3, this.y - 3, this.radius * 0.32, this.radius * 0.22, 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fill();
        }

        if (infected) {
            ctx.strokeStyle = `rgba(160,0,255,${0.2 + progress * 0.8})`;
            ctx.lineWidth = 1.5 + progress * 2;
            ctx.stroke();
        }
        ctx.restore();
    }
}

// ---- Ressourcen-Node ----
class ResourceNode {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.maxAmount = 120 + Math.floor(Math.random() * 180);
        this.amount = this.maxAmount;
        this.radius = 14;
        this.pulse = Math.random() * Math.PI * 2;
        this.respawnTimer = 0;
        this.respawnTime = 1800;
        this.reserved = 0;   // wie viele Einheiten gerade angesteuert werden
    }

    update() {
        this.pulse = (this.pulse + 0.04) % (Math.PI * 2);
        if (this.amount <= 0) {
            this.respawnTimer++;
            if (this.respawnTimer >= this.respawnTime) {
                this.amount = this.maxAmount; this.respawnTimer = 0;
            }
        }
    }

    draw(ctx) {
        if (this.amount <= 0) return;
        const palette = {
            glucose: { c: '#ffdd00', s: 'rgba(255,220,0,0.5)' },
            amino:   { c: '#ff66aa', s: 'rgba(255,100,150,0.5)' },
            lipid:   { c: '#8888ff', s: 'rgba(130,130,255,0.5)' },
            iron:    { c: '#cc4400', s: 'rgba(200,70,0,0.5)' }
        };
        const p = palette[this.type] || { c: '#ffffff', s: 'rgba(255,255,255,0.4)' };
        const r = this.radius + Math.sin(this.pulse) * 3;
        const ratio = this.amount / this.maxAmount;

        ctx.save();
        ctx.globalAlpha = 0.55 + ratio * 0.45;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
        // Heller Kern
        ctx.beginPath();
        ctx.arc(this.x - r * 0.25, this.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ============================================
// Auto-Produktions-Manager
// Pro Einheitentyp: Auto-An/Aus + Ziel-Anzahl.
// Produziert automatisch bis die Ziel-Anzahl erreicht ist (wenn Ressourcen da sind).
// ============================================
const ProductionManager = {
    settings: {
        scout:     { auto: false, target: 0 },
        miniScout: { auto: false, target: 0 },
        worker:    { auto: false, target: 0 },
        fighter:   { auto: false, target: 0 },
        builder:   { auto: false, target: 0 }
    },
    cooldown: 0,
    cooldownMax: 25, // Frames zwischen Auto-Produktionen

    countOf(units, type) {
        let n = 0;
        for (const u of units) if (u.type === type) n++;
        return n;
    },

    update(base, units) {
        if (this.cooldown > 0) { this.cooldown--; return; }
        for (const [type, cfg] of Object.entries(this.settings)) {
            if (!cfg.auto || cfg.target <= 0) continue;
            if (!base.isUnlocked(type)) continue;
            if (this.countOf(units, type) >= cfg.target) continue;
            const u = base.produce(type);
            if (u) { units.push(u); this.cooldown = this.cooldownMax; return; }
        }
    }
};

// ============================================
// Buff-Feld (Bauer-Boden)
// Bauer rund um die Basis erzeugen ein Feld; Bakterien darin sind schneller & zaeher.
// ============================================
const BuffField = {
    active: false, x: 0, y: 0, radius: 0,
    speedBonus: 1.25, healthRegen: 0.02,

    recompute(base, units) {
        let builders = 0;
        for (const u of units) if (u.type === 'builder' && u.settled) builders++;
        if (builders >= 3) {
            this.active = true;
            this.x = base.x; this.y = base.y;
            this.radius = base.radius + 40 + builders * 6;
        } else {
            this.active = false;
        }
    },

    contains(e) {
        return this.active && Math.hypot(e.x - this.x, e.y - this.y) < this.radius;
    },

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100,220,255,0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,220,255,0.18)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
};

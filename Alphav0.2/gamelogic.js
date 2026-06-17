// ============================================
// INFECTRA v0.2 - Game Engine
// ============================================

// ---- Kamera ----
class Camera {
    constructor(w, h) {
        this.x = 0; this.y = 0; this.zoom = 1;
        this.canvasW = w; this.canvasH = h;
    }
    follow(entity) {
        const tx = entity.x - (this.canvasW / 2) / this.zoom;
        const ty = entity.y - (this.canvasH / 2) / this.zoom;
        this.x += (tx - this.x) * 0.08;
        this.y += (ty - this.y) * 0.08;
        this.x = Math.max(0, Math.min(WORLD_WIDTH  - this.canvasW  / this.zoom, this.x));
        this.y = Math.max(0, Math.min(WORLD_HEIGHT - this.canvasH / this.zoom, this.y));
    }
    apply(ctx) { ctx.save(); ctx.scale(this.zoom, this.zoom); ctx.translate(-this.x, -this.y); }
    restore(ctx) { ctx.restore(); }
    setSize(w, h) { this.canvasW = w; this.canvasH = h; }
    toWorld(sx, sy) { return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y }; }
    toScreen(wx, wy) { return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom }; }
}

// ---- Blutgefäß ----
class BloodVessel {
    constructor(x1, y1, x2, y2, width, type = 'capillary') {
        this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2;
        this.width = width; this.type = type;
        this.len = Math.hypot(x2 - x1, y2 - y1);
    }
    projectT(px, py) {
        if (this.len === 0) return 0;
        const dx = this.x2 - this.x1, dy = this.y2 - this.y1;
        return Math.max(0, Math.min(1, ((px - this.x1) * dx + (py - this.y1) * dy) / (this.len * this.len)));
    }
    containsPoint(px, py) {
        if (this.len === 0) return false;
        const dx = this.x2 - this.x1, dy = this.y2 - this.y1;
        const t = this.projectT(px, py);
        return Math.hypot(px - (this.x1 + t * dx), py - (this.y1 + t * dy)) < this.width / 2;
    }
    get speedMult() { return this.type === 'artery' ? 3.0 : this.type === 'vein' ? 2.0 : 1.5; }
    isVisible(cam, cw, ch) {
        const margin = this.width + 20;
        const vx = cam.x - margin, vy = cam.y - margin;
        const vw = cw / cam.zoom + margin * 2, vh = ch / cam.zoom + margin * 2;
        const minX = Math.min(this.x1, this.x2), maxX = Math.max(this.x1, this.x2);
        const minY = Math.min(this.y1, this.y2), maxY = Math.max(this.y1, this.y2);
        return maxX > vx && minX < vx + vw && maxY > vy && minY < vy + vh;
    }

    draw(ctx) {
        const c = { artery:'rgba(180,20,20,0.7)', vein:'rgba(20,20,190,0.65)', capillary:'rgba(140,30,70,0.45)' };
        ctx.strokeStyle = c[this.type];
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(this.x1, this.y1); ctx.lineTo(this.x2, this.y2); ctx.stroke();
    }
}

function generateBloodVessels() {
    const v = [];
    const cx = WORLD_WIDTH * 0.5, cy = WORLD_HEIGHT * 0.5;

    // Hauptarterie + -vene horizontal
    v.push(new BloodVessel(0, cy, WORLD_WIDTH, cy, 90, 'artery'));
    v.push(new BloodVessel(0, cy - 120, WORLD_WIDTH, cy - 120, 65, 'vein'));

    // Vertikale Hauptäste
    v.push(new BloodVessel(cx, 0, cx, WORLD_HEIGHT, 75, 'artery'));
    v.push(new BloodVessel(cx + 150, 0, cx + 150, WORLD_HEIGHT, 55, 'vein'));

    // Seitenäste von der Hauptarterie
    const branchPoints = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9];
    for (const t of branchPoints) {
        const bx = WORLD_WIDTH * t;
        const jitter = (Math.random() - 0.5) * 1200;
        // Oben
        v.push(new BloodVessel(bx, cy, bx + jitter, cy - 2000 - Math.random() * 3000, 32, 'artery'));
        v.push(new BloodVessel(bx + 80, cy - 120, bx + jitter + 80, cy - 120 - 2000 - Math.random() * 3000, 22, 'vein'));
        // Unten
        v.push(new BloodVessel(bx, cy, bx + jitter * 0.8, cy + 2000 + Math.random() * 3000, 32, 'artery'));
        v.push(new BloodVessel(bx + 80, cy - 120, bx + jitter * 0.8 + 80, cy - 120 + 2000 + Math.random() * 3000, 22, 'vein'));
    }

    // Kapillarnetz
    for (let i = 0; i < 50; i++) {
        const sx = Math.random() * WORLD_WIDTH, sy = Math.random() * WORLD_HEIGHT;
        const angle = Math.random() * Math.PI * 2;
        const len = 600 + Math.random() * 1400;
        v.push(new BloodVessel(sx, sy, sx + Math.cos(angle) * len, sy + Math.sin(angle) * len, 12, 'capillary'));
    }
    return v;
}

function generateHostCells(count) {
    const cells = [];
    const clusters = 25;
    const perCluster = Math.floor(count / clusters);
    const types = ['erythrocyte', 'erythrocyte', 'erythrocyte', 'epithelial', 'generic'];
    for (let c = 0; c < clusters; c++) {
        const cx = 500 + Math.random() * (WORLD_WIDTH  - 1000);
        const cy = 500 + Math.random() * (WORLD_HEIGHT - 1000);
        for (let i = 0; i < perCluster; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = 30 + Math.random() * 350;
            cells.push(new HostCell(
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist,
                types[Math.floor(Math.random() * types.length)]
            ));
        }
    }
    return cells;
}

function generateResourceNodes() {
    const nodes = [];
    const typeWeights = [
        'glucose','glucose','glucose',
        'amino','amino',
        'lipid',
        'iron'
    ];
    for (let i = 0; i < 80; i++) {
        nodes.push(new ResourceNode(
            200 + Math.random() * (WORLD_WIDTH  - 400),
            200 + Math.random() * (WORLD_HEIGHT - 400),
            typeWeights[Math.floor(Math.random() * typeWeights.length)]
        ));
    }
    return nodes;
}

// ============================================================
// IMMUNBASE (Block D)
// ============================================================
class ImmuneBase {
    constructor(x, y, type = 'lymphnode') {
        this.x = x; this.y = y;
        this.type = type;       // 'lymphnode' | 'bonemarrow'
        this.radius = type === 'bonemarrow' ? 90 : 65;
        this.health = type === 'bonemarrow' ? 2000 : 1000;
        this.maxHealth = this.health;
        this.alive = true;
        this.pulse = Math.random() * Math.PI * 2;
        this.spawnTimer = 0;
        this.spawnInterval = type === 'bonemarrow' ? 240 : 400; // Knochenmark schneller
        this.memoryCells = [];   // {targetType, bonus} — Gedächtnis nach Erstkontakt
        this.sector = { x, y, radius: type === 'bonemarrow' ? 3000 : 2000 };
        this.alertLevel = 0;     // 0..1: wie aktiv das Immunsystem hier ist
        this.alertDecay = 0.0003;
        this.detectedBacteria = new Set();
    }

    update(unitCtx) {
        if (!this.alive) return;
        this.pulse += 0.02;

        // Bakterien im Sektor detektieren → Alert erhöhen
        const allB = [...(unitCtx.units || [])];
        if (unitCtx.player) allB.push(unitCtx.player);
        let detected = 0;
        for (const b of allB) {
            if (!b) continue;
            const d = Math.hypot(b.x - this.x, b.y - this.y);
            if (d < this.sector.radius) { detected++; }
        }
        if (detected > 0) {
            this.alertLevel = Math.min(1, this.alertLevel + detected * 0.0005);
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - this.alertDecay);
        }

        // Mini-Scouts melden bekannte Bedrohungen → Gedächtnis
        for (const [id, data] of (unitCtx.knownThreats || new Map())) {
            if (!this.memoryCells.find(m => m.id === id)) {
                this.memoryCells.push({ id, bonus: 1.5 });
            }
        }

        // Einheiten spawnen
        this.spawnTimer++;
        const interval = this.spawnInterval * Math.max(0.3, 1 - this.alertLevel * 0.6);
        if (this.spawnTimer >= interval && detected > 0) {
            this.spawnTimer = 0;
            this._spawnUnit(unitCtx);
        }
    }

    _spawnUnit(unitCtx) {
        const angle = Math.random() * Math.PI * 2;
        const sx = this.x + Math.cos(angle) * (this.radius + 20);
        const sy = this.y + Math.sin(angle) * (this.radius + 20);
        const memBonus = this.memoryCells.length > 0 ? 1.5 : 1;

        let cell;
        if (this.type === 'bonemarrow' || Math.random() < 0.35) {
            cell = new Neutrophil(sx, sy, this);
            cell.speed *= memBonus;
        } else {
            cell = new Macrophage(sx, sy, this);
            cell.speed *= memBonus;
            cell.health *= memBonus;
            cell.maxHealth = cell.health;
        }
        unitCtx.immuneCells.push(cell);
        ComplementSystem.activate(0.05 * this.alertLevel);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) { this.health = 0; this.alive = false; }
    }

    draw(ctx) {
        ctx.save();
        const pr = this.radius + Math.sin(this.pulse) * (this.alive ? 4 : 0);
        const alertColor = `rgba(255,${Math.floor(100 - this.alertLevel * 100)},${Math.floor(100 - this.alertLevel * 100)},`;

        // Sektor-Radius (Einflussbereich)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.sector.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,50,50,${0.04 + this.alertLevel * 0.06})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([12, 18]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Outer Glow
        for (let i = 3; i >= 1; i--) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, pr + i * 10, 0, Math.PI * 2);
            ctx.strokeStyle = alertColor + (0.03 + this.alertLevel * 0.04 * i) + ')';
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // Körper
        const g = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, pr);
        if (this.type === 'bonemarrow') {
            g.addColorStop(0, '#ffccaa'); g.addColorStop(0.5, '#cc3333'); g.addColorStop(1, '#440000');
        } else {
            g.addColorStop(0, '#ffaacc'); g.addColorStop(0.5, '#aa2255'); g.addColorStop(1, '#330011');
        }
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff2244';
        ctx.beginPath(); ctx.arc(this.x, this.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.shadowBlur = 0;

        // Rand
        ctx.strokeStyle = this.alertLevel > 0.5 ? '#ff4444' : '#aa2244';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, pr, 0, Math.PI * 2); ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255,200,200,0.85)';
        ctx.font = 'bold 11px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.type === 'bonemarrow' ? 'KNOCHENMARK' : 'LYMPHKNOTEN', this.x, this.y + pr + 16);

        // Alert-Indikator
        if (this.alertLevel > 0.1) {
            ctx.fillStyle = `rgba(255,50,50,${this.alertLevel * 0.9})`;
            ctx.font = 'bold 10px monospace';
            ctx.fillText('⚠ ALERT ' + Math.round(this.alertLevel * 100) + '%', this.x, this.y - pr - 8);
        }

        // Gedächtnis-Zellen anzeigen
        if (this.memoryCells.length > 0) {
            ctx.fillStyle = 'rgba(255,150,150,0.6)';
            ctx.font = '9px monospace';
            ctx.fillText('MEM:' + this.memoryCells.length, this.x, this.y + 6);
        }

        // HP
        const hp = this.health / this.maxHealth;
        const bw = pr * 2;
        ctx.fillStyle = '#300'; ctx.fillRect(this.x - pr, this.y + pr + 4, bw, 5);
        ctx.fillStyle = hp > 0.5 ? '#ff2244' : hp > 0.25 ? '#ff8800' : '#ffff00';
        ctx.fillRect(this.x - pr, this.y + pr + 4, bw * hp, 5);

        ctx.restore();
    }
}

// ---- Speed-Multiplier im Gefäß ----
function getSpeedMult(x, y, vessels) {
    for (const v of vessels) {
        if (v.containsPoint(x, y)) return v.speedMult;
    }
    return 1;
}

// ---- Minimap ----
const MINIMAP_SIZE = 180;
const mmCanvas = document.getElementById('minimapCanvas');
mmCanvas.width  = MINIMAP_SIZE;
mmCanvas.height = MINIMAP_SIZE;
const mmCtx = mmCanvas.getContext('2d');

function drawMinimap(player, base, scouts, vessels, cam) {
    const sx = MINIMAP_SIZE / WORLD_WIDTH;
    const sy = MINIMAP_SIZE / WORLD_HEIGHT;

    mmCtx.fillStyle = '#050a10';
    mmCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Gefäße
    for (const v of vessels) {
        const col = { artery:'rgba(180,30,30,0.6)', vein:'rgba(30,30,180,0.5)', capillary:'rgba(120,20,60,0.3)' };
        mmCtx.strokeStyle = col[v.type];
        mmCtx.lineWidth = Math.max(0.5, v.width * sx * 0.5);
        mmCtx.beginPath();
        mmCtx.moveTo(v.x1 * sx, v.y1 * sy);
        mmCtx.lineTo(v.x2 * sx, v.y2 * sy);
        mmCtx.stroke();
    }

    // Basis
    mmCtx.shadowBlur = 6; mmCtx.shadowColor = '#00ff66';
    mmCtx.fillStyle = '#00ff66';
    mmCtx.beginPath(); mmCtx.arc(base.x * sx, base.y * sy, 5, 0, Math.PI * 2); mmCtx.fill();
    mmCtx.shadowBlur = 0;

    // Scouts
    mmCtx.fillStyle = '#00aa44';
    for (const s of scouts) {
        mmCtx.fillRect(s.x * sx - 1, s.y * sy - 1, 2, 2);
    }

    // Spieler
    mmCtx.shadowBlur = 4; mmCtx.shadowColor = '#ffffff';
    mmCtx.fillStyle = '#ffffff';
    mmCtx.beginPath(); mmCtx.arc(player.x * sx, player.y * sy, 3, 0, Math.PI * 2); mmCtx.fill();
    mmCtx.shadowBlur = 0;

    // Viewport-Rahmen
    const vpW = (canvas.width  / cam.zoom) * sx;
    const vpH = (canvas.height / cam.zoom) * sy;
    mmCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    mmCtx.lineWidth = 1;
    mmCtx.strokeRect(cam.x * sx, cam.y * sy, vpW, vpH);
}

// ---- Hintergrund ----
function drawBackground(ctx, cam) {
    const viewX = cam.x, viewY = cam.y;
    const viewW = canvas.width  / cam.zoom;
    const viewH = canvas.height / cam.zoom;

    ctx.fillStyle = '#04060c';
    ctx.fillRect(viewX, viewY, viewW, viewH);

    // Fein-Raster: interzelluläres Fluid
    const gs = 250;
    ctx.strokeStyle = 'rgba(15,35,22,0.35)';
    ctx.lineWidth = 0.5;
    const x0 = Math.floor(viewX / gs) * gs;
    const y0 = Math.floor(viewY / gs) * gs;
    for (let x = x0; x < viewX + viewW + gs; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, viewY); ctx.lineTo(x, viewY + viewH); ctx.stroke();
    }
    for (let y = y0; y < viewY + viewH + gs; y += gs) {
        ctx.beginPath(); ctx.moveTo(viewX, y); ctx.lineTo(viewX + viewW, y); ctx.stroke();
    }
}

// ---- Infektion: Kollision Spieler <-> Zelle ----
function checkInfections(player, cells, base) {
    for (const cell of cells) {
        if (cell.isBursting) {
            // Ressourcen ins Lager
            Object.entries(cell.resourceYield).forEach(([r, a]) => base.addResource(r, a));
            cell.health = 0;
            cell.alive = false;
            continue;
        }
        if (!cell.isInfected) {
            const d = Math.hypot(player.x - cell.x, player.y - cell.y);
            if (d < player.radius + cell.radius) {
                cell.infect();
            }
        }
    }
}

// ---- HUD ----
function updateHUD(base, scouts, immuneActive) {
    document.getElementById('ui-mass').textContent   = scouts.length + 1;
    document.getElementById('ui-glucose').textContent = Math.floor(base.resources.glucose);
    document.getElementById('ui-amino').textContent   = Math.floor(base.resources.amino);
    document.getElementById('ui-lipid').textContent   = Math.floor(base.resources.lipid);
    document.getElementById('ui-iron').textContent    = Math.floor(base.resources.iron);

    const el = document.getElementById('immune-status');
    if (immuneActive) {
        el.textContent = 'AKTIV ⚠';
        el.style.color = '#ff4444';
    } else {
        el.textContent = 'RUHEND';
        el.style.color = '#44ff88';
    }

    const scoutBtn = document.getElementById('btn-scout');
    const canMake  = base.canAfford(base.scaledScoutCost());
    scoutBtn.classList.toggle('disabled', !canMake);
    scoutBtn.disabled = !canMake;

    // Komplement-HUD
    const c3bEl = document.getElementById('ui-c3b');
    const macEl = document.getElementById('ui-mac');
    const c5aFill = document.getElementById('ui-c5a-fill');
    if (c3bEl) c3bEl.textContent = ComplementSystem.c3bMarkers.length;
    if (macEl) macEl.textContent = ComplementSystem.macAttacks.length;
    if (c5aFill) c5aFill.style.width = Math.round(ComplementSystem.c5aConcentration * 100) + '%';

    const baseInd = document.getElementById('base-indicator');
    baseInd.classList.toggle('visible', player.inBase);

    // Blutbahn-Anzeigen
    const inVessel = !!player.lockedVessel;
    document.getElementById('vessel-hint').classList.toggle('visible', inVessel && player.exitProgress < 0.05);
    const exitInd = document.getElementById('vessel-exit-indicator');
    exitInd.classList.toggle('visible', inVessel && player.exitProgress > 0.05);
    if (inVessel) {
        exitInd.querySelector('.vei-fill').style.width = Math.round(player.exitProgress * 100) + '%';
    }
}

// ============================================================
// MAIN
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const camera = new Camera(window.innerWidth, window.innerHeight);

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';
    camera.setSize(canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Welt generieren
const bloodVessels  = generateBloodVessels();
const hostCells     = generateHostCells(600);
const resourceNodes = generateResourceNodes();

// Entitäten
const spawnX = WORLD_WIDTH  * 0.5;
const spawnY = WORLD_HEIGHT * 0.5;
const base   = new Base(spawnX, spawnY);
const player = new PlayerBacterium(spawnX + 120, spawnY + 40);
const units  = [];

// 6 Start-Scouts spawnen
for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const s = new ScoutBacterium(
        spawnX + Math.cos(angle) * (base.radius + 40),
        spawnY + Math.sin(angle) * (base.radius + 40),
        base
    );
    units.push(s);
}                 // alle Kolonie-Bakterien (Scout, Mini, Worker, Fighter, Builder)

// ---- Immunbasen generieren (Block D) ----
const immuneBases = [];
const immuneCells = [];
const knownThreats = new Map();

(function generateImmuneBases() {
    // 3 Lymphknoten + 1 Knochenmark, weit vom Spawn entfernt
    const positions = [
        { x: spawnX - 4000, y: spawnY - 3000, type: 'lymphnode' },
        { x: spawnX + 4500, y: spawnY + 2500, type: 'lymphnode' },
        { x: spawnX + 1000, y: spawnY - 5000, type: 'lymphnode' },
        { x: spawnX - 3500, y: spawnY + 4500, type: 'bonemarrow' },
    ];
    for (const p of positions) {
        const bx = Math.max(500, Math.min(WORLD_WIDTH  - 500, p.x));
        const by = Math.max(500, Math.min(WORLD_HEIGHT - 500, p.y));
        immuneBases.push(new ImmuneBase(bx, by, p.type));
    }
})();

// Smart Auto-Attack: ein Kaempfer ruft Verstaerkung
function requestReinforcement(target, caller) {
    let called = 0;
    for (const u of units) {
        if (called >= 4) break;
        if (u.type === 'fighter' && u !== caller && (!u.target || u.target.health <= 0)) {
            u.target = target;
            u.state = 'chase';
            called++;
        }
    }
}

// Kamera initial zentrieren
camera.x = player.x - canvas.width  / 2;
camera.y = player.y - canvas.height / 2;

// Immunsystem-Timer
const IMMUNE_DELAY = 45 * 1000;
let gameStartTime  = Date.now();
let immuneActive   = false;
let ttRefreshAccumulator = 0;

// ---- Block C: Basis-Alarm + Defense-Recall ----
const BaseDefense = {
    alertActive: false,
    alertTimer: 0,
    recallActive: false,

    checkBaseUnderAttack(base, immuneCells) {
        let threat = false;
        for (const c of immuneCells) {
            if (!c.alive) continue;
            if (Math.hypot(c.x - base.x, c.y - base.y) < base.radius + 250) {
                threat = true; break;
            }
        }
        if (threat) {
            this.alertTimer = 180;
            if (!this.alertActive) {
                this.alertActive = true;
                this._triggerDefense();
            }
        } else {
            if (this.alertTimer > 0) this.alertTimer--;
            else this.alertActive = false;
        }
    },

    _triggerDefense() {
        for (const u of units) {
            if (u.type === 'fighter') { u.state = 'defend'; u.target = null; }
        }
    },

    recallAll() {
        for (const u of units) {
            if (u.type === 'fighter' || u.type === 'scout') {
                u.state = 'defend'; u.target = null;
            }
        }
        this.recallActive = true;
        setTimeout(() => { this.recallActive = false; }, 10000);
    },

    updateHUD() {
        const el = document.getElementById('defense-alert');
        if (el) el.classList.toggle('visible', this.alertActive);
        const btn = document.getElementById('btn-recall');
        if (btn) btn.classList.toggle('active', this.recallActive);
    }
};

// Wenn eine Forschung fertig wird -> UI neu zeichnen
onResearchComplete = (b) => {
    if (document.getElementById('techtree-overlay').classList.contains('open')) renderTechTree(b);
};

// Input
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

// Zoom zentriert auf Spieler
window.addEventListener('wheel', e => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom  = Math.max(0.15, Math.min(3.5, camera.zoom * factor));
    camera.x = player.x - (canvas.width  / 2) / camera.zoom;
    camera.y = player.y - (canvas.height / 2) / camera.zoom;
}, { passive: true });

// Scout per Button (keine Hotkeys — alles ueber Menues)
document.getElementById('btn-scout').addEventListener('click', spawnScout);

// Block C: Alle zurückrufen
document.getElementById('btn-recall').addEventListener('click', () => BaseDefense.recallAll());

// Produktions-Menue
document.getElementById('btn-production').addEventListener('click', () => openProduction(base, units));
document.getElementById('btn-close-production').addEventListener('click', closeProduction);
document.getElementById('production-overlay').addEventListener('click', e => {
    if (e.target.id === 'production-overlay') closeProduction();
});

// Fokusbaum
document.getElementById('btn-techtree').addEventListener('click', () => openTechTree(base));
document.getElementById('btn-close-techtree').addEventListener('click', closeTechTree);
document.getElementById('techtree-overlay').addEventListener('click', e => {
    if (e.target.id === 'techtree-overlay') closeTechTree();
});

function spawnScout() {
    const s = base.produceScout();
    if (s) units.push(s);
}

function spawnUnit(type) {
    const u = base.produce(type);
    if (u) units.push(u);
}

// ---- Main Loop ----
function mainLoop() {
    // --- Update ---
    const now = Date.now();
    immuneActive = (now - gameStartTime) >= IMMUNE_DELAY;

    base.update();
    Research.update(base);
    if (document.getElementById('techtree-overlay').classList.contains('open')) {
        ttRefreshAccumulator++;
        if (ttRefreshAccumulator >= 10) { renderTechTree(base); ttRefreshAccumulator = 0; }
    }

    ProductionManager.update(base, units);
    BuffField.recompute(base, units);

    // Einheiten-Context (Player-Referenz für Phagozyte/MAC-Targeting)
    const unitCtx = {
        resourceNodes, base, units, immuneBases, immuneCells,
        buffField: BuffField, knownThreats, player
    };

    player.update(keys, base, bloodVessels, unitCtx);

    for (const u of units) {
        let sp = (u.baseSpeed || 4) * getSpeedMult(u.x, u.y, bloodVessels);
        if (BuffField.contains(u)) {
            sp *= BuffField.speedBonus;
            if (u.health !== undefined && u.maxHealth) u.health = Math.min(u.maxHealth, u.health + BuffField.healthRegen);
        }
        u.speed = sp;
        u.update(unitCtx);
    }

    // ---- Block D: Immunbasen + Immunzellen ----
    for (const ib of immuneBases) {
        if (ib.alive) ib.update(unitCtx);
        // Fighter die eine ImmunBasis angreifen
        for (const u of units) {
            if (u.type === 'fighter' && u.state === 'attack' && u.target === ib) {
                ib.takeDamage(0.5);
            }
        }
    }
    // Immunzellen updaten
    for (const ic of immuneCells) {
        if (ic.alive) ic.update(unitCtx);
        // Schaden an Basis-Gebäude
        if (ic.alive && ic.state === 'phagocytizing') {
            const db = Math.hypot(ic.x - base.x, ic.y - base.y);
            if (db < base.radius + ic.radius) base.health = Math.max(0, base.health - 0.15);
        }
    }
    // Tote Immunzellen entfernen
    const aliveIC = immuneCells.filter(ic => ic.alive);
    if (aliveIC.length < immuneCells.length) { immuneCells.length = 0; immuneCells.push(...aliveIC); }

    // ---- Block E: Komplement-System ----
    ComplementSystem.update(unitCtx);

    // ---- Block C: Basis-Alarm ----
    BaseDefense.checkBaseUnderAttack(base, immuneCells);
    BaseDefense.updateHUD();

    for (const n of resourceNodes) n.update();

    for (const c of hostCells) c.update();
    checkInfections(player, hostCells, base);
    const aliveCells = hostCells.filter(c => c.alive !== false);
    if (aliveCells.length < hostCells.length) { hostCells.length = 0; hostCells.push(...aliveCells); }

    camera.follow(player);
    updateHUD(base, units, immuneActive);

    // --- Render ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    camera.apply(ctx);

    drawBackground(ctx, camera);

    const vx = camera.x, vy = camera.y;
    const vw = canvas.width / camera.zoom, vh = canvas.height / camera.zoom;

    for (const v of bloodVessels) {
        if (v.isVisible(camera, canvas.width, canvas.height)) v.draw(ctx);
    }

    // Komplement-Proteine (hinter Entities)
    ComplementSystem.draw(ctx);

    for (const n of resourceNodes) {
        if (n.x > vx - 50 && n.x < vx + vw + 50 && n.y > vy - 50 && n.y < vy + vh + 50) n.draw(ctx);
    }
    for (const c of hostCells) {
        if (c.x > vx - 40 && c.x < vx + vw + 40 && c.y > vy - 40 && c.y < vy + vh + 40) c.draw(ctx);
    }

    // Immunbasen
    for (const ib of immuneBases) {
        if (ib.x > vx - 200 && ib.x < vx + vw + 200 && ib.y > vy - 200 && ib.y < vy + vh + 200) ib.draw(ctx);
    }
    // Immunzellen
    for (const ic of immuneCells) {
        if (!ic.alive) continue;
        if (ic.x > vx - 60 && ic.x < vx + vw + 60 && ic.y > vy - 60 && ic.y < vy + vh + 60) ic.draw(ctx);
    }

    BuffField.draw(ctx);
    base.draw(ctx);
    for (const u of units) {
        if (u.x > vx - 40 && u.x < vx + vw + 40 && u.y > vy - 40 && u.y < vy + vh + 40) u.draw(ctx);
    }
    player.draw(ctx);

    camera.restore(ctx);

    drawMinimap(player, base, units, bloodVessels, camera);

    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);

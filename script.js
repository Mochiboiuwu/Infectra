const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const infoDisplay = document.getElementById('info-display');
const statusText = document.getElementById('status-text');
const pointsDisplay = document.getElementById('points-display');
const scoutDisplay = document.getElementById('squad-display');
const baseInfo = document.getElementById('base-info');
const baseHealthDisplay = document.getElementById('base-health');
const baseProductionDisplay = document.getElementById('base-production');
const infectButton = document.getElementById('infect-button');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
const baseControlUI = document.getElementById('base-control-ui');
const passiveBtn = document.getElementById('passive-btn');
const defendBtn = document.getElementById('defend-btn');
const aggressiveBtn = document.getElementById('aggressive-btn');
const openTechTreeBtn = document.getElementById('open-tech-tree-btn');
const openControlsBtn = document.getElementById('open-controls-btn');
const createScoutBtn = document.getElementById('create-fighter-btn');

const techTreeOverlay = document.getElementById('tech-tree-overlay');
const techTreeTabs = document.querySelector('.tabs');
const closeTechTreeBtn = document.getElementById('close-tech-tree-btn');
const baseUpgradesContainer = document.getElementById('base-upgrades-container');
const workerUpgradesContainer = document.getElementById('worker-upgrades-container');
const scoutUpgradesContainer = document.getElementById('fighter-upgrades-container');
const baseLevelDisplay = document.getElementById('base-level-display');
const workerLevelDisplay = document.getElementById('worker-level-display');
const scoutLevelDisplay = document.getElementById('fighter-level-display');
const upgradeBaseLevelBtn = document.getElementById('upgrade-base-level-btn');
const upgradeWorkerLevelBtn = document.getElementById('upgrade-worker-level-btn');
const upgradeScoutLevelBtn = document.getElementById('upgrade-fighter-level-btn');

const controlsOverlay = document.getElementById('controls-overlay');
const closeControlsBtn = document.getElementById('close-controls-btn');

const WORLD_WIDTH = 15000;
const WORLD_HEIGHT = 15000;
const MINIMAP_SIZE = 200;
const SCALE_X = MINIMAP_SIZE / WORLD_WIDTH;
const SCALE_Y = MINIMAP_SIZE / WORLD_HEIGHT;

let gameRunning = false;
let points = 0;
let alarmActive = false;
let gameStartTime = Date.now();
const IMMUNE_SYSTEM_ACTIVATION_TIME = 30 * 1000;
const DIRECT_ATTACK_TIME = 50 * 1000;

let PLAYER_BASE_SPEED = 5;
const BLOOD_VESSEL_SPEED_MULTIPLIER = 2.5;
const playerDecayRate = 10;

let player = null;

let scoutBacteria = [];

let bloodVessels = [];
const BLOOD_VESSEL_WIDTH = 40;
const BLOOD_VESSEL_EXIT_GAP = 100;
const BLOOD_VESSEL_ENTRY_POINT_SIZE = 20;

let cells = [];
let deadCells = [];
let cellClusters = [];

let baseBacteria = [];
let baseBacteriaBehavior = 'passive';

let base = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

let lastProductionTime = Date.now();
let lastDecayTime = Date.now();

let baseLevel = 1;
let workerLevel = 1;
let scoutLevel = 1;

let baseProductionInterval = 5000;
let baseInfectionRange = 500;
let scoutInfectionRange = 1500;
let baseWorkerLimit = 5;
let workerDecayRate = 10;
let scoutDamageMultiplier = 1;
let scoutHealthMultiplier = 1;
let scoutSquadLimit = 20;
const SCOUT_PATROL_RADIUS = 1500;
const SCOUT_INFECTION_TIME = 10000;

let c3bProteins = [];
const C3B_SPAWN_COUNT = 150;
const C3B_SLOW_SPEED = 0.2;
const C3B_VERMEHRUNG_COUNT = 100;
const C3B_SWARM_RADIUS = 150;
const C3B_WILD_MOVEMENT_RADIUS = 100;
const C3B_ATTACHMENT_RATE = 0.05;
const C3B_SLOWDOWN_FACTOR = 0.99;
const C3B_WILD_SPEED = 2;
let c3bTarget = null;
let isMarked = false;

// Neue Konstanten für Phagozyten und Makrophagen
const PHAGOCYTE_COUNT = 10;
const PHAGOCYTE_HEALTH = 1500;
const PHAGOCYTE_SPEED = 0.3; // Verringerte Geschwindigkeit
const PHAGOCYTE_SIZE = 60;
const PHAGOCYTE_COOLDOWN = 10;
const PHAGOCYTE_KILL_TIME = 10; // Verdauungszeit in Sekunden
const PHAGOCYTE_ATTACK_RADIUS = 400; // Radius, in dem ein Phagozyt als Bedrohung gilt
const MACROPHAGE_COUNT = 5;
const MACROPHAGE_SPEED = 0.5;
const MACROPHAGE_ATTACK_SPEED = 2.5; // Neue Konstante
const MACROPHAGE_SIZE = 80;
const MACROPHAGE_DETECTION_RADIUS = 100; // Neuer kleiner Radius
const MACROPHAGE_KILL_TIME = 4; // Neue Konstante in Sekunden
const MACROPHAGE_RETURN_RADIUS = 400; // Neuer Radius für die Rückkehr

let phagocytes = [];
let macrophages = [];

// Neue Konstanten für C5a-Proteine
const C5A_SPEED = 5;
const C5A_SIZE = 3;
let c5aProteins = [];

// NEU: Konstanten und Arrays für MAC-Bildung
const MAC_PROTEIN_COUNT = 5; // C5b, C6, C7, C8, C9
const MAC_DAMAGE_PER_SEC = 2;
let macProteins = [];

const ATTACK_RANGE = 20;
const ATTACHMENT_RANGE = 10;

const techTree = {
    base: [
        { name: 'Basis-Kapazität', cost: 200, level: 1, effects: { workerLimit: 7 }, bought: false, type: 'upgrade' },
        { name: 'Reichweiten-Erweiterung', cost: 300, level: 1, effects: { range: 1000 }, bought: false, type: 'upgrade' },
        { name: 'Level Up', cost: 500, level: 1, type: 'level-up' },
        { name: 'Zellulare Verstärkung', cost: 800, level: 2, effects: { health: 1.25 }, bought: false, type: 'upgrade' },
        { name: 'Produktionsrate', cost: 1500, level: 2, effects: { production: 2500 }, bought: false, type: 'upgrade' },
        { name: 'Level Up', cost: 2000, level: 2, type: 'level-up' }
    ],
    worker: [
        { name: 'Schneller Abbau', cost: 300, level: 1, effects: { decayRate: 15 }, bought: false, type: 'upgrade' },
        { name: 'Robuste Hülle', cost: 400, level: 1, effects: { health: 1.5 }, bought: false, type: 'upgrade' },
        { name: 'Level Up', cost: 500, level: 1, type: 'level-up' },
        { name: 'Fokus-Upgrade', cost: 1000, level: 2, effects: { points: 1.2 }, bought: false, type: 'upgrade' },
        { name: 'Verbesserte Fortbewegung', cost: 1500, level: 2, effects: { speed: 1.2 }, bought: false, type: 'upgrade' },
        { name: 'Level Up', cost: 2000, level: 2, type: 'level-up' }
    ],
    scout: [
        { name: 'Scout-Stärke', cost: 1200, level: 1, effects: { damage: 1.25, health: 1.25 }, bought: false, type: 'upgrade' },
        { name: 'Squad-Nachschub', cost: 1500, level: 1, effects: { limit: 5 }, bought: false, type: 'upgrade' },
        { name: 'Level Up', cost: 2000, level: 1, type: 'level-up' },
        { name: 'Aggressive-Gene', cost: 2500, level: 2, effects: { speed: 1.5 }, bought: false, type: 'upgrade' },
        { name: 'Doppel-Klone', cost: 3000, level: 2, effects: { limit: 5 }, bought: false, type: 'upgrade' },
        { name: 'Level Up', cost: 5000, level: 2, type: 'level-up' }
    ]
};

function generateBloodVessels() {
    bloodVessels = [];
    const numVessels = 70;
    const startPoint = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    let endPoints = [startPoint];

    for (let i = 0; i < numVessels; i++) {
        let start;
        if (i % 4 === 0) {
            start = { x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT };
        } else {
            start = endPoints[Math.floor(Math.random() * endPoints.length)];
        }

        let end = { x: start.x + (Math.random() - 0.5) * 2500, y: start.y + (Math.random() - 0.5) * 2500 };

        let path = [start];
        let currentPoint = { x: start.x, y: start.y };
        for (let j = 0; j < 10; j++) {
            currentPoint = {
                x: currentPoint.x + (end.x - currentPoint.x) * 0.1 + (Math.random() - 0.5) * 200,
                y: currentPoint.y + (end.y - currentPoint.y) * 0.1 + (Math.random() - 0.5) * 200
            };
            path.push(currentPoint);
        }
        path.push(end);
        endPoints.push(end);

        let exitIndex = Math.floor(Math.random() * (path.length - 2)) + 1;

        bloodVessels.push({
            path: path,
            exitPoint: path[exitIndex]
        });
    }
}

function generateCells() {
    cells = [];
    cellClusters = [];
    const numCellsToGenerate = 1500;
    const numClusters = 10;
    const clusterRadius = 800;
    const clusterHotspots = [];

    for (let i = 0; i < numClusters; i++) {
        clusterHotspots.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT
        });
        cellClusters.push({
            x: clusterHotspots[i].x,
            y: clusterHotspots[i].y,
            radius: clusterRadius,
        });
    }

    for (let i = 0; i < numCellsToGenerate; i++) {
        let newCell;
        let isValidPosition = false;

        while (!isValidPosition) {
            let x, y;

            if (Math.random() < 0.7) {
                const hotspot = clusterHotspots[Math.floor(Math.random() * numClusters)];
                x = hotspot.x + (Math.random() - 0.5) * clusterRadius * 2;
                y = hotspot.y + (Math.random() - 0.5) * clusterRadius * 2;
            } else {
                x = Math.random() * WORLD_WIDTH;
                y = Math.random() * WORLD_HEIGHT;
            }

            newCell = {
                x: x,
                y: y,
                size: 40,
                health: 10000,
                isBase: false,
                isBeingInfected: false,
                isBeingHarvested: false,
                decayRate: 10,
                scout: null,
                worker: null,
                isBeingHealed: false,
            };

            isValidPosition = true;
            for (const vessel of bloodVessels) {
                for (let j = 0; j < vessel.path.length - 1; j++) {
                    const p1 = vessel.path[j];
                    const p2 = vessel.path[j + 1];
                    const distance = pointToLineSegmentDistance(newCell, p1, p2);
                    if (distance < newCell.size + BLOOD_VESSEL_WIDTH / 2) {
                        isValidPosition = false;
                        break;
                    }
                }
                if (!isValidPosition) break;
            }
        }
        cells.push(newCell);
    }
}

function generateC3bProteins() {
    c3bProteins = [];
    for (let i = 0; i < C3B_SPAWN_COUNT; i++) {
        let x, y, inVessel = false;

        if (Math.random() < 0.5) {
            const randomVessel = bloodVessels[Math.floor(Math.random() * bloodVessels.length)];
            const randomPoint = randomVessel.path[Math.floor(Math.random() * randomVessel.path.length)];
            x = randomPoint.x + (Math.random() - 0.5) * (BLOOD_VESSEL_WIDTH - 5);
            y = randomPoint.y + (Math.random() - 0.5) * (BLOOD_VESSEL_WIDTH - 5);
            inVessel = true;
        } else {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() * WORLD_HEIGHT;
            let isValid = false;
            while (!isValid) {
                isValid = true;
                for (const vessel of bloodVessels) {
                    for (let j = 0; j < vessel.path.length - 1; j++) {
                        const p1 = vessel.path[j];
                        const p2 = vessel.path[j + 1];
                        const dist = pointToLineSegmentDistance({ x, y }, p1, p2);
                        if (dist < BLOOD_VESSEL_WIDTH / 2 + 50) {
                            isValid = false;
                            break;
                        }
                    }
                    if (!isValid) break;
                }
                if (!isValid) {
                    x = Math.random() * WORLD_WIDTH;
                    y = Math.random() * WORLD_HEIGHT;
                }
            }
        }

        c3bProteins.push({
            x: x,
            y: y,
            size: 2,
            isC3b: true,
            active: false,
            target: null,
            inVessel: inVessel,
            localTargetX: null,
            localTargetY: null,
            vesselPath: inVessel ? bloodVessels[Math.floor(Math.random() * bloodVessels.length)] : null,
            pathIndex: 0,
            pathDirection: 1,
        });
    }
}

function generatePhagocytes() {
    phagocytes = [];
    for (let i = 0; i < PHAGOCYTE_COUNT; i++) {
        let x, y;
        let foundPosition = false;
        while (!foundPosition) {
            const randomVessel = bloodVessels[Math.floor(Math.random() * bloodVessels.length)];
            const randomPoint = randomVessel.path[Math.floor(Math.random() * randomVessel.path.length)];
            x = randomPoint.x + (Math.random() - 0.5) * 200;
            y = randomPoint.y + (Math.random() - 0.5) * 200;

            let isTooCloseToVessel = false;
            for (const vessel of bloodVessels) {
                for (let j = 0; j < vessel.path.length - 1; j++) {
                    const p1 = vessel.path[j];
                    const p2 = vessel.path[j + 1];
                    if (pointToLineSegmentDistance({ x, y }, p1, p2) < PHAGOCYTE_SIZE + BLOOD_VESSEL_WIDTH / 2) {
                        isTooCloseToVessel = true;
                        break;
                    }
                }
                if (isTooCloseToVessel) break;
            }

            if (!isTooCloseToVessel) {
                foundPosition = true;
            }
        }

        phagocytes.push({
            x: x,
            y: y,
            size: PHAGOCYTE_SIZE,
            health: PHAGOCYTE_HEALTH,
            state: 'inactive',
            target: null,
            originalPosition: { x: x, y: y },
            cooldownUntil: 0,
            killTimer: 0,
            damage: 100 / PHAGOCYTE_KILL_TIME,
        });
    }
}

function generateMacrophages() {
    macrophages = [];
    for (let i = 0; i < MACROPHAGE_COUNT; i++) {
        const cluster = cellClusters[Math.floor(Math.random() * cellClusters.length)];
        macrophages.push({
            x: cluster.x + (Math.random() - 0.5) * cluster.radius * 2,
            y: cluster.y + (Math.random() - 0.5) * cluster.radius * 2,
            size: MACROPHAGE_SIZE,
            state: 'patrol',
            patrolTarget: null,
            activeTarget: null,
            healingTarget: null,
            healingStartTime: null,
            killTimer: null,
        });
    }
}

function pointToLineSegmentDistance(point, start, end) {
    const l2 = Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2);
    if (l2 === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / l2;
    const projection = {
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y)
    };
    if (t < 0) return Math.hypot(point.x - start.x, point.y - start.y);
    if (t > 1) return Math.hypot(point.x - end.x, point.y - end.y);
    return Math.hypot(point.x - projection.x, point.y - projection.y);
}

// NEUE HILFSFUNKTION FÜR REALISTISCHE FORMEN
function hexToRgb(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// NEUE HILFSFUNKTION FÜR REALISTISCHE FORMEN
function drawAmoebaShape(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const numPoints = 12;
    const time = Date.now() / 1000;
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radius = size + (Math.sin(time + i) * 5) + (Math.random() - 0.5) * 5;
        const pointX = x + Math.cos(angle) * radius;
        const pointY = y + Math.sin(angle) * radius;
        if (i === 0) {
            ctx.moveTo(pointX, pointY);
        } else {
            ctx.lineTo(pointX, pointY);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0; // Schatten zurücksetzen
}

// VERBESSERTE ZEICHENFUNKTION FÜR DEN SPIELER
function drawPlayer() {
    if (!player) return;
    const color = player.inVessel ? '#00ffff' : '#00ff00';
    const size = player.size;
    const pulse = Math.sin(Date.now() / 200) * 2 + 2;
    const outerColor = hexToRgb(color, 0.7);
    const innerColor = hexToRgb(color, 0.9);

    // Glüheffekt
    ctx.shadowBlur = 10;
    ctx.shadowColor = outerColor;

    // Äußere Zellhülle
    ctx.fillStyle = outerColor;
    ctx.beginPath();
    ctx.arc(player.x, player.y, size + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Innerer Kern
    ctx.shadowBlur = 0; // Schatten für Kern entfernen
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(player.x, player.y, size * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Membran
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, size, 0, Math.PI * 2);
    ctx.stroke();

    if (player.snapping) {
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.5 + Math.sin(Date.now() / 100) * 0.5) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (player.marked) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size + 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// VERBESSERTE ZEICHENFUNKTION FÜR BAKTERIEN
function drawBacterium(bacterium, color, isSelected = false) {
    const size = bacterium.size;
    const pulse = Math.sin(Date.now() / 200) * 2 + 2;
    const outerColor = hexToRgb(color, 0.7);
    const innerColor = hexToRgb(color, 0.9);

    // Glüheffekt
    ctx.shadowBlur = 10;
    ctx.shadowColor = outerColor;

    // Äußere Zellhülle
    ctx.fillStyle = outerColor;
    ctx.beginPath();
    ctx.arc(bacterium.x, bacterium.y, size + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Innerer Kern
    ctx.shadowBlur = 0; // Schatten für Kern entfernen
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(bacterium.x, bacterium.y, size * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // Membran
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bacterium.x, bacterium.y, size, 0, Math.PI * 2);
    ctx.stroke();

    if (isSelected) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bacterium.x, bacterium.y, size + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Markierung durch Immunsystem
    if (bacterium.marked) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bacterium.x, bacterium.y, size + 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawMacProteins() {
    macProteins.forEach(protein => {
        if (!protein.target) return;

        const target = protein.target;
        const radius = target.size + 3;
        const angle = protein.angle;

        const x = target.x + Math.cos(angle) * radius;
        const y = target.y + Math.sin(angle) * radius;

        ctx.fillStyle = protein.color;
        ctx.beginPath();
        ctx.arc(x, y, protein.size, 0, Math.PI * 2);
        ctx.fill();
    });
}


// VERBESSERTE ZEICHENFUNKTION FÜR PHAGOZYTEN
function drawPhagocytes() {
    phagocytes.forEach(phagocyte => {
        const color = phagocyte.state === 'angreifend' ? 'rgba(255, 0, 0, 0.7)' : 'rgba(173, 216, 230, 0.7)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        drawAmoebaShape(phagocyte.x, phagocyte.y, phagocyte.size, color);
    });
}

// VERBESSERTE ZEICHENFUNKTION FÜR MAKROPHAGEN
function drawMacrophages() {
    macrophages.forEach(macrophage => {
        const color = macrophage.state === 'angreifend' ? 'rgba(255, 255, 0, 0.7)' : 'rgba(128, 0, 128, 0.7)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        drawAmoebaShape(macrophage.x, macrophage.y, macrophage.size, color);
    });
}

function drawC5aProteins() {
    c5aProteins.forEach(protein => {
        ctx.fillStyle = '#ff6600'; // Orange Farbe
        ctx.beginPath();
        ctx.arc(protein.x, protein.y, protein.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawScoutBacteria() {
    scoutBacteria.forEach(scout => {
        const color = scout.isStationary ? '#808080' : '#800080';
        drawBacterium(scout, color, scout.selected);
    });
}

function drawBaseBacteria() {
    baseBacteria.forEach(bacterium => {
        const color = '#ff9900';
        drawBacterium(bacterium, color);
    });
}

// VERBESSERTE ZEICHENFUNKTION FÜR BLUTGEFÄSSE
function drawBloodVessels() {
    bloodVessels.forEach(vessel => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0000';
        
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = BLOOD_VESSEL_WIDTH;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(vessel.path[0].x, vessel.path[0].y);
        for (let i = 1; i < vessel.path.length; i++) {
            if (vessel.path[i] === vessel.exitPoint) {
                const prev = vessel.path[i - 1];
                const next = vessel.path[i + 1];
                if (prev && next) {
                    const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
                    const gapStart = {
                        x: vessel.path[i].x - Math.cos(angle) * BLOOD_VESSEL_EXIT_GAP / 2,
                        y: vessel.path[i].y - Math.sin(angle) * BLOOD_VESSEL_EXIT_GAP / 2
                    };
                    ctx.lineTo(gapStart.x, gapStart.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.arc(vessel.path[i].x, vessel.path[i].y, BLOOD_VESSEL_ENTRY_POINT_SIZE, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    const gapEnd = {
                        x: vessel.path[i].x + Math.cos(angle) * BLOOD_VESSEL_EXIT_GAP / 2,
                        y: vessel.path[i].y + Math.sin(angle) * BLOOD_VESSEL_EXIT_GAP / 2
                    };
                    ctx.moveTo(gapEnd.x, gapEnd.y);
                }
            } else {
                ctx.lineTo(vessel.path[i].x, vessel.path[i].y);
            }
        }
        ctx.stroke();
    });
    ctx.shadowBlur = 0; // Schatten zurücksetzen
}

function drawCells() {
    cells.forEach(cell => {
        if (cell.isBase) {
            ctx.fillStyle = '#8b0000';
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#660000';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.size + 5, 0, Math.PI * 2);
            ctx.stroke();
        } else if (cell.isBeingHarvested) {
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#4B0000';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.size + 5, 0, Math.PI * 2);
            ctx.stroke();
        } else if (cell.isBeingInfected) {
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.size, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
    deadCells.forEach(cell => {
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, cell.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
            const startX = cell.x - cell.size;
            const startY = cell.y - cell.size + (cell.size * 2 / 20) * i;
            const endX = cell.x + cell.size;
            const endY = cell.y - cell.size + (cell.size * 2 / 20) * i;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
        }
        ctx.stroke();
    });
    if (base) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(base.x, base.y, baseInfectionRange, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawC3bProteins() {
    c3bProteins.forEach(protein => {
        ctx.fillStyle = protein.active ? '#ffff00' : 'rgba(173, 216, 230, 0.8)';
        ctx.beginPath();
        ctx.arc(protein.x, protein.y, protein.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBase() {
    if (base) {
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.arc(base.x, base.y, base.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMinimap() {
    minimapCtx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    minimapCtx.fillStyle = '#0d0d0d';
    minimapCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    bloodVessels.forEach(vessel => {
        minimapCtx.strokeStyle = '#8B0000';
        minimapCtx.lineWidth = 2;
        minimapCtx.beginPath();
        minimapCtx.moveTo(vessel.path[0].x * SCALE_X, vessel.path[0].y * SCALE_Y);
        for (let i = 1; i < vessel.path.length; i++) {
            minimapCtx.lineTo(vessel.path[i].x * SCALE_X, vessel.path[i].y * SCALE_Y);
        }
        minimapCtx.stroke();
    });

    cells.forEach(cell => {
        minimapCtx.fillStyle = '#fff';
        if (cell.isBeingInfected) minimapCtx.fillStyle = '#8B0000';
        if (cell.isBeingHarvested) minimapCtx.fillStyle = '#8B0000';
        minimapCtx.beginPath();
        minimapCtx.arc(cell.x * SCALE_X, cell.y * SCALE_Y, 2, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    deadCells.forEach(cell => {
        minimapCtx.fillStyle = '#111';
        minimapCtx.beginPath();
        minimapCtx.arc(cell.x * SCALE_X, cell.y * SCALE_Y, 2, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    if (base) {
        minimapCtx.fillStyle = '#8b0000';
        minimapCtx.beginPath();
        minimapCtx.arc(base.x * SCALE_X, base.y * SCALE_Y, 4, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    c3bProteins.forEach(protein => {
        minimapCtx.fillStyle = protein.active ? '#ffff00' : 'rgba(173, 216, 230, 0.8)';
        minimapCtx.beginPath();
        minimapCtx.arc(protein.x * SCALE_X, protein.y * SCALE_Y, 1, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    phagocytes.forEach(phagocyte => {
        minimapCtx.fillStyle = 'rgba(173, 216, 230, 0.7)';
        minimapCtx.beginPath();
        minimapCtx.arc(phagocyte.x * SCALE_X, phagocyte.y * SCALE_Y, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    macrophages.forEach(macrophage => {
        minimapCtx.fillStyle = 'rgba(128, 0, 128, 0.7)'; // Lila
        minimapCtx.beginPath();
        minimapCtx.arc(macrophage.x * SCALE_X, macrophage.y * SCALE_Y, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    
    // C5a-Proteine in der Minimap zeichnen
    c5aProteins.forEach(protein => {
        minimapCtx.fillStyle = '#ff6600';
        minimapCtx.beginPath();
        minimapCtx.arc(protein.x * SCALE_X, protein.y * SCALE_Y, 1, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    scoutBacteria.forEach(scout => {
        minimapCtx.fillStyle = '#800080';
        minimapCtx.beginPath();
        minimapCtx.arc(scout.x * SCALE_X, scout.y * SCALE_Y, 2, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    baseBacteria.forEach(bacterium => {
        minimapCtx.fillStyle = '#ff9900';
        minimapCtx.beginPath();
        minimapCtx.arc(bacterium.x * SCALE_X, bacterium.y * SCALE_Y, 2, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    if (player) {
        minimapCtx.fillStyle = '#00ff00';
        minimapCtx.beginPath();
        minimapCtx.arc(player.x * SCALE_X, player.y * SCALE_Y, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }
}

function drawWaypoint() {
    if (!player || !base) return;
    const distanceToBase = Math.hypot(player.x - base.x, player.y - base.y);
    const camViewDistance = Math.hypot(canvas.width / 2, canvas.height / 2);
    if (distanceToBase > camViewDistance) {
        const angle = Math.atan2(base.y - player.y, base.x - player.x);
        const arrowSize = 20;
        const screenMargin = 30;
        const arrowX = canvas.width / 2 + Math.cos(angle) * (canvas.width / 2 - screenMargin);
        const arrowY = canvas.height / 2 + Math.sin(angle) * (canvas.height / 2 - screenMargin);
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 2);
        ctx.lineTo(-arrowSize, arrowSize / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function updateUI() {
    if (!gameRunning) {
        statusText.textContent = 'Spiel pausiert. Finde und infiziere eine Zelle, um zu starten.';
        pointsDisplay.textContent = points.toFixed(0);
        scoutDisplay.textContent = scoutBacteria.length + baseBacteria.length;
        baseInfo.style.display = 'none';
        return;
    }
    statusText.textContent = base ? 'Basis etabliert' : 'Suche nach einem Wirt...';
    pointsDisplay.textContent = points.toFixed(0);
    scoutDisplay.textContent = scoutBacteria.length + baseBacteria.length;
    if (base) {
        baseInfo.style.display = 'block';
        baseHealthDisplay.textContent = base.health.toFixed(0);
        baseProductionDisplay.textContent = `1/${(baseProductionInterval / 1000).toFixed(0)}s`;
        createScoutBtn.disabled = scoutBacteria.length >= scoutSquadLimit || points < 50;
    } else {
        baseInfo.style.display = 'none';
    }
}

function infectCell() {
    if (!player || base) return;
    for (let i = cells.length - 1; i >= 0; i--) {
        const cell = cells[i];
        const distance = Math.hypot(player.x - cell.x, player.y - cell.y);
        if (distance < player.size + cell.size) {
            base = cell;
            base.isBase = true;
            base.isMainBase = true;
            base.health = 100000;
            cells.splice(i, 1);
            statusText.textContent = 'Basis etabliert!';
            generateC3bProteins();
            gameRunning = true;
            break;
        }
    }
}

function produceBacterium() {
    if (base && baseBacteria.length < baseWorkerLimit && Date.now() - lastProductionTime > baseProductionInterval) {
        baseBacteria.push({
            x: base.x,
            y: base.y,
            size: 10,
            speed: 1,
            health: 50,
            targetX: base.x + (Math.random() - 0.5) * 100,
            targetY: base.y + (Math.random() - 0.5) * 100,
            isAttacking: false,
            isHarvesting: false,
            infectionStartTime: null,
            attackTarget: null,
            marked: false,
            passiveTargetX: base.x + (Math.random() - 0.5) * 200,
            passiveTargetY: base.y + (Math.random() - 0.5) * 200,
            macCount: 0,
            macActive: false,
        });
        lastProductionTime = Date.now();
    }
}

function createScout() {
    const cost = 50;
    if (base && points >= cost && scoutBacteria.length < scoutSquadLimit) {
        points -= cost;
        scoutBacteria.push({
            x: base.x,
            y: base.y,
            size: 10,
            speed: 2,
            health: 50 * scoutHealthMultiplier,
            isMainPlayer: false,
            isStationary: false,
            selected: false,
            targetX: base.x,
            targetY: base.y,
            offsetX: (Math.random() - 0.5) * 60,
            offsetY: (Math.random() - 0.5) * 60,
            marked: false,
            isPatrolling: true,
            isInfesting: false,
            infestingTarget: null,
            macCount: 0,
            macActive: false,
        });
    }
}

function updateDecay() {
    const now = Date.now();
    const deltaTime = (now - lastDecayTime) / 1000;
    lastDecayTime = now;
    if (base) {
        const hpLost = 5 * deltaTime;
        base.health -= hpLost;
        points += hpLost * 0.01;
    }
    baseBacteria.forEach(bacterium => {
        if (bacterium.isHarvesting && bacterium.attackTarget) {
            const cell = bacterium.attackTarget;
            const hpLost = workerDecayRate * deltaTime;
            cell.health -= hpLost;
            points += hpLost * 0.05;
            if (cell.health <= 0) {
                if (cell.scout) {
                    cell.scout.isStationary = false;
                    cell.scout.infestingTarget = null;
                    cell.scout.isPatrolling = false;
                    cell.scout.targetX = base.x;
                    cell.scout.targetY = base.y;
                    cell.scout = null;
                }
                const index = cells.findIndex(c => c === cell);
                if (index !== -1) {
                    cells.splice(index, 1);
                    deadCells.push(cell);
                }
                bacterium.isHarvesting = false;
                bacterium.attackTarget = null;
                bacterium.isAttacking = false;
                cell.isBeingHarvested = false;
                cell.worker = null;
            }
        }
    });

    const allUnits = [player, ...scoutBacteria, ...baseBacteria];
    allUnits.forEach(unit => {
        if (unit && unit.macActive) {
            unit.health -= MAC_DAMAGE_PER_SEC * deltaTime;
            if (unit.health <= 0) {
                if (unit.isMainPlayer) {
                    player = null;
                } else if (scoutBacteria.includes(unit)) {
                    const index = scoutBacteria.findIndex(b => b === unit);
                    if (index !== -1) scoutBacteria.splice(index, 1);
                } else if (baseBacteria.includes(unit)) {
                    const index = baseBacteria.findIndex(b => b === unit);
                    if (index !== -1) baseBacteria.splice(index, 1);
                }
                macProteins = macProteins.filter(p => p.target !== unit);
            }
        }
    });
}

function movePlayer() {
    if (!player || player.marked) {
        player.isMovingUp = false;
        player.isMovingDown = false;
        player.isMovingLeft = false;
        player.isMovingRight = false;
        return;
    }
    let dx = 0;
    let dy = 0;
    if (player.isMovingUp) dy -= player.speed;
    if (player.isMovingDown) dy += player.speed;
    if (player.isMovingLeft) dx -= player.speed;
    if (player.isMovingRight) dx += player.speed;
    const newX = player.x + dx;
    const newY = player.y + dy;
    if (player.inVessel) {
        let isNearExit = false;
        for (const vessel of bloodVessels) {
            if (vessel.exitPoint && Math.hypot(player.x - vessel.exitPoint.x, player.y - vessel.exitPoint.y) < BLOOD_VESSEL_EXIT_GAP * 2) {
                isNearExit = true;
                break;
            }
        }
        if (isNearExit) {
            player.x = newX;
            player.y = newY;
            player.speed = PLAYER_BASE_SPEED;
            player.inVessel = false;
        } else {
            let closestProjection = null;
            let minDistance = Infinity;
            for (const vessel of bloodVessels) {
                for (let i = 0; i < vessel.path.length - 1; i++) {
                    const p1 = vessel.path[i];
                    const p2 = vessel.path[i + 1];
                    const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
                    if (l2 === 0) continue;
                    const t = ((player.x - p1.x) * (p2.x - p1.x) + (player.y - p1.y) * (p2.y - p1.y)) / l2;
                    const projection = {
                        x: p1.x + Math.max(0, Math.min(1, t)) * (p2.x - p1.x),
                        y: p1.y + Math.max(0, Math.min(1, t)) * (p2.y - p1.y)
                    };
                    const distToProjection = Math.hypot(player.x - projection.x, player.y - projection.y);
                    if (distToProjection < minDistance) {
                        minDistance = distToProjection;
                        closestProjection = projection;
                    }
                }
            }
            if (closestProjection) {
                const angle = Math.atan2(newY - player.y, newX - player.x);
                player.x = closestProjection.x + Math.cos(angle) * player.speed;
                player.y = closestProjection.y + Math.sin(angle) * player.speed;
                player.speed = PLAYER_BASE_SPEED * BLOOD_VESSEL_SPEED_MULTIPLIER;
            }
        }
    } else {
        let closestVesselProjection = null;
        let minVesselDistance = Infinity;
        for (const vessel of bloodVessels) {
            for (let i = 0; i < vessel.path.length - 1; i++) {
                const p1 = vessel.path[i];
                const p2 = vessel.path[i + 1];
                const dist = pointToLineSegmentDistance({ x: newX, y: newY }, p1, p2);
                if (dist < minVesselDistance) {
                    minVesselDistance = dist;
                    closestVesselProjection = { p1, p2 };
                }
            }
        }
        if (minVesselDistance < BLOOD_VESSEL_WIDTH / 2) {
            player.inVessel = true;
            player.snapping = true;
            setTimeout(() => player.snapping = false, 500);
            const l2 = Math.pow(closestVesselProjection.p2.x - closestVesselProjection.p1.x, 2) + Math.pow(closestVesselProjection.p2.y - closestVesselProjection.p1.y, 2);
            const t = ((newX - closestVesselProjection.p1.x) * (closestVesselProjection.p2.x - closestVesselProjection.p1.x) + (newY - closestVesselProjection.p1.y) * (closestVesselProjection.p2.y - closestVesselProjection.p1.y)) / l2;
            player.x = closestVesselProjection.p1.x + Math.max(0, Math.min(1, t)) * (closestVesselProjection.p2.x - closestVesselProjection.p1.x);
            player.y = closestVesselProjection.p1.y + Math.max(0, Math.min(1, t)) * (closestVesselProjection.p2.y - closestVesselProjection.p1.y);
            player.speed = PLAYER_BASE_SPEED * BLOOD_VESSEL_SPEED_MULTIPLIER;
        } else {
            player.x = newX;
            player.y = newY;
            player.speed = PLAYER_BASE_SPEED;
        }
    }
}

function movePhagocytes() {
    phagocytes.forEach(phagocyte => {
        switch (phagocyte.state) {
            case 'inactive':
                if (Date.now() < phagocyte.cooldownUntil) {
                    break;
                }
                if (!phagocyte.target) {
                    phagocyte.target = {
                        x: phagocyte.x + (Math.random() - 0.5) * 100,
                        y: phagocyte.y + (Math.random() - 0.5) * 100
                    };
                }
                const distToTarget = Math.hypot(phagocyte.x - phagocyte.target.x, phagocyte.y - phagocyte.target.y);
                if (distToTarget < 5) {
                    phagocyte.target = null;
                } else {
                    const angle = Math.atan2(phagocyte.target.y - phagocyte.y, phagocyte.target.x - phagocyte.x);
                    phagocyte.x += Math.cos(angle) * PHAGOCYTE_SPEED;
                    phagocyte.y += Math.sin(angle) * PHAGOCYTE_SPEED;
                }
                break;

            case 'aktiv':
                if (phagocyte.target) {
                    const target = phagocyte.target;
                    const dist = Math.hypot(phagocyte.x - target.x, phagocyte.y - target.y);
                    const angle = Math.atan2(target.y - phagocyte.y, target.x - phagocyte.x);
                    phagocyte.x += Math.cos(angle) * (PHAGOCYTE_SPEED * 2);
                    phagocyte.y += Math.sin(angle) * (PHAGOCYTE_SPEED * 2);

                    if (dist < phagocyte.size - target.size) {
                        phagocyte.state = 'verdauen';
                        phagocyte.killTimer = Date.now();
                    }
                }
                break;

            case 'verdauen':
                if (phagocyte.target) {
                    const target = phagocyte.target;
                    const timeElapsed = (Date.now() - phagocyte.killTimer) / 1000;
                    
                    if (timeElapsed < PHAGOCYTE_KILL_TIME) {
                        const damagePerTick = target.maxHealth / (PHAGOCYTE_KILL_TIME * 60);
                        target.health -= damagePerTick;
                        target.size = Math.max(0, target.originalSize * (target.health / target.maxHealth));
                    } else {
                        phagocyte.state = 'rückkehr';
                        phagocyte.target = null;
                        
                        if (target.isMainPlayer) {
                            player = null; 
                        } else if (scoutBacteria.includes(target)) {
                            const index = scoutBacteria.findIndex(b => b === target);
                            if (index !== -1) {
                                scoutBacteria.splice(index, 1);
                            }
                        } else if (baseBacteria.includes(target)) {
                            const index = baseBacteria.findIndex(b => b === target);
                            if (index !== -1) {
                                baseBacteria.splice(index, 1);
                            }
                        }
                    }
                }
                break;

            case 'rückkehr':
                const distToOrigin = Math.hypot(phagocyte.x - phagocyte.originalPosition.x, phagocyte.y - phagocyte.originalPosition.y);
                if (distToOrigin < 5) {
                    phagocyte.state = 'inactive';
                    phagocyte.cooldownUntil = Date.now() + PHAGOCYTE_COOLDOWN * 1000;
                } else {
                    const angle = Math.atan2(phagocyte.originalPosition.y - phagocyte.y, phagocyte.originalPosition.x - phagocyte.x);
                    phagocyte.x += Math.cos(angle) * (PHAGOCYTE_SPEED * 1.5);
                    phagocyte.y += Math.sin(angle) * (PHAGOCYTE_SPEED * 1.5);
                }
                break;
        }
    });
}

function moveMacrophages() {
    macrophages.forEach(macrophage => {
        const allUnits = [player, ...scoutBacteria, ...baseBacteria].filter(u => u);
        let closestUnit = null;
        let minDistance = Infinity;

        allUnits.forEach(unit => {
            const dist = Math.hypot(macrophage.x - unit.x, macrophage.y - unit.y);
            if (dist < minDistance) {
                minDistance = dist;
                closestUnit = unit;
            }
        });
        
        // NEU: Sofortige Zustandsänderung bei Annäherung
        if (closestUnit && minDistance <= MACROPHAGE_DETECTION_RADIUS && macrophage.state !== 'angreifend') {
            macrophage.activeTarget = closestUnit;
            macrophage.state = 'angreifend';
            macrophage.killTimer = null;
        } else if (macrophage.activeTarget && Math.hypot(macrophage.x - macrophage.activeTarget.x, macrophage.y - macrophage.activeTarget.y) > MACROPHAGE_RETURN_RADIUS) {
            macrophage.activeTarget = null;
            macrophage.state = 'patrol';
            macrophage.killTimer = null;
        }

        switch (macrophage.state) {
            case 'patrol':
                if (macrophage.patrolTarget && Math.hypot(macrophage.x - macrophage.patrolTarget.x, macrophage.y - macrophage.patrolTarget.y) < 10) {
                    macrophage.patrolTarget = null;
                }
                if (!macrophage.patrolTarget) {
                    const cluster = cellClusters[Math.floor(Math.random() * cellClusters.length)];
                    macrophage.patrolTarget = {
                        x: cluster.x + (Math.random() - 0.5) * cluster.radius,
                        y: cluster.y + (Math.random() - 0.5) * cluster.radius,
                    };
                }
                const distToPatrol = Math.hypot(macrophage.x - macrophage.patrolTarget.x, macrophage.y - macrophage.patrolTarget.y);
                if (distToPatrol > 10) {
                    const angle = Math.atan2(macrophage.patrolTarget.y - macrophage.y, macrophage.patrolTarget.x - macrophage.x);
                    macrophage.x += Math.cos(angle) * MACROPHAGE_SPEED;
                    macrophage.y += Math.sin(angle) * MACROPHAGE_SPEED;
                }

                let closestInfectedCell = null;
                let minInfectedDist = Infinity;
                cells.forEach(cell => {
                    if (cell.isBeingInfected || cell.isBeingHarvested) {
                        const dist = Math.hypot(macrophage.x - cell.x, macrophage.y - cell.y);
                        if (dist < minInfectedDist) {
                            minInfectedDist = dist;
                            closestInfectedCell = cell;
                        }
                    }
                });

                if (closestInfectedCell) {
                    macrophage.activeTarget = closestInfectedCell;
                    macrophage.state = 'angreifend';
                }
                break;

            case 'angreifend':
                if (macrophage.activeTarget) {
                    const target = macrophage.activeTarget;
                    const dist = Math.hypot(macrophage.x - target.x, macrophage.y - target.y);
                    const angle = Math.atan2(target.y - macrophage.y, target.x - macrophage.x);
                    macrophage.x += Math.cos(angle) * MACROPHAGE_ATTACK_SPEED;
                    macrophage.y += Math.sin(angle) * MACROPHAGE_ATTACK_SPEED;

                    if (dist < macrophage.size / 2 + target.size / 2) {
                        if (target.isMainPlayer || scoutBacteria.includes(target) || baseBacteria.includes(target)) {
                            // Attacking a bacterium
                            if (!macrophage.killTimer) {
                                macrophage.killTimer = Date.now();
                            }
                            const timeElapsed = (Date.now() - macrophage.killTimer) / 1000;
                            if (timeElapsed >= MACROPHAGE_KILL_TIME) {
                                if (target.isMainPlayer) {
                                    player = null;
                                } else if (scoutBacteria.includes(target)) {
                                    const index = scoutBacteria.findIndex(b => b === target);
                                    if (index !== -1) scoutBacteria.splice(index, 1);
                                } else if (baseBacteria.includes(target)) {
                                    const index = baseBacteria.findIndex(b => b === target);
                                    if (index !== -1) baseBacteria.splice(index, 1);
                                }
                                macrophage.activeTarget = null;
                                macrophage.state = 'patrol';
                                macrophage.killTimer = null;
                            }
                        } else if (target.isBeingInfected || target.isBeingHarvested) {
                            // Attacking an infected cell
                            if (target.worker) {
                                const index = baseBacteria.findIndex(b => b === target.worker);
                                if (index !== -1) {
                                    baseBacteria.splice(index, 1);
                                    points += 50;
                                }
                            }
                            if (target.scout) {
                                const index = scoutBacteria.findIndex(s => s === target.scout);
                                if (index !== -1) {
                                    scoutBacteria.splice(index, 1);
                                    points += 50;
                                }
                            }
                            target.isBeingInfected = false;
                            target.isBeingHarvested = false;
                            target.scout = null;
                            target.worker = null;
                            macrophage.activeTarget = null;
                            macrophage.state = 'patrol';
                        }
                    } else {
                        // Reset kill timer if not in contact
                        macrophage.killTimer = null;
                    }
                } else {
                    macrophage.state = 'patrol';
                    macrophage.killTimer = null;
                }
                break;
        }
    });
}

function moveC5aProteins() {
    c5aProteins.forEach((protein, index) => {
        if (!protein.targetPhagocyte && !protein.targetMacrophage) {
            let closestImmuneCell = null;
            let minDistance = Infinity;

            phagocytes.forEach(phagocyte => {
                if (phagocyte.state === 'inactive' && Date.now() > phagocyte.cooldownUntil) {
                    const dist = Math.hypot(protein.x - phagocyte.x, protein.y - phagocyte.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestImmuneCell = phagocyte;
                    }
                }
            });

            macrophages.forEach(macrophage => {
                const dist = Math.hypot(protein.x - macrophage.x, protein.y - macrophage.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestImmuneCell = macrophage;
                }
            });

            if (closestImmuneCell) {
                if (closestImmuneCell.size === PHAGOCYTE_SIZE) {
                    protein.targetPhagocyte = closestImmuneCell;
                } else {
                    protein.targetMacrophage = closestImmuneCell;
                }
            } else {
                return;
            }
        }
        
        let target = protein.targetPhagocyte || protein.targetMacrophage;
        if (!target) return;

        const dist = Math.hypot(protein.x - target.x, protein.y - target.y);
        const angle = Math.atan2(target.y - protein.y, target.x - protein.x);
        
        protein.x += Math.cos(angle) * C5A_SPEED;
        protein.y += Math.sin(angle) * C5A_SPEED;
        
        if (dist < target.size + protein.size) {
            if (protein.targetPhagocyte) {
                target.state = 'aktiv';
                target.target = protein.targetUnit;
            } else {
                target.state = 'angreifend';
                target.activeTarget = protein.targetUnit;
            }
            c5aProteins.splice(index, 1);
        }
    });
}

function moveScouts() {
    if (!base) return;
    scoutBacteria.forEach(scout => {
        if (scout.isStationary || scout.marked) {
            return;
        }

        const distanceToBase = Math.hypot(scout.x - base.x, scout.y - base.y);

        if (distanceToBase < 50 && !scout.isPatrolling) {
            scout.isPatrolling = true;
            scout.targetX = base.x + (Math.random() - 0.5) * SCOUT_PATROL_RADIUS * 2;
            scout.targetY = base.y + (Math.random() - 0.5) * SCOUT_PATROL_RADIUS * 2;
        }

        if (scout.isPatrolling) {
            if (!scout.infestingTarget) {
                let closestCell = null;
                let minDistance = Infinity;

                cells.forEach(cell => {
                    const dist = Math.hypot(scout.x - cell.x, scout.y - cell.y);
                    const distToBase = Math.hypot(base.x - cell.x, base.y - cell.y);

                    if (!cell.isBase && !cell.isBeingInfected && !cell.isBeingHarvested && dist < minDistance && distToBase > baseInfectionRange && dist <= scoutInfectionRange) {
                        minDistance = dist;
                        closestCell = cell;
                    }
                });

                if (closestCell) {
                    scout.infestingTarget = closestCell;
                } else {
                    const distanceToTarget = Math.hypot(scout.x - scout.targetX, scout.y - scout.targetY);
                    if (distanceToTarget < 10) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * SCOUT_PATROL_RADIUS;
                        scout.targetX = base.x + Math.cos(angle) * distance;
                        scout.targetY = base.y + Math.sin(angle) * distance;
                    }
                    const angle = Math.atan2(scout.targetY - scout.y, scout.targetX - scout.x);
                    scout.x += Math.cos(angle) * scout.speed;
                    scout.y += Math.sin(angle) * scout.speed;
                }
            }

            if (scout.infestingTarget) {
                const cell = scout.infestingTarget;
                const distance = Math.hypot(scout.x - cell.x, scout.y - cell.y);

                if (distance > target.size) {
                    const angle = Math.atan2(cell.y - scout.y, cell.x - scout.x);
                    scout.x += Math.cos(angle) * scout.speed;
                    scout.y += Math.sin(angle) * scout.speed;
                } else {
                    if (!cell.isBeingHarvested && !cell.isBeingInfected) {
                        cell.isBeingInfected = true;
                        cell.scout = scout;
                        scout.isStationary = true;
                        scout.isInfesting = true;
                        scout.isPatrolling = false;
                        scout.x = cell.x;
                        scout.y = cell.y;
                    } else {
                        scout.infestingTarget = null;
                        scout.isPatrolling = true;
                        scout.targetX = base.x + (Math.random() - 0.5) * SCOUT_PATROL_RADIUS * 2;
                        scout.targetY = base.y + (Math.random() - 0.5) * SCOUT_PATROL_RADIUS * 2;
                    }
                }
            }
        } else {
            const angle = Math.atan2(base.y - scout.y, base.x - scout.x);
            scout.x += Math.cos(angle) * scout.speed;
            scout.y += Math.sin(angle) * scout.speed;
        }
    });
}

function moveBaseBacteria() {
    baseBacteria.forEach((bacterium, index) => {
        if (bacterium.isHarvesting || bacterium.marked) {
            return;
        }

        let closestFreeCell = null;
        let minDistanceFree = Infinity;
        
        cells.forEach(cell => {
            const dist = Math.hypot(bacterium.x - cell.x, bacterium.y - cell.y);
            if (dist <= baseInfectionRange && !cell.isBase && !cell.isBeingHarvested) {
                if (!cell.isBeingInfected && dist < minDistanceFree) {
                    minDistanceFree = dist;
                    closestFreeCell = cell;
                }
            }
        });

        if (closestFreeCell) {
            bacterium.isAttacking = true;
            bacterium.attackTarget = closestFreeCell;
        } else {
            if (Math.hypot(bacterium.x - bacterium.passiveTargetX, bacterium.y - bacterium.passiveTargetY) < 50) {
                bacterium.passiveTargetX = base.x + (Math.random() - 0.5) * baseInfectionRange;
                bacterium.passiveTargetY = base.y + (Math.random() - 0.5) * baseInfectionRange;
            }
            const angle = Math.atan2(bacterium.passiveTargetY - bacterium.y, bacterium.passiveTargetX - bacterium.x);
            bacterium.x += Math.cos(angle) * bacterium.speed * 0.5;
            bacterium.y += Math.sin(angle) * bacterium.speed * 0.5;
            bacterium.isAttacking = false;
            bacterium.attackTarget = null;
        }

        if (bacterium.isAttacking && bacterium.attackTarget) {
            const target = bacterium.attackTarget;
            const distance = Math.hypot(bacterium.x - target.x, bacterium.y - target.y);
            const angle = Math.atan2(target.y - bacterium.y, target.x - bacterium.x);

            if (distance > target.size) {
                bacterium.x += Math.cos(angle) * bacterium.speed;
                bacterium.y += Math.sin(angle) * bacterium.speed;
            } else {
                bacterium.isHarvesting = true;
                bacterium.x = target.x;
                bacterium.y = target.y;
                if (target.scout) {
                    target.scout.isStationary = false;
                    target.scout.infestingTarget = null;
                    target.scout.isPatrolling = false;
                    target.scout.targetX = base.x;
                    target.scout.targetY = base.y;
                    target.scout = null;
                }
                target.isBeingInfected = false;
                target.isBeingHarvested = true;
                target.worker = bacterium;
            }
        }
    });
}

function moveC3bProteins() {
    c3bProteins.forEach(protein => {
        if (!protein.active) {
            if (protein.inVessel) {
                const path = protein.vesselPath.path;
                const nextPoint = path[protein.pathIndex + protein.pathDirection];
                if (nextPoint) {
                    const angle = Math.atan2(nextPoint.y - protein.y, nextPoint.x - protein.x);
                    protein.x += Math.cos(angle) * C3B_SLOW_SPEED;
                    protein.y += Math.sin(angle) * C3B_SLOW_SPEED;
                    if (Math.hypot(protein.x - nextPoint.x, protein.y - nextPoint.y) < 5) {
                        protein.pathIndex += protein.pathDirection;
                    }
                } else {
                    protein.pathDirection *= -1;
                    protein.pathIndex += protein.pathDirection;
                }
            } else {
                if (!protein.localTargetX || Math.hypot(protein.x - protein.localTargetX, protein.y - protein.localTargetY) < 5) {
                    protein.localTargetX = protein.x + (Math.random() - 0.5) * 50;
                    protein.localTargetY = protein.y + (Math.random() - 0.5) * 50;
                }
                const angle = Math.atan2(protein.localTargetY - protein.y, protein.localTargetX - protein.x);
                protein.x += Math.cos(angle) * 0.5;
                protein.y += Math.sin(angle) * 0.5;
            }
        } else if (protein.target) {
            const target = protein.target;
            if (!protein.localTargetX || Math.hypot(protein.x - protein.localTargetX, protein.y - protein.localTargetY) < 5) {
                protein.localTargetX = target.x + (Math.random() - 0.5) * C3B_WILD_MOVEMENT_RADIUS;
                protein.localTargetY = target.y + (Math.random() - 0.5) * C3B_WILD_MOVEMENT_RADIUS;
            }
            const angle = Math.atan2(protein.localTargetY - protein.y, protein.localTargetX - protein.x);
            protein.x += Math.cos(angle) * C3B_WILD_SPEED;
            protein.y += Math.sin(angle) * C3B_WILD_SPEED;
        }
    });
}

function moveMacProteins() {
    macProteins.forEach(protein => {
        const target = protein.target;
        if (!target) return;
        const dist = Math.hypot(protein.x - target.x, protein.y - target.y);
        if (dist > target.size + 1) {
            const angle = Math.atan2(target.y - protein.y, target.x - protein.x);
            protein.x += Math.cos(angle) * 2;
            protein.y += Math.sin(angle) * 2;
        }
    });
}


function checkC3bActivation() {
    const units = [player, ...scoutBacteria, ...baseBacteria];
    for (let i = c3bProteins.length - 1; i >= 0; i--) {
        const protein = c3bProteins[i];
        for (const unit of units) {
            const distance = Math.hypot(unit.x - protein.x, unit.y - protein.y);
            if (distance < unit.size + protein.size) {
                if (!protein.active && !unit.marked) {
                    unit.marked = true;
                    c3bProteins.splice(i, 1);
                    for (let j = 0; j < C3B_VERMEHRUNG_COUNT; j++) {
                        c3bProteins.push({
                            x: unit.x + (Math.random() - 0.5) * C3B_SWARM_RADIUS,
                            y: unit.y + (Math.random() - 0.5) * C3B_SWARM_RADIUS,
                            size: 2,
                            active: true,
                            target: unit,
                            localTargetX: null,
                            localTargetY: null,
                            spawnTime: Date.now()
                        });
                    }

                    // Prüfe auf Phagozyten in der Nähe
                    let phagocyteNearby = false;
                    for (const phagocyte of phagocytes) {
                        const phagocyteDist = Math.hypot(unit.x - phagocyte.x, unit.y - phagocyte.y);
                        if (phagocyteDist < PHAGOCYTE_ATTACK_RADIUS) {
                            phagocyteNearby = true;
                            break;
                        }
                    }

                    // Starte MAC-Bildung nur, wenn kein Phagozyt in der Nähe ist
                    if (!phagocyteNearby) {
                         macProteins.push({
                            x: unit.x,
                            y: unit.y,
                            size: 3,
                            color: '#ff00ff',
                            target: unit,
                            isMac: true,
                            macIndex: 0,
                            angle: 0
                        });
                        unit.macCount = 1;
                    }

                    for (let k = 0; k < 10; k++) {
                        c5aProteins.push({
                            x: unit.x,
                            y: unit.y,
                            size: C5A_SIZE,
                            targetUnit: unit,
                            targetPhagocyte: null,
                            targetMacrophage: null,
                        });
                    }

                    break;
                } else if (protein.active && !unit.marked) {
                    unit.marked = true;
                    c3bProteins.splice(i, 1);
                    for (let j = 0; j < C3B_VERMEHRUNG_COUNT; j++) {
                        c3bProteins.push({
                            x: unit.x + (Math.random() - 0.5) * C3B_SWARM_RADIUS,
                            y: unit.y + (Math.random() - 0.5) * C3B_SWARM_RADIUS,
                            size: 2,
                            active: true,
                            target: unit,
                            localTargetX: null,
                            localTargetY: null,
                            spawnTime: Date.now()
                        });
                    }

                    // Prüfe auf Phagozyten in der Nähe
                    let phagocyteNearby = false;
                    for (const phagocyte of phagocytes) {
                        const phagocyteDist = Math.hypot(unit.x - phagocyte.x, unit.y - phagocyte.y);
                        if (phagocyteDist < PHAGOCYTE_ATTACK_RADIUS) {
                            phagocyteNearby = true;
                            break;
                        }
                    }
                    if (!phagocyteNearby) {
                         macProteins.push({
                            x: unit.x,
                            y: unit.y,
                            size: 3,
                            color: '#ff00ff',
                            target: unit,
                            isMac: true,
                            macIndex: 0,
                            angle: 0
                        });
                        unit.macCount = 1;
                    }

                    for (let k = 0; k < 10; k++) {
                        c5aProteins.push({
                            x: unit.x,
                            y: unit.y,
                            size: C5A_SIZE,
                            targetUnit: unit,
                            targetPhagocyte: null,
                            targetMacrophage: null,
                        });
                    }

                    break;
                }
            }
        }
    }
}

function buildMac() {
    const allUnits = [player, ...scoutBacteria, ...baseBacteria];
    allUnits.forEach(unit => {
        if (!unit || !unit.marked) return;

        // Check for nearby phagocytes or macrophages
        let immuneCellNearby = false;
        const allImmuneCells = [...phagocytes, ...macrophages];
        for (const immuneCell of allImmuneCells) {
            const dist = Math.hypot(unit.x - immuneCell.x, unit.y - immuneCell.y);
            if (dist < PHAGOCYTE_ATTACK_RADIUS) {
                immuneCellNearby = true;
                break;
            }
        }

        if (immuneCellNearby) {
            // Stop MAC formation if an immune cell is nearby
            unit.macActive = false;
            unit.macCount = 0;
            macProteins = macProteins.filter(p => p.target !== unit);
            return;
        }

        if (unit.macCount < MAC_PROTEIN_COUNT) {
            const macsOnUnit = macProteins.filter(p => p.target === unit);
            if (macsOnUnit.length < MAC_PROTEIN_COUNT) {
                const macPart = macsOnUnit.find(p => p.macIndex === unit.macCount - 1);
                if (macPart && Math.hypot(macPart.x - unit.x, macPart.y - unit.y) < unit.size + 5) {
                    unit.macCount++;
                    const newMacPart = {
                        x: unit.x,
                        y: unit.y,
                        size: 3,
                        color: ['#00ff00', '#0000ff', '#800080', '#ff00ff'][unit.macCount - 2],
                        target: unit,
                        isMac: true,
                        macIndex: unit.macCount - 1,
                        angle: (unit.macCount - 1) * (2 * Math.PI / MAC_PROTEIN_COUNT),
                    };
                    macProteins.push(newMacPart);
                }
            }
        }

        if (unit.macCount === MAC_PROTEIN_COUNT && !unit.macActive) {
            unit.macActive = true;
            unit.macStart = Date.now();
        }
    });
}

function handleBaseControlClick(e) {
    if (base && e.button === 0) {
        const camX = player.x - canvas.width / 2;
        const camY = player.y - canvas.height / 2;
        const mouseGameX = e.clientX + camX;
        const mouseGameY = e.clientY + camY;
        const distance = Math.hypot(mouseGameX - base.x, mouseGameY - base.y);
        if (distance < base.size) {
            baseControlUI.style.display = 'flex';
        } else {
            baseControlUI.style.display = 'none';
        }
    }
}

function openTechTree() {
    techTreeOverlay.style.display = 'flex';
    baseControlUI.style.display = 'none';
    updateTechTreeUI();
}

function closeTechTree() {
    techTreeOverlay.style.display = 'none';
}

function openControlsMenu() {
    controlsOverlay.style.display = 'flex';
    baseControlUI.style.display = 'none';
}

function closeControlsMenu() {
    controlsOverlay.style.display = 'none';
}

function updateTechTreeUI() {
    baseLevelDisplay.textContent = baseLevel;
    workerLevelDisplay.textContent = workerLevel;
    scoutLevelDisplay.textContent = scoutLevel;
    renderUpgrades(baseUpgradesContainer, techTree.base, baseLevel, 'base');
    renderUpgrades(workerUpgradesContainer, techTree.worker, workerLevel, 'worker');
    renderUpgrades(scoutUpgradesContainer, techTree.scout, scoutLevel, 'scout');
    updateLevelUpButtons();
}

function renderUpgrades(container, tree, currentLevel, type) {
    container.innerHTML = '';
    const currentLevelUpgrades = tree.filter(up => up.level === currentLevel && up.type === 'upgrade');
    currentLevelUpgrades.forEach((upgrade, index) => {
        const item = document.createElement('div');
        item.className = 'upgrade-item';
        item.innerHTML = `
            <span>${upgrade.name}</span>
            <span>Kosten: <span class="upgrade-cost">${upgrade.cost}</span> Punkte</span>
            <button class="upgrade-button" data-type="${type}" data-index="${tree.findIndex(u => u === upgrade)}" ${upgrade.bought ? 'disabled' : ''}>${upgrade.bought ? 'Gekauft' : 'Kaufen'}</button>
        `;
        container.appendChild(item);
    });
}

function updateLevelUpButtons() {
    const baseUpgrades = techTree.base.filter(up => up.level === baseLevel && up.type === 'upgrade');
    const workerUpgrades = techTree.worker.filter(up => up.level === workerLevel && up.type === 'upgrade');
    const scoutUpgrades = techTree.scout.filter(up => up.level === scoutLevel && up.type === 'upgrade');
    const baseUpgradesBought = baseUpgrades.every(up => up.bought);
    const workerUpgradesBought = workerUpgrades.every(up => up.bought);
    const scoutUpgradesBought = scoutUpgrades.every(up => up.bought);
    const baseLevelUpCost = techTree.base.find(up => up.level === baseLevel && up.type === 'level-up')?.cost || Infinity;
    const workerLevelUpCost = techTree.worker.find(up => up.level === workerLevel && up.type === 'level-up')?.cost || Infinity;
    const scoutLevelUpCost = techTree.scout.find(up => up.level === scoutLevel && up.type === 'level-up')?.cost || Infinity;
    upgradeBaseLevelBtn.style.display = baseUpgradesBought ? 'block' : 'none';
    upgradeBaseLevelBtn.disabled = points < baseLevelUpCost;
    upgradeBaseLevelBtn.textContent = `Level Up Basis (${baseLevelUpCost} Punkte)`;
    upgradeWorkerLevelBtn.style.display = workerUpgradesBought ? 'block' : 'none';
    upgradeWorkerLevelBtn.disabled = points < workerLevelUpCost;
    upgradeWorkerLevelBtn.textContent = `Level Up Arbeiter (${workerLevelUpCost} Punkte)`;
    upgradeScoutLevelBtn.style.display = scoutUpgradesBought ? 'block' : 'none';
    upgradeScoutLevelBtn.disabled = points < scoutLevelUpCost;
    upgradeScoutLevelBtn.textContent = `Level Up Scouts (${scoutLevelUpCost} Punkte)`;
}

function buyUpgrade(type, upgradeIndex) {
    const upgrade = techTree[type][upgradeIndex];
    if (points >= upgrade.cost && !upgrade.bought) {
        points -= upgrade.cost;
        upgrade.bought = true;
        applyUpgradeEffects(type, upgrade.effects);
        updateTechTreeUI();
    }
}

function applyUpgradeEffects(type, effects) {
    if (type === 'base') {
        if (effects.workerLimit) baseWorkerLimit = effects.workerLimit;
        if (effects.range) baseInfectionRange = effects.range;
        if (effects.production) baseProductionInterval = effects.production;
    } else if (type === 'worker') {
        if (effects.decayRate) workerDecayRate = effects.decayRate;
    } else if (type === 'scout') {
        if (effects.damage) scoutDamageMultiplier = effects.damage;
        if (effects.health) scoutHealthMultiplier = effects.health;
        if (effects.limit) scoutSquadLimit += effects.limit;
    }
}

function levelUp(type) {
    let levelUpCost;
    if (type === 'base') {
        levelUpCost = techTree.base.find(up => up.level === baseLevel && up.type === 'level-up')?.cost;
        if (points >= levelUpCost) {
            points -= levelUpCost;
            baseLevel++;
        }
    } else if (type === 'worker') {
        levelUpCost = techTree.worker.find(up => up.level === workerLevel && up.type === 'level-up')?.cost;
        if (points >= levelUpCost) {
            points -= levelUpCost;
            workerLevel++;
        }
    } else if (type === 'scout') {
        levelUpCost = techTree.scout.find(up => up.level === scoutLevel && up.type === 'level-up')?.cost;
        if (points >= levelUpCost) {
            points -= levelUpCost;
            scoutLevel++;
        }
    }
    updateTechTreeUI();
}

function gameLoop() {
    if (!gameRunning) return;
    produceBacterium();
    movePlayer();
    moveScouts();
    moveBaseBacteria();
    moveC3bProteins();
    moveC5aProteins();
    movePhagocytes();
    moveMacrophages();
    checkC3bActivation();
    buildMac();
    moveMacProteins();
    updateDecay();

    // Überprüfung, ob Einheiten noch existieren und ggf. neu zuweisen
    const allUnits = [player, ...scoutBacteria, ...baseBacteria];
    for (const unit of allUnits) {
        if (unit && unit.marked) {
            const targetProtein = c3bProteins.find(p => p.target === unit);
            if (!targetProtein) {
                unit.marked = false;
                if (unit.isPatrolling) {
                    unit.targetX = base.x + (Math.random() - 0.5) * SCOUT_PATROL_RADIUS * 2;
                    unit.targetY = base.y + (Math.random() - 0.5) * SCOUT_PATROL_RADIUS * 2;
                }
            }
        }
    }
    
    // Entferne zerstörte Einheiten
    scoutBacteria = scoutBacteria.filter(member => member.health > 0);
    baseBacteria = baseBacteria.filter(member => member.health > 0);
    
    // Setze Spieler neu, falls Hauptzelle zerstört
    if (player && player.health <= 0) {
        if (scoutBacteria.length > 0) {
            const newPlayer = scoutBacteria.shift();
            player = newPlayer;
            player.isMainPlayer = true;
            player.size = 15;
            player.speed = PLAYER_BASE_SPEED;
            player.health = 100;
        } else {
            alert('Game Over! Deine Hauptzelle und alle Klone wurden zerstört.');
            gameRunning = false;
        }
    }
    
    if (base && base.health <= 0) {
        alert('Game Over! Die Basis wurde zerstört.');
        gameRunning = false;
    }
    
    // Drawing
    ctx.fillStyle = '#1a000d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const camX = player ? player.x - canvas.width / 2 : 0;
    const camY = player ? player.y - canvas.height / 2 : 0;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawBloodVessels();
    drawCells();
    drawBase();
    drawC3bProteins();
    drawPhagocytes();
    drawMacrophages();
    drawC5aProteins();
    drawScoutBacteria();
    drawPlayer();
    drawBaseBacteria();
    drawMacProteins();
    ctx.restore();
    drawWaypoint();
    drawMinimap();
    updateUI();
    requestAnimationFrame(gameLoop);
}


let mouseX = 0;
let mouseY = 0;
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const camX = player ? player.x - canvas.width / 2 : 0;
    const camY = player ? player.y - canvas.height / 2 : 0;
    mouseX = (e.clientX - rect.left) * scaleX + camX;
    mouseY = (e.clientY - rect.top) * scaleY + camY;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        scoutBacteria.forEach(member => {
            if (member.selected && !member.isStationary) {
                member.targetX = mouseX;
                member.targetY = mouseY;
                member.isStationary = false;
                member.isInfesting = false;
                member.infestingTarget = null;
                member.isPatrolling = false;
            }
        });
        return;
    }
    isDragging = true;
    dragStartX = mouseX;
    dragStartY = mouseY;
    let clickedOnMember = false;
    scoutBacteria.forEach(member => {
        const distance = Math.hypot(mouseX - member.x, mouseY - member.y);
        if (distance < member.size && !member.isStationary) {
            if (!e.shiftKey) {
                scoutBacteria.forEach(m => m.selected = false);
            }
            member.selected = true;
            clickedOnMember = true;
        }
    });
    if (!clickedOnMember && !e.shiftKey) {
        scoutBacteria.forEach(member => member.selected = false);
    }
    handleBaseControlClick(e);
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    isDragging = false;
    const dragEndX = mouseX;
    const dragEndY = mouseY;
    const minX = Math.min(dragStartX, dragEndX);
    const maxX = Math.max(dragStartX, dragEndX);
    const minY = Math.min(dragStartY, dragEndY);
    const maxY = Math.max(dragStartY, dragEndY);
    scoutBacteria.forEach(member => {
        if (member.x > minX && member.x < maxX && member.y > minY && member.y < maxY && !member.isStationary) {
            member.selected = true;
        }
    });
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

infectButton.addEventListener('click', () => {
    infectCell();
});

passiveBtn.addEventListener('click', () => {
    baseBacteriaBehavior = 'passive';
    baseBacteria.forEach(bacterium => {
        if (!bacterium.isHarvesting) {
            bacterium.isAttacking = false;
            bacterium.attackTarget = null;
            bacterium.passiveTargetX = base.x + (Math.random() - 0.5) * 200;
            bacterium.passiveTargetY = base.y + (Math.random() - 0.5) * 200;
        }
    });
    baseControlUI.style.display = 'none';
});

defendBtn.addEventListener('click', () => {
    baseBacteriaBehavior = 'defend';
    baseBacteria.forEach(bacterium => {
        if (!bacterium.isHarvesting) {
            bacterium.isAttacking = false;
            bacterium.attackTarget = null;
            bacterium.passiveTargetX = base.x + (Math.random() - 0.5) * 50;
            bacterium.passiveTargetY = base.y + (Math.random() - 0.5) * 50;
        }
    });
    baseControlUI.style.display = 'none';
});

aggressiveBtn.addEventListener('click', () => {
    baseBacteriaBehavior = 'aggressive';
    baseBacteria.forEach(bacterium => {
        bacterium.isAttacking = false;
        bacterium.attackTarget = null;
    });
    baseControlUI.style.display = 'none';
});

openTechTreeBtn.addEventListener('click', openTechTree);
openControlsBtn.addEventListener('click', openControlsMenu);
closeControlsBtn.addEventListener('click', closeControlsMenu);
createScoutBtn.addEventListener('click', createScout);

closeTechTreeBtn.addEventListener('click', closeTechTree);

if (techTreeTabs) {
    techTreeTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
            document.getElementById(e.target.dataset.tab).style.display = 'block';
        }
    });
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('upgrade-button') && !e.target.disabled) {
        const type = e.target.dataset.type;
        const index = e.target.dataset.index;
        buyUpgrade(type, index);
    }
});

upgradeBaseLevelBtn.addEventListener('click', () => levelUp('base'));
upgradeWorkerLevelBtn.addEventListener('click', () => levelUp('worker'));
upgradeScoutLevelBtn.addEventListener('click', () => levelUp('scout'));

document.addEventListener('keydown', (e) => {
    if (!player) return;
    switch (e.key) {
        case 'ArrowUp':
            player.isMovingUp = true;
            break;
        case 'ArrowDown':
            player.isMovingDown = true;
            break;
        case 'ArrowLeft':
            player.isMovingLeft = true;
            break;
        case 'ArrowRight':
            player.isMovingRight = true;
            break;
        case 'e':
        case 'E':
            infectCell();
            break;
        case 't':
        case 'T':
            if (!gameRunning) return;
            scoutBacteria.forEach(member => {
                if (member.selected) {
                    member.isStationary = true;
                    member.isInfesting = false;
                    member.infestingTarget = null;
                    member.targetX = member.x;
                    member.targetY = member.y;
                }
            });
            break;
        case 'b':
        case 'B':
            if (!gameRunning) return;
            if (base) {
                scoutBacteria.forEach(member => {
                    if (member.selected) {
                        member.targetX = base.x + (Math.random() - 0.5) * 50;
                        member.targetY = base.y + (Math.random() - 0.5) * 50;
                        member.isStationary = false;
                        member.isInfesting = false;
                        member.infestingTarget = null;
                    }
                });
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    if (!player) return;
    switch (e.key) {
        case 'ArrowUp':
            player.isMovingUp = false;
            break;
        case 'ArrowDown':
            player.isMovingDown = false;
            break;
        case 'ArrowLeft':
            player.isMovingLeft = false;
            break;
        case 'ArrowRight':
            player.isMovingRight = false;
            break;
    }
});

function startGame() {
    generateBloodVessels();
    generateCells();
    generateC3bProteins();
    generatePhagocytes();
    generateMacrophages();

    player = {
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        size: 15,
        originalSize: 15,
        speed: PLAYER_BASE_SPEED,
        health: 100,
        maxHealth: 100,
        isMovingUp: false,
        isMovingDown: false,
        isMovingLeft: false,
        isMovingRight: false,
        isMainPlayer: true,
        inVessel: false,
        snapping: false,
        marked: false,
        macCount: 0,
        macActive: false,
    };
    if (bloodVessels.length > 0) {
        const startVessel = bloodVessels[Math.floor(Math.random() * bloodVessels.length)];
        const startIndex = Math.floor(startVessel.path.length / 2);
        player.x = startVessel.path[startIndex].x;
        player.y = startVessel.path[startIndex].y;
        player.inVessel = true;
    }

    gameRunning = true;
    gameLoop();
}

startGame();
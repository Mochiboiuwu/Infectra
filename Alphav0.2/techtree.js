// ============================================
// INFECTRA v0.2 - Fokusbaum (Tech Tree)
// Biologisch fundiert: echte bakterielle Mechanismen
// ============================================

// Zentraler Spielzustand — wird von Upgrades modifiziert.
// Gilt für ALLE Bakterien, sobald erforscht (nach Rückkehr zur Basis verteilt).
const GameState = {
    upgrades: {},                 // id -> true wenn erforscht

    // Bewegung
    landSpeedMult: 1.0,           // Tempo außerhalb der Blutbahn
    vesselSpeedMult: 1.0,         // zusätzliches Tempo IN der Blutbahn
    chemotaxis: false,            // Scouts finden Ressourcen schneller/weiter

    // Effizienz
    resourceCostMult: 1.0,        // Baukosten aller Einheiten
    harvestMult: 1.0,             // Sammelmenge pro Scout
    carryMult: 1.0,               // Tragkapazität

    // Freigeschaltete Einheiten
    unlockedUnits: { scout: true, miniScout: false, worker: false, fighter: false, builder: false },

    // Kampf
    attackMult: 1.0,
    healthMult: 1.0,

    // Komplement-Resistenz (0..1 pro Stufe; 1.0 = volle Immunität)
    complementResist: {
        capsule: 0,       // Polysaccharid-Kapsel -> blockt C3b-Ablagerung
        factorH: 0,       // Faktor-H-Rekrutierung -> inaktiviert C3b
        c5aPeptidase: 0,  // spaltet C5a -> keine Chemotaxis-Lockung
        sialicAcid: 0,    // Sialinsaeure-Tarnung -> "self"-Mimikry
        macResist: 0      // Membran gegen MAC (C5b-9) Poren
    },

    // Gesamt-Komplement-Schutz 0..1
    get totalComplementImmunity() {
        const c = this.complementResist;
        return Math.min(1, (c.capsule + c.factorH + c.c5aPeptidase + c.sialicAcid + c.macResist) / 5);
    }
};

// ---- Fokusbaum-Definition ----
const TECH_TREE = [
    // ========== STAMM: Mobilitaet ==========
    {
        id: 'flagella_1', name: 'Verstaerkte Flagellen', branch: 'mobility', tier: 1,
        desc: '+25% Tempo ausserhalb der Blutbahn. Laengere Flagellen, staerkerer Vortrieb.',
        cost: { glucose: 120, amino: 60 }, requires: [],
        apply: () => { GameState.landSpeedMult *= 1.25; }
    },
    {
        id: 'chemotaxis', name: 'Chemotaxis-Rezeptoren', branch: 'mobility', tier: 2,
        desc: 'Bakterien spueren Naehrstoffgradienten - Scouts finden Ressourcen weiter entfernt.',
        cost: { glucose: 220, amino: 150 }, requires: ['flagella_1'],
        apply: () => { GameState.chemotaxis = true; }
    },
    {
        id: 'flagella_2', name: 'Polare Flagellenbuendel', branch: 'mobility', tier: 3,
        desc: '+40% Tempo. Koordiniertes Buendel statt Einzelgeisseln.',
        cost: { glucose: 400, amino: 220, lipid: 120 }, requires: ['chemotaxis'],
        apply: () => { GameState.landSpeedMult *= 1.4; }
    },
    {
        id: 'vessel_glide', name: 'Stroemungsanpassung', branch: 'mobility', tier: 4,
        desc: '+50% Tempo IN Blutbahnen. Nutzt den Blutfluss optimal aus.',
        cost: { glucose: 500, lipid: 250 }, requires: ['flagella_2'],
        apply: () => { GameState.vesselSpeedMult *= 1.5; }
    },

    // ========== STAMM: Einheiten ==========
    {
        id: 'unit_miniscout', name: 'Mini-Scout', branch: 'units', tier: 1,
        desc: 'Winzige Bakterien - minimale Baukosten, tragen wenig, koennen NICHT kaempfen. Spotten aber Immun-Basen (muessen zur Basis zurueck um den Fund zu teilen).',
        cost: { amino: 90, glucose: 60 }, requires: [],
        apply: () => { GameState.unlockedUnits.miniScout = true; }
    },
    {
        id: 'unit_worker', name: 'Arbeiter', branch: 'units', tier: 2,
        desc: 'Schwere Sammler & Konstrukteure. Bauen die Basis aus und errichten Gebaeude. Hoehere Tragkapazitaet als Scouts.',
        cost: { amino: 180, lipid: 100 }, requires: [],
        apply: () => { GameState.unlockedUnits.worker = true; }
    },
    {
        id: 'unit_fighter', name: 'Kaempfer', branch: 'units', tier: 2,
        desc: 'Aggressive Bakterien mit Toxinen. Patrouillieren um die Basis und koennen Mini-Scouts als Begleiter rekrutieren.',
        cost: { amino: 250, lipid: 140, iron: 40 }, requires: [],
        apply: () => { GameState.unlockedUnits.fighter = true; }
    },
    {
        id: 'unit_builder', name: 'Bauer', branch: 'units', tier: 3,
        desc: 'Bilden den lebenden Boden der Kolonie - ruecken eng zusammen und erzeugen ein Buff-Feld: alle Bakterien darin sind schneller & zaeher.',
        cost: { amino: 350, lipid: 220 }, requires: ['unit_worker'],
        apply: () => { GameState.unlockedUnits.builder = true; }
    },

    // ========== STAMM: Effizienz ==========
    {
        id: 'metabolism_1', name: 'Effizienter Stoffwechsel', branch: 'efficiency', tier: 1,
        desc: '-15% Baukosten aller Einheiten. Optimierte ATP-Nutzung.',
        cost: { glucose: 150, amino: 90 }, requires: [],
        apply: () => { GameState.resourceCostMult *= 0.85; }
    },
    {
        id: 'transport_1', name: 'Membran-Transporter', branch: 'efficiency', tier: 2,
        desc: '+40% Sammelmenge. ABC-Transporter ziehen Naehrstoffe schneller rein.',
        cost: { glucose: 280, lipid: 150 }, requires: ['metabolism_1'],
        apply: () => { GameState.harvestMult *= 1.4; }
    },
    {
        id: 'storage_1', name: 'Glykogen-Speicher', branch: 'efficiency', tier: 2,
        desc: '+50% Tragkapazitaet. Bakterien speichern mehr intrazellulaer.',
        cost: { glucose: 250, lipid: 180 }, requires: ['metabolism_1'],
        apply: () => { GameState.carryMult *= 1.5; }
    },
    {
        id: 'metabolism_2', name: 'Anaerobe Glykolyse', branch: 'efficiency', tier: 3,
        desc: '-25% Baukosten. Energie auch ohne Sauerstoff - ueberall effizient.',
        cost: { glucose: 600, amino: 350 }, requires: ['transport_1', 'storage_1'],
        apply: () => { GameState.resourceCostMult *= 0.75; }
    },

    // ========== STAMM: Komplement-Evasion (Endgame) ==========
    {
        id: 'capsule_1', name: 'Polysaccharid-Kapsel', branch: 'complement', tier: 1,
        desc: 'Schleimkapsel um die Zelle - erschwert die C3b-Ablagerung. Reale Hauptabwehr von Pneumokokken & Meningokokken.',
        cost: { glucose: 600, lipid: 450, amino: 200 }, requires: [],
        apply: () => { GameState.complementResist.capsule = 0.4; }
    },
    {
        id: 'capsule_2', name: 'Dicke Kapsel (K-Antigen)', branch: 'complement', tier: 2,
        desc: 'Verdickte Kapsel - C3b wird fast vollstaendig abgeschirmt.',
        cost: { glucose: 1200, lipid: 900, iron: 150 }, requires: ['capsule_1'],
        apply: () => { GameState.complementResist.capsule = 0.75; }
    },
    {
        id: 'factor_h', name: 'Faktor-H-Bindeprotein', branch: 'complement', tier: 2,
        desc: 'Rekrutiert den koerpereigenen Regulator Faktor H an die Oberflaeche - beschleunigt den Zerfall der C3-Konvertase. (Neisseria-Trick).',
        cost: { amino: 1000, lipid: 700, iron: 100 }, requires: ['capsule_1'],
        apply: () => { GameState.complementResist.factorH = 0.6; }
    },
    {
        id: 'c5a_peptidase', name: 'C5a-Peptidase', branch: 'complement', tier: 3,
        desc: 'Enzym spaltet den Lockstoff C5a - Phagozyten werden nicht mehr angelockt. (Streptokokken ScpA).',
        cost: { amino: 1600, iron: 300, lipid: 400 }, requires: ['factor_h'],
        apply: () => { GameState.complementResist.c5aPeptidase = 0.7; }
    },
    {
        id: 'sialic_acid', name: 'Sialinsaeure-Tarnung', branch: 'complement', tier: 3,
        desc: 'Beschichtet die Oberflaeche mit Sialinsaeure - das Immunsystem haelt die Zelle fuer koerpereigen (molekulares Mimikry).',
        cost: { glucose: 1800, lipid: 1300, amino: 600 }, requires: ['capsule_2'],
        apply: () => { GameState.complementResist.sialicAcid = 0.7; }
    },
    {
        id: 'mac_resist', name: 'MAC-resistente Membran', branch: 'complement', tier: 4,
        desc: 'Modifizierte Aussenmembran (LPS-O-Antigen / dickes Peptidoglykan) widersteht dem Membranangriffskomplex C5b-9.',
        cost: { lipid: 2500, iron: 700, amino: 1000 }, requires: ['c5a_peptidase', 'sialic_acid'],
        apply: () => { GameState.complementResist.macResist = 0.8; }
    },
    {
        id: 'full_immunity', name: 'Totale Komplement-Immunitaet', branch: 'complement', tier: 5,
        desc: 'ENDGAME: Vollstaendige Resistenz gegen die gesamte Komplementkaskade - klassischer, alternativer & Lektin-Weg. Das Komplementsystem ist gegen dich machtlos.',
        cost: { glucose: 5000, amino: 5000, lipid: 5000, iron: 2000 }, requires: ['mac_resist'],
        apply: () => {
            const c = GameState.complementResist;
            c.capsule = c.factorH = c.c5aPeptidase = c.sialicAcid = c.macResist = 1.0;
        }
    }
];

// ---- Forschungs-Logik (Fortschritts-System) ----
// Man WAEHLT eine Forschung -> Scouts/Arbeiter bringen Ressourcen zur Basis ->
// die ankommenden Ressourcen werden in die Forschung investiert -> Balken fuellt sich.
const Research = {
    active: null,        // aktuell gewaehlter Knoten
    invested: {},        // bisher in den aktiven Knoten investierte Ressourcen

    isResearched(id) { return !!GameState.upgrades[id]; },

    isAvailable(node) {
        if (this.isResearched(node.id)) return false;
        return node.requires.every(r => this.isResearched(r));
    },

    // Forschungskosten skalieren NICHT mit Effizienz (Forschung ist Forschung)
    cost(node) { return node.cost; },

    totalCost(node) {
        return Object.values(node.cost).reduce((a, b) => a + b, 0);
    },

    // Forschung auswaehlen (startet das Sammeln)
    select(node) {
        if (!this.isAvailable(node)) return false;
        if (this.active && this.active.id === node.id) { this.cancel(); return false; }
        this.cancel();
        this.active = node;
        this.invested = {};
        for (const k of Object.keys(node.cost)) this.invested[k] = 0;
        return true;
    },

    cancel() {
        // bereits investierte Ressourcen zurueck in die Basis? -> Nein, verbraucht.
        this.active = null;
        this.invested = {};
    },

    // Pro Frame: verfuegbare Basis-Ressourcen in die aktive Forschung ziehen
    update(base) {
        if (!this.active) return;
        const node = this.active;
        const drawPerFrame = 1.2; // wie schnell investiert wird
        let complete = true;
        for (const [r, need] of Object.entries(node.cost)) {
            const remaining = need - this.invested[r];
            if (remaining > 0) {
                const take = Math.min(remaining, drawPerFrame, base.resources[r] || 0);
                if (take > 0) {
                    base.resources[r] -= take;
                    this.invested[r] += take;
                }
                if (this.invested[r] < need) complete = false;
            }
        }
        if (complete) {
            GameState.upgrades[node.id] = true;
            if (node.apply) node.apply();
            this.active = null;
            this.invested = {};
            if (typeof onResearchComplete === 'function') onResearchComplete(base);
        }
    },

    progress(node) {
        if (!this.active || this.active.id !== node.id) return 0;
        const total = this.totalCost(node);
        const done = Object.values(this.invested).reduce((a, b) => a + b, 0);
        return total > 0 ? done / total : 0;
    }
};

// Callback, vom Spiel gesetzt, um die UI zu aktualisieren
let onResearchComplete = null;

// ============================================
// Fokusbaum-UI (DOM-Overlay)
// ============================================
const BRANCH_META = {
    mobility:   { label: 'Mobilitaet',  color: '#00c8ff', icon: '~' },
    units:      { label: 'Einheiten',   color: '#00e87a', icon: '*' },
    efficiency: { label: 'Effizienz',   color: '#f5c842', icon: '+' },
    complement: { label: 'Komplement-Evasion', color: '#ff5577', icon: '#' }
};

const RES_LABEL = { glucose: 'Glu', amino: 'Amino', lipid: 'Lipid', iron: 'Fe' };

function renderTechTree(base) {
    const container = document.getElementById('techtree-branches');
    if (!container) return;
    container.innerHTML = '';

    const branches = ['mobility', 'units', 'efficiency', 'complement'];
    for (const br of branches) {
        const meta = BRANCH_META[br];
        const col = document.createElement('div');
        col.className = 'tt-branch';

        const head = document.createElement('div');
        head.className = 'tt-branch-head';
        head.style.color = meta.color;
        head.innerHTML = `<span class="tt-branch-icon">${meta.icon}</span> ${meta.label}`;
        col.appendChild(head);

        const nodes = TECH_TREE.filter(n => n.branch === br).sort((a, b) => a.tier - b.tier);
        for (const node of nodes) {
            col.appendChild(buildNodeCard(node, base, meta.color));
        }
        container.appendChild(col);
    }
}

function buildNodeCard(node, base, color) {
    const researched = Research.isResearched(node.id);
    const available  = Research.isAvailable(node);
    const isActive   = Research.active && Research.active.id === node.id;

    const card = document.createElement('div');
    card.className = 'tt-node ' +
        (researched ? 'tt-done' : isActive ? 'tt-active' : available ? 'tt-ready' : 'tt-locked');
    card.style.setProperty('--node-color', color);

    const cost = Research.cost(node);
    const costStr = Object.entries(cost)
        .map(([r, a]) => {
            const inv = isActive ? Math.floor(Research.invested[r] || 0) : 0;
            const label = isActive ? `${RES_LABEL[r]} ${inv}/${a}` : `${RES_LABEL[r]} ${a}`;
            return `<span class="tt-cost-item ${r}">${label}</span>`;
        }).join('');

    const pct = Math.round(Research.progress(node) * 100);
    const progressBar = isActive
        ? `<div class="tt-progress"><div class="tt-progress-fill" style="width:${pct}%"></div><span class="tt-progress-pct">${pct}%</span></div>`
        : '';

    card.innerHTML = `
        <div class="tt-node-name">${node.name}${isActive ? ' <span class="tt-active-tag">FORSCHT...</span>' : ''}</div>
        <div class="tt-node-desc">${node.desc}</div>
        ${progressBar}
        <div class="tt-node-footer">
            ${researched ? '<span class="tt-badge">ERFORSCHT</span>'
              : `<div class="tt-costs">${costStr}</div>`}
        </div>`;

    if (!researched && available) {
        card.addEventListener('click', () => {
            Research.select(node);  // auswaehlen ODER abwaehlen wenn schon aktiv
            renderTechTree(base);
        });
    }
    return card;
}

function openTechTree(base) {
    renderTechTree(base);
    document.getElementById('techtree-overlay').classList.add('open');
}
function closeTechTree() {
    document.getElementById('techtree-overlay').classList.remove('open');
}

// ============================================
// INFECTRA v0.2 - Produktions-Menue (UI)
// ============================================

const PROD_ORDER = ['scout', 'miniScout', 'worker', 'fighter', 'builder'];

function renderProductionMenu(base, units) {
    const list = document.getElementById('production-list');
    if (!list) return;
    list.innerHTML = '';

    for (const type of PROD_ORDER) {
        const def = UNIT_DEFS[type];
        const unlocked = base.isUnlocked(type);
        const cfg = ProductionManager.settings[type];
        const count = ProductionManager.countOf(units, type);
        const cost = base.scaledCost(type);
        const canAfford = base.canAfford(cost);

        const row = document.createElement('div');
        row.className = 'prod-row' + (unlocked ? '' : ' prod-locked');

        const costStr = Object.entries(cost)
            .map(([r, a]) => `<span class="prod-cost ${r}">${RES_LABEL[r]} ${a}</span>`).join('');

        row.innerHTML = `
            <div class="prod-row-main">
                <div class="prod-name">${def.label} ${unlocked ? `<span class="prod-count">x${count}</span>` : '<span class="prod-need">im Fokusbaum freischalten</span>'}</div>
                <div class="prod-costs">${costStr}</div>
            </div>
            <div class="prod-controls">
                <button class="prod-make ${canAfford && unlocked ? '' : 'dis'}" data-type="${type}">+1</button>
                <div class="prod-auto">
                    <button class="prod-auto-toggle ${cfg.auto ? 'on' : ''}" data-type="${type}">AUTO</button>
                    <div class="prod-target">
                        <button class="prod-minus" data-type="${type}">&minus;</button>
                        <span class="prod-target-val">${cfg.target}</span>
                        <button class="prod-plus" data-type="${type}">+</button>
                    </div>
                </div>
            </div>`;
        list.appendChild(row);
    }

    // Event-Handler (Delegation)
    list.querySelectorAll('.prod-make').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = btn.dataset.type;
            if (base.isUnlocked(t)) { spawnUnit(t); renderProductionMenu(base, units); }
        });
    });
    list.querySelectorAll('.prod-auto-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const cfg = ProductionManager.settings[btn.dataset.type];
            cfg.auto = !cfg.auto;
            if (cfg.auto && cfg.target === 0) cfg.target = 5;
            renderProductionMenu(base, units);
        });
    });
    list.querySelectorAll('.prod-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            ProductionManager.settings[btn.dataset.type].target += 5;
            renderProductionMenu(base, units);
        });
    });
    list.querySelectorAll('.prod-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const cfg = ProductionManager.settings[btn.dataset.type];
            cfg.target = Math.max(0, cfg.target - 5);
            renderProductionMenu(base, units);
        });
    });
}

function openProduction(base, units) {
    renderProductionMenu(base, units);
    document.getElementById('production-overlay').classList.add('open');
}
function closeProduction() {
    document.getElementById('production-overlay').classList.remove('open');
}

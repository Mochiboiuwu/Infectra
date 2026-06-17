// ============================================
// INFECTRA v0.2 - Komplement-System (Block E)
// Vollständige biologische Kaskade:
//   Klassischer Weg:   C1q → C1r/C1s → C4 → C2 → C3-Konvertase (C4b2a) → C3b
//   Lektin-Weg:        MBL+MASP1/2 → C4 → C2 → C3-Konvertase
//   Alternativer Weg:  C3(H2O) + Faktor B + D → C3-Konvertase (C3bBb) + Properdin
//   Terminaler Weg:    C3b → C5-Konvertase → C5b → C6 → C7 → C8 → C9(poly) = MAC
// Evasion via GameState: capsule, factorH, sialicAcid, c5aPeptidase, macResist
// ============================================

const ComplementSystem = (() => {

    // ---- Protein-Partikel (floating im Plasma) ----
    class Protein {
        constructor(x, y, type) {
            this.x = x; this.y = y;
            this.type = type;         // 'C3', 'C1q', 'MBL', 'FB' etc.
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.active = true;
            this.age = 0;
            this.maxAge = 600 + Math.random() * 400;
            this.radius = PROTEIN_RADIUS[type] || 4;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            // Brownsche Bewegung
            this.vx += (Math.random() - 0.5) * 0.08;
            this.vy += (Math.random() - 0.5) * 0.08;
            this.vx *= 0.97; this.vy *= 0.97;
            this.age++;
            if (this.age >= this.maxAge) this.active = false;
        }
        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, (this.maxAge - this.age) / 60) * 0.75;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = PROTEIN_COLOR[this.type] || '#aaaaaa';
            ctx.fill();
            ctx.restore();
        }
    }

    const PROTEIN_RADIUS = {
        C1q:4.5, C1r:3, C1s:3, C4:4, C2:3, C3:5, MBL:4, MASP1:3, MASP2:3,
        FB:3.5, FD:2.5, FH:3, FI:2.5, Prop:3, C5:4.5, C6:3, C7:3, C8:3, C9:3,
        C3b:5, C4b:4, C5b:4.5, MAC:6, C5a:3
    };
    const PROTEIN_COLOR = {
        C1q:'#88ccff', C1r:'#66aaee', C1s:'#66aaee',
        C4:'#aaddff',  C2:'#88bbff',  C3:'#4499ff',  C3b:'#ff8800',
        MBL:'#cc88ff', MASP1:'#bb77ee', MASP2:'#bb77ee',
        FB:'#ffcc44',  FD:'#ffaa22',  FH:'#44ffcc',  FI:'#22ddaa',
        Prop:'#ff8844', C5:'#ff4477', C5a:'#ff2255', C5b:'#cc2255',
        C6:'#ee4466', C7:'#dd3355', C8:'#cc2244', C9:'#bb1133', MAC:'#ff0000',
        C4b:'#99ccff'
    };

    // ---- Opsonisierungs-Marker auf Bakterium ----
    class C3bMarker {
        constructor(target) {
            this.target = target;
            this.timer = 900 + Math.random() * 300; // hält ~15-20s
            this.active = true;
            this.angle = Math.random() * Math.PI * 2;
        }
        update() {
            this.timer--;
            if (this.timer <= 0 || !this.target || this.target.health <= 0) this.active = false;
        }
        draw(ctx) {
            if (!this.active || !this.target) return;
            ctx.save();
            ctx.globalAlpha = 0.8;
            const r = (this.target.radius || 8) + 3;
            ctx.beginPath();
            ctx.arc(
                this.target.x + Math.cos(this.angle) * r,
                this.target.y + Math.sin(this.angle) * r,
                3, 0, Math.PI * 2
            );
            ctx.fillStyle = '#ff8800'; ctx.fill();
            ctx.restore();
        }
    }

    // ---- MAC-Angriff (Membrane Attack Complex) ----
    class MACAttack {
        constructor(target) {
            this.target = target;
            this.timer = 0;
            this.active = true;
            this.phase = 'assembly'; // assembly → pore → lysis
            this.poreCount = 0;
        }
        update() {
            if (!this.target || this.target.health <= 0) { this.active = false; return; }

            const gs2 = typeof GameState !== 'undefined' ? GameState : {};
            const resist = gs2.totalComplementResist ? gs2.totalComplementResist() : 0;

            this.timer++;
            if (this.phase === 'assembly' && this.timer > 120) {
                this.phase = 'pore';
                this.poreCount = Math.floor(3 + Math.random() * 4);
            }
            if (this.phase === 'pore') {
                const dmg = 0.8 * (1 - resist);
                this.target.health -= dmg;
                if (this.timer > 300) this.phase = 'lysis';
            }
            if (this.phase === 'lysis') {
                const dmg = 3.5 * (1 - resist);
                this.target.health -= dmg;
                if (this.target.health <= 0) this.active = false;
            }
        }
        draw(ctx) {
            if (!this.active || !this.target) return;
            const t = this.target;
            ctx.save();
            const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
            ctx.globalAlpha = 0.35 + pulse * 0.3;
            ctx.beginPath(); ctx.arc(t.x, t.y, t.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 3; ctx.stroke();
            if (this.phase !== 'assembly') {
                ctx.fillStyle = '#ff0000';
                for (let i = 0; i < this.poreCount; i++) {
                    const a = (i / this.poreCount) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(t.x + Math.cos(a) * t.radius, t.y + Math.sin(a) * t.radius, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    // ============================================================
    // Haupt-System
    // ============================================================
    return {
        proteins: [],          // aktive Protein-Partikel
        c3bMarkers: [],        // opsonisierte Targets
        macAttacks: [],        // laufende MAC-Angriffe
        c5aConcentration: 0,   // C5a-Spiegel → Chemotaxis-Signal für Phagozyten
        tickCounter: 0,
        intensity: 0,          // 0..1 Aktivierungsstärke (wächst mit Infektion)

        // Aktivierung durch detektierte Infektion
        activate(level) {
            this.intensity = Math.min(1, this.intensity + level);
        },

        update(unitCtx) {
            this.tickCounter++;
            const gs = (typeof GameState !== 'undefined') ? GameState : {};
            const cr = gs.complementResist || {};
            const capsule   = cr.capsule    || 0;   // 0..1: reduziert C3b-Bindung
            const factorH   = (cr.factorH   || 0) > 0.3;  // Faktor-H: bricht C3b ab
            const sialic    = (cr.sialicAcid|| 0) > 0.3;  // Sialinsäure: hemmt klass. Weg
            const c5aPept   = (cr.c5aPeptidase || 0) > 0.3; // C5a-Peptidase
            const macResist = (cr.macResist  || 0) > 0.3; // MAC-Resistenz
            const resist    = gs.totalComplementResist ? gs.totalComplementResist() : 0;

            // Proteine aus Immunbasen in die Welt emittieren
            if (this.tickCounter % 15 === 0 && this.intensity > 0) {
                this._emitProteins(unitCtx);
            }

            // Protein-Update
            for (const p of this.proteins) p.update();
            this.proteins = this.proteins.filter(p => p.active);

            // C3b-Marker Update
            for (const m of this.c3bMarkers) m.update();
            this.c3bMarkers = this.c3bMarkers.filter(m => m.active);

            // MAC-Update
            for (const mac of this.macAttacks) mac.update();
            this.macAttacks = this.macAttacks.filter(m => m.active);

            // C5a-Spiegel abbauen (Peptidase-Evasion)
            const c5aDrain = c5aPept ? 0.008 : 0.003;
            this.c5aConcentration = Math.max(0, this.c5aConcentration - c5aDrain);

            // Kaskade alle ~3s prüfen
            if (this.tickCounter % 180 !== 0) return;

            const allBacteria = [...(unitCtx.units || [])];
            if (unitCtx.player) allBacteria.push(unitCtx.player);

            for (const b of allBacteria) {
                if (!b || b.health <= 0) continue;

                // ─── Klassischer Weg ─────────────────────────────
                // Ausgelöst durch IgG/IgM auf Bakterienoberfläche (simuliert nach ~60s)
                const classicalBlocked = sialic && Math.random() < 0.6;

                // ─── Lektin-Weg ──────────────────────────────────
                // MBL bindet Mannose auf Kapsel, MASP1/2 spalten C4/C2
                const lectinBlocked = capsule > 1 && Math.random() < 0.5;

                // ─── Alternativer Weg ─────────────────────────────
                // C3(H2O) + FB + FD = C3bBb → ständig aktiv (Tick-over)
                // Kapsel hemmt direkte C3b-Bindung
                const altPathChance = 0.4 * this.intensity * (1 - capsule * 0.3);

                let c3bDeposited = false;

                if (!classicalBlocked && Math.random() < 0.55 * this.intensity) {
                    c3bDeposited = true; // klassischer Weg aktiv
                }
                if (!lectinBlocked && Math.random() < 0.45 * this.intensity) {
                    c3bDeposited = true; // Lektin-Weg aktiv
                }
                if (Math.random() < altPathChance) {
                    c3bDeposited = true; // alternativer Weg aktiv
                }

                // Faktor-H-Mimikry: FH bindet C3b → iC3b (nicht opsonsierend)
                if (factorH && Math.random() < 0.7) c3bDeposited = false;

                if (c3bDeposited) {
                    // C3b auf Bakterium markieren
                    if (!this.c3bMarkers.find(m => m.target === b)) {
                        this.c3bMarkers.push(new C3bMarker(b));
                        b.c3bMarked = true;
                        this._spawnParticle(b.x, b.y, 'C3b');
                        this.c5aConcentration = Math.min(1, this.c5aConcentration + 0.08);
                        if (c5aPept) this.c5aConcentration -= 0.05; // C5a-Peptidase spaltet C5a
                    }

                    // ─── Terminaler Weg → MAC ─────────────────────
                    const alreadyMAC = this.macAttacks.find(m => m.target === b);
                    if (!alreadyMAC) {
                        const macChance = macResist ? 0.08 : 0.4;
                        if (Math.random() < macChance * this.intensity) {
                            this.macAttacks.push(new MACAttack(b));
                            this._spawnParticle(b.x, b.y, 'MAC');
                        }
                    }
                }

                // C3b-Flag bereinigen wenn kein Marker mehr
                if (!this.c3bMarkers.find(m => m.target === b)) b.c3bMarked = false;
            }

            // Intensität langsam steigern proportional zu Bakterienzahl
            const bCount = allBacteria.length;
            this.intensity = Math.min(1, this.intensity + bCount * 0.000005);
        },

        _emitProteins(unitCtx) {
            if (!unitCtx.immuneBases || unitCtx.immuneBases.length === 0) return;
            const types = ['C1q','C3','C3','MBL','FB','FD','FH','C5','Prop'];
            for (const ib of unitCtx.immuneBases) {
                const type = types[Math.floor(Math.random() * types.length)];
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 300;
                this.proteins.push(new Protein(
                    ib.x + Math.cos(angle) * dist,
                    ib.y + Math.sin(angle) * dist,
                    type
                ));
            }
        },

        _spawnParticle(x, y, type) {
            for (let i = 0; i < 3; i++) {
                this.proteins.push(new Protein(
                    x + (Math.random() - 0.5) * 20,
                    y + (Math.random() - 0.5) * 20,
                    type
                ));
            }
        },

        draw(ctx) {
            for (const p of this.proteins) p.draw(ctx);
            for (const m of this.c3bMarkers) m.draw(ctx);
            for (const mac of this.macAttacks) mac.draw(ctx);

            // C5a-Gradient andeuten (Chemotaxis-Signal)
            if (this.c5aConcentration > 0.2) {
                ctx.save();
                ctx.globalAlpha = this.c5aConcentration * 0.04;
                ctx.fillStyle = '#ff2255';
                ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
                ctx.restore();
            }
        }
    };
})();

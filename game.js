"use strict";
// Pentagram Stack — a Grin Reaper stacking game, in TypeScript.
// The Devil is building a tower out of pentagram slabs. He has opinions about symmetry.
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const W = 480, H = 560, BH = 30, FLOOR = H - 60;
let soundOn = true;
let audioCtx = null;
function tone(f, d = 0.07, type = "square", v = 0.035) {
    if (!soundOn)
        return;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.value = v;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d);
        o.stop(audioCtx.currentTime + d);
    }
    catch (e) { /* silence is also gothic */ }
}
function say(t) {
    const el = document.getElementById("omenText");
    if (el)
        el.textContent = t;
}
const RAVEN = {
    start: ["The Devil builds upward. Zoning laws were not consulted.", "Stack them straight. Hell has a homeowners' association."],
    land: ["Acceptable. The Devil pretends not to be pleased.", "It holds. For now. So does the mortgage."],
    trim: ["A slice falls. Somewhere below, a goblin catches a bonus.", "The Devil calls that 'rustic'. It is not rustic."],
    miss: ["The slab misses the tower entirely. The Raven writes it down.", "A heart cracks. The Devil bills you for the slab."],
    over: ["Three hearts down. The tower remains — a monument to almost.", "The Devil shrugs. He has eternity; you had three hearts."]
};
function ravenSay(kind) {
    const lines = RAVEN[kind];
    if (lines)
        say(lines[Math.floor(Math.random() * lines.length)]);
}
function overlay(t, s) {
    ctx.fillStyle = "rgba(10,7,14,.8)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f7f1e6";
    ctx.font = "44px CloisterBlack,serif";
    ctx.textAlign = "center";
    ctx.fillText(t, W / 2, 250);
    ctx.font = "15px 'IM Fell English',serif";
    ctx.fillStyle = "#f2c4ce";
    ctx.fillText(s, W / 2, 284);
    ctx.textAlign = "left";
}
const ICONS = ["⭐", "🕯️", "💀", "🌹", "🦇"];
let tower = [];
let mover = null;
let falling = null;
let score = 0, hearts = 3, level = 1;
let best = +(localStorage.getItem("pentagramstack-best") || 0);
let state = "ready";
let camY = 0;
function topY() { return tower.length ? tower[tower.length - 1].y : FLOOR; }
function spawnMover() {
    const top = tower[tower.length - 1];
    mover = {
        x: 0, w: top.w, dir: 1,
        speed: 2.2 + Math.min(3.4, (level - 1) * 0.45),
        icon: ICONS[(tower.length - 1) % ICONS.length]
    };
}
function reset() {
    tower = [{ x: 140, y: FLOOR, w: 200, icon: "⭐" }];
    score = 0;
    hearts = 3;
    level = 1;
    camY = 0;
    falling = null;
    spawnMover();
    updateHUD();
}
function updateHUD() {
    document.getElementById("score").textContent = String(score);
    document.getElementById("hearts").textContent = "❤️".repeat(Math.max(0, hearts));
    document.getElementById("height").textContent = String(Math.max(0, tower.length - 1));
    document.getElementById("best").textContent = String(Math.max(best, score));
}
function drop() {
    if (state === "ready" || state === "over") {
        startGame();
        return;
    }
    if (state !== "run" || !mover || falling)
        return;
    falling = { x: mover.x, y: topY() - BH * 3, w: mover.w, icon: mover.icon, vy: 9 };
    mover = null;
    tone(240, 0.06);
}
function landBlock() {
    if (!falling)
        return;
    const top = tower[tower.length - 1];
    const left = Math.max(falling.x, top.x);
    const right = Math.min(falling.x + falling.w, top.x + top.w);
    const overlap = right - left;
    if (overlap <= 0) {
        hearts--;
        tone(120, 0.3, "sawtooth", 0.05);
        ravenSay("miss");
        falling = null;
        updateHUD();
        if (hearts <= 0) {
            gameOver();
            return;
        }
        spawnMover();
        return;
    }
    const wasTrimmed = overlap < falling.w - 2;
    tower.push({ x: left, y: top.y - BH, w: overlap, icon: falling.icon });
    score += wasTrimmed ? 10 : 25;
    tone(wasTrimmed ? 420 : 660, 0.08, "sine", 0.05);
    ravenSay(wasTrimmed ? "trim" : "land");
    falling = null;
    if ((tower.length - 1) % 6 === 0)
        level++;
    const targetCam = Math.max(0, (FLOOR - (top.y - BH)) - (H - 220));
    camY = targetCam;
    updateHUD();
    if (overlap < 26) {
        gameOver();
        return;
    } // tower too skinny to continue — the Devil is merciful, briefly
    spawnMover();
}
function gameOver() {
    state = "over";
    best = Math.max(best, score);
    localStorage.setItem("pentagramstack-best", String(best));
    ravenSay("over");
    updateHUD();
}
function step() {
    if (state !== "run")
        return;
    if (mover) {
        mover.x += mover.dir * mover.speed;
        if (mover.x <= 0) {
            mover.x = 0;
            mover.dir = 1;
        }
        if (mover.x + mover.w >= W) {
            mover.x = W - mover.w;
            mover.dir = -1;
        }
    }
    if (falling) {
        falling.y += falling.vy;
        if (falling.y >= topY() - BH) {
            falling.y = topY() - BH;
            landBlock();
        }
    }
}
function drawBlock(b, yOff) {
    ctx.fillStyle = "#2b1e3f";
    ctx.fillRect(b.x, b.y + yOff, b.w, BH - 3);
    ctx.strokeStyle = "#b49a5b";
    ctx.strokeRect(b.x, b.y + yOff, b.w, BH - 3);
    ctx.font = "19px serif";
    ctx.textAlign = "center";
    ctx.fillText(b.icon, b.x + b.w / 2, b.y + yOff + 21);
    ctx.textAlign = "left";
}
function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#120e1f");
    g.addColorStop(1, "#251739");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f5edd6";
    ctx.beginPath();
    ctx.arc(414, 52, 22, 0, 7);
    ctx.fill();
    ctx.font = "30px serif";
    ctx.fillText("😈", 24, 52);
    // pentagram guide
    ctx.strokeStyle = "rgba(180,154,91,.25)";
    ctx.beginPath();
    ctx.arc(W / 2, 120, 44, 0, 7);
    ctx.stroke();
    for (const b of tower)
        drawBlock(b, camY);
    if (falling)
        drawBlock({ x: falling.x, y: falling.y, w: falling.w, icon: falling.icon }, camY);
    if (mover && state === "run") {
        const y = topY() - BH * 3 + camY;
        ctx.fillStyle = "#37264f";
        ctx.fillRect(mover.x, y, mover.w, BH - 3);
        ctx.strokeStyle = "#ffd98a";
        ctx.strokeRect(mover.x, y, mover.w, BH - 3);
        ctx.font = "19px serif";
        ctx.textAlign = "center";
        ctx.fillText(mover.icon, mover.x + mover.w / 2, y + 21);
        ctx.textAlign = "left";
        ctx.strokeStyle = "rgba(255,217,138,.35)";
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(mover.x, y + BH);
        ctx.lineTo(mover.x, topY() + camY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mover.x + mover.w, y + BH);
        ctx.lineTo(mover.x + mover.w, topY() + camY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (state === "ready")
        overlay("Pentagram Stack", "Click or Space to start — the Devil is watching the angles.");
    if (state === "over")
        overlay("The Tower Rests", "Score " + score + " · Best " + best + " — Space to build again.");
    if (state === "pause")
        overlay("Paused", "The Devil taps his hoof. Politely. Menacingly.");
}
function loop() { step(); draw(); requestAnimationFrame(loop); }
function startGame() {
    if (state === "run") {
        state = "pause";
        return;
    }
    if (state === "ready" || state === "over") {
        reset();
        ravenSay("start");
    }
    state = "run";
}
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("soundBtn").addEventListener("click", function () {
    soundOn = !soundOn;
    this.textContent = soundOn ? "🔊 Sound: On" : "🔇 Sound: Off";
});
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        if (state === "run")
            drop();
        else
            startGame();
    }
});
cv.addEventListener("pointerdown", () => { if (state === "run")
    drop();
else
    startGame(); });
reset();
loop();

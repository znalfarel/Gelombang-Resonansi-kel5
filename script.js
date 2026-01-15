/* RESOLAB ULTRA v3.2 - Fully Responsive
   Fixes: Canvas Resolution Scaling on Mobile/Tablet
*/

let audioCtx, analyser;
let isAudioReady = false;

// Constants
const MU_STRING = 0.002;
const V_SOUND = 343;
const RHO_MEMBRANE = 0.25;

let simSpeed = 1.0;
let guitarState = { tension: 100, length: 65, freq: 0, amplitude: 0, phase: 0 };
let pipeState = { length: 20, freq: 0, amplitude: 0, phase: 0 };
let drumState = { diameter: 30, tension: 2000, freq: 0, amplitude: 0, phase: 0 };

document.addEventListener('DOMContentLoaded', () => {
    // Unlock Audio
    document.addEventListener('click', initAudioEngine, { once: true });
    document.addEventListener('touchstart', initAudioEngine, { once: true });

    // Inputs
    setupGuitar();
    setupPipe();
    setupDrum();

    // Toggle
    document.getElementById('slow-mo-check').addEventListener('change', (e) => {
        simSpeed = e.target.checked ? 0.05 : 1.0;
    });

    // Start Loop
    requestAnimationFrame(animateLoop);
});

// --- RESPONSIVE CANVAS HELPER ---
// Fungsi ini memastikan resolusi internal canvas cocok dengan ukuran CSS-nya
function resizeCanvas(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    // Hanya set ulang jika ukuran berubah (untuk performa)
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true; // Ukuran berubah
    }
    return false;
}

function initAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // Lebih rendah sedikit agar bar lebih lebar di HP
        analyser.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isAudioReady = true;
    
    const statusBadge = document.getElementById('audio-status');
    if(statusBadge) {
        statusBadge.classList.add('active');
        const dot = statusBadge.querySelector('.status-dot');
        const text = statusBadge.querySelector('.status-text');
        if(text) text.innerText = 'Online'; 
        // Dot warna berubah via CSS
    }
}

// ... SETUP FUNCTIONS (Sama seperti v3.0) ...
function setupGuitar() {
    const tSlider = document.getElementById('slider-tension');
    const lSlider = document.getElementById('slider-length');
    const update = () => {
        guitarState.tension = parseFloat(tSlider.value);
        guitarState.length = parseFloat(lSlider.value);
        document.getElementById('disp-tension').innerText = guitarState.tension + " N";
        document.getElementById('disp-length').innerText = guitarState.length + " cm";
        const L = guitarState.length / 100;
        guitarState.freq = (1 / (2 * L)) * Math.sqrt(guitarState.tension / MU_STRING);
        document.getElementById('freq-guitar').innerText = guitarState.freq.toFixed(1);
    };
    tSlider.addEventListener('input', update);
    lSlider.addEventListener('input', update);
    document.getElementById('play-guitar').addEventListener('click', () => playComplexTone('guitar'));
    update();
}

function setupPipe() {
    const lSlider = document.getElementById('slider-pipe-len');
    const update = () => {
        pipeState.length = parseFloat(lSlider.value);
        document.getElementById('disp-pipe-len').innerText = pipeState.length + " cm";
        const L = pipeState.length / 100;
        pipeState.freq = V_SOUND / (4 * L);
        document.getElementById('freq-pipe').innerText = pipeState.freq.toFixed(1);
    };
    lSlider.addEventListener('input', update);
    document.getElementById('play-pipe').addEventListener('click', () => playComplexTone('pipe'));
    update();
}

function setupDrum() {
    const dSlider = document.getElementById('slider-drum-dia');
    const tSlider = document.getElementById('slider-drum-tension');
    const update = () => {
        drumState.diameter = parseFloat(dSlider.value);
        drumState.tension = parseFloat(tSlider.value);
        document.getElementById('disp-drum-dia').innerText = drumState.diameter + " cm";
        document.getElementById('disp-drum-tension').innerText = drumState.tension + " N/m";
        const D = drumState.diameter / 100;
        drumState.freq = (0.7655 / D) * Math.sqrt(drumState.tension / RHO_MEMBRANE);
        document.getElementById('freq-drum').innerText = drumState.freq.toFixed(1);
    };
    dSlider.addEventListener('input', update);
    tSlider.addEventListener('input', update);
    document.getElementById('play-drum').addEventListener('click', () => playComplexTone('drum'));
    update();
}

function playComplexTone(type) {
    if (!audioCtx) initAudioEngine();
    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    masterGain.connect(analyser);

    if (type === 'guitar') {
        createOscillator(guitarState.freq, 'triangle', 0.6, now, 1.5, masterGain);
        createOscillator(guitarState.freq * 2, 'sine', 0.3, now, 1.2, masterGain);
        guitarState.amplitude = 1;
    } else if (type === 'pipe') {
        createOscillator(pipeState.freq, 'sine', 0.6, now, 0.8, masterGain);
        createOscillator(pipeState.freq * 3, 'sine', 0.2, now, 0.6, masterGain);
        pipeState.amplitude = 1;
    } else if (type === 'drum') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(masterGain);
        osc.frequency.setValueAtTime(drumState.freq * 1.8, now);
        osc.frequency.exponentialRampToValueAtTime(drumState.freq, now + 0.15);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
        drumState.amplitude = 1;
    }
}

function createOscillator(freq, type, vol, time, dur, dest) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(dest);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time); osc.stop(time + dur);
}

// --- ANIMATION LOOP (UPDATED FOR RESPONSIVE) ---
function animateLoop() {
    
    // 1. SPECTRUM
    if (isAudioReady && analyser) {
        const sCanvas = document.getElementById('canvas-spectrum');
        resizeCanvas(sCanvas); // AUTO RESIZE
        const sCtx = sCanvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);
        const gradient = sCtx.createLinearGradient(0, sCanvas.height, 0, 0);
        gradient.addColorStop(0, '#22d3ee'); 
        gradient.addColorStop(1, '#c084fc'); 
        sCtx.fillStyle = gradient;

        const barWidth = sCanvas.width / bufferLength;
        let barX = 0;
        for(let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * sCanvas.height * 0.9; 
            sCtx.fillRect(barX, sCanvas.height - barHeight, barWidth + 1, barHeight);
            barX += barWidth;
        }
    }

    // 2. GUITAR
    const gCanvas = document.getElementById('canvas-guitar');
    if (gCanvas) {
        resizeCanvas(gCanvas); // AUTO RESIZE
        const ctx = gCanvas.getContext('2d');
        ctx.clearRect(0, 0, gCanvas.width, gCanvas.height);
        if (guitarState.amplitude > 0.001) guitarState.amplitude *= 0.96;
        guitarState.phase += guitarState.freq * 0.002 * simSpeed;
        
        ctx.beginPath();
        ctx.shadowBlur = 10; ctx.shadowColor = "#22d3ee"; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3;
        ctx.moveTo(0, gCanvas.height / 2);
        for (let x = 0; x < gCanvas.width; x++) {
            const nodeFactor = Math.sin((Math.PI * x) / gCanvas.width);
            const vibration = Math.sin(guitarState.phase) * guitarState.amplitude * (gCanvas.height * 0.2); // Responsive amplitude
            ctx.lineTo(x, (gCanvas.height / 2) + (vibration * nodeFactor));
        }
        ctx.stroke(); ctx.shadowBlur = 0;
    }

    // 3. PIPE
    const pCanvas = document.getElementById('canvas-pipe');
    if (pCanvas) {
        resizeCanvas(pCanvas); // AUTO RESIZE
        const ctx = pCanvas.getContext('2d');
        ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        if (pipeState.amplitude > 0.001) pipeState.amplitude *= 0.97;
        pipeState.phase += pipeState.freq * 0.005 * simSpeed;
        
        ctx.fillStyle = '#4ade80';
        const particleCount = Math.floor(pCanvas.width / 15); // Jumlah partikel menyesuaikan lebar layar
        for (let i = 0; i < particleCount; i++) {
            const xBase = (pCanvas.width / particleCount) * i;
            const displacementFactor = Math.sin((Math.PI * i) / (particleCount * 2)); 
            const moveX = Math.sin(pipeState.phase) * pipeState.amplitude * 25 * displacementFactor;
            ctx.beginPath();
            ctx.arc(xBase + moveX, pCanvas.height/2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 4. DRUM
    const dCanvas = document.getElementById('canvas-drum');
    if (dCanvas) {
        resizeCanvas(dCanvas); // AUTO RESIZE
        const ctx = dCanvas.getContext('2d');
        ctx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        if (drumState.amplitude > 0.001) drumState.amplitude *= 0.93;
        drumState.phase += drumState.freq * 0.005 * simSpeed;
        
        const cx = dCanvas.width / 2;
        const cy = dCanvas.height / 2;
        const minDim = Math.min(dCanvas.width, dCanvas.height);
        const baseRadius = minDim * 0.25; // Responsive Radius
        const pulse = Math.sin(drumState.phase) * drumState.amplitude * (minDim * 0.05);
        
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192, 132, 252, ${0.2 + (drumState.amplitude * 0.6)})`; ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 4; ctx.shadowBlur = 15; ctx.shadowColor = '#c084fc'; ctx.stroke(); ctx.shadowBlur = 0;
    }

    requestAnimationFrame(animateLoop);
}
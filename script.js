// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyC5yWUgfpwD3g6FU1VKhHiZW2Q1XBs_TWs",
    authDomain: "chat-79da1.firebaseapp.com",
    projectId: "chat-79da1",
    storageBucket: "chat-79da1.firebasestorage.app",
    messagingSenderId: "832541118241",
    appId: "1:832541118241:web:5d3c8e2650877106b13860",
    databaseURL: "https://chat-79da1-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database();

console.log("🔥 VERSÃO 2.0 - Firebase inicializado!");

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let guntoTimeout = null;

// GARTIC
let garticAtivo = false;
let palavraSecreta = "";
let desenhistaAtual = "";
let tempoRestante = 60;
let timerInterval = null;
let desenhando = false;
let ultimaX = 0, ultimaY = 0;
let corAtual = "#000000";
let tamanhoPincel = 3;
let canvasCtx = null;
let canvasElement = null;
let sessaoGartic = null;

// FORCA
let forcaAtivo = false;
let palavraForca = "";
let letrasDescobertas = [];
let tentativasForca = 6;
let letrasErradas = [];

// SNAKE
let snakeGame = {
    canvas: null,
    ctx: null,
    snake: [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}],
    direction: 'RIGHT',
    food: {x: 15, y: 10},
    score: 0,
    gameLoop: null,
    gameRunning: false
};

// PALAVRAS
const palavrasGartic = ["CASA", "CARRO", "CACHORRO", "GATO", "SOL", "LUA", "FLOR", "ARVORE", "PRAIA", "MONTANHA", "CHUVA", "FOGO", "ESTRELA", "BORBOLETA"];
const palavrasForca = ["JAVASCRIPT", "FIREBASE", "PROGRAMADOR", "COMPUTADOR", "INTERNET", "SERVIDOR", "HACKER", "MATRIX", "TERMINAL", "CODIGO"];

// DOM
const telaLogin = document.getElementById('loginScreen');
const telaChat = document.getElementById('chatMain');
const loginBtn = document.getElementById('loginBtn');
const loginInput = document.getElementById('loginUsername');
const userNameSpan = document.getElementById('sidebarName');
const userLevelSpan = document.getElementById('sidebarLevel');
const userAvatar = document.getElementById('sidebarAvatar');
const onlineCountSpan = document.getElementById('onlineCount');
const messagesDiv = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const snakeModal = document.getElementById('snakeModal');
const forcaModal = document.getElementById('forcaModal');
const garticPanel = document.getElementById('garticPanel');
const openGarticBtn = document.getElementById('openGarticBtn');
const openForcaBtn = document.getElementById('openForcaBtn');
const openSnakeBtn = document.getElementById('openSnakeBtn');
const closeGarticPanel = document.getElementById('closeGarticPanel');

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function getHora() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function enviarMsgSistema(texto) {
    await db.collection('mensagens').add({
        usuario: '💜 SISTEMA',
        texto: texto,
        timestamp: new Date(),
        hora: getHora(),
        isSystem: true
    });
}

// ============================================
// GUNTO
// ============================================
function mostrarGunto(mensagem, autor) {
    const alerta = document.getElementById('guntoAlert');
    if (!alerta) return;
    if (guntoTimeout) clearTimeout(guntoTimeout);
    alerta.innerHTML = `🔫 ${autor} DISPAROU!<br>💜 ${mensagem} 💜`;
    alerta.style.display = 'flex';
    guntoTimeout = setTimeout(() => alerta.style.display = 'none', 4000);
}

async function enviarGunto(mensagem, autor) {
    const texto = mensagem.substring(6).trim();
    if (!texto) {
        await enviarMsgSistema("Use: /gunto [mensagem]");
        return true;
    }
    mostrarGunto(texto, autor);
    await db.collection('alertas').add({ tipo: 'gunto', mensagem: texto, autor: autor, timestamp: new Date() });
    await enviarMsgSistema(`🔫 ${autor} usou GUNTO: "${texto}"`);
    return true;
}

db.collection('alertas').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            const alerta = change.doc.data();
            if (alerta.autor !== usuarioAtual) mostrarGunto(alerta.mensagem, alerta.autor);
            change.doc.ref.delete();
        }
    });
});

// ============================================
// COMANDOS
// ============================================
async function kickUser(mensagem, autor) {
    const partes = mensagem.split(' ');
    const alvo = partes[1]?.replace('@', '');
    if (!alvo) { await enviarMsgSistema("Use: /kick @usuario"); return true; }
    if (autor === alvo) { await enviarMsgSistema(`${autor} não pode se kickar!`); return true; }
    await enviarMsgSistema(`💀 ${alvo} foi EXPULSO do chat por ${autor}! 💀`);
    if (alvo === usuarioAtual) setTimeout(() => { localStorage.removeItem('chatUsername'); location.reload(); }, 2000);
    return true;
}

async function limparChat(autor) {
    const msgs = await db.collection('mensagens').get();
    const batch = db.batch();
    msgs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    await enviarMsgSistema(`🗑️ Chat limpo por ${autor}`);
}

// ============================================
// JOGO DA FORCA
// ============================================
async function iniciarForca() {
    forcaAtivo = true;
    palavraForca = palavrasForca[Math.floor(Math.random() * palavrasForca.length)].toUpperCase();
    letrasDescobertas = [];
    tentativasForca = 6;
    letrasErradas = [];
    for (let i = 0; i < palavraForca.length; i++) letrasDescobertas.push('_');
    atualizarModalForca();
    forcaModal.style.display = 'flex';
    await enviarMsgSistema(`🪢 JOGO DA FORCA! Palavra de ${palavraForca.length} letras!`);
}

function atualizarModalForca() {
    document.getElementById('forcaWord').textContent = letrasDescobertas.join(' ');
    document.getElementById('forcaAttempts').textContent = tentativasForca;
    document.getElementById('forcaDrawing').textContent = getForcaDesenho();
    document.getElementById('forcaLetters').innerHTML = letrasErradas.map(l => `<span class="letter-badge">${l}</span>`).join('');
    if (!letrasDescobertas.includes('_')) document.getElementById('forcaStatus').innerHTML = '<span style="color:#4caf50">🎉 VOCÊ GANHOU! 🎉</span>';
    else if (tentativasForca <= 0) document.getElementById('forcaStatus').innerHTML = `<span style="color:#ff0000">💀 FIM! Palavra: ${palavraForca} 💀</span>`;
}

function getForcaDesenho() {
    const desenhos = [
        "  +---+\n      |\n      |\n      |\n      |\n      |\n=========",
        "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
        "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
        "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
        "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
        "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
        "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
        "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n========="
    ];
    return desenhos[6 - tentativasForca];
}

async function palpitarForca(letra) {
    if (!forcaAtivo) return;
    letra = letra.toUpperCase();
    if (letra.length !== 1 || !/[A-Z]/.test(letra)) return;
    if (letrasDescobertas.includes(letra) || letrasErradas.includes(letra)) return;
    
    if (palavraForca.includes(letra)) {
        for (let i = 0; i < palavraForca.length; i++) if (palavraForca[i] === letra) letrasDescobertas[i] = letra;
        await enviarMsgSistema(`✅ ${usuarioAtual} acertou a letra "${letra}"!`);
        atualizarModalForca();
        if (!letrasDescobertas.includes('_')) {
            await enviarMsgSistema(`🎉 ${usuarioAtual} ACERTOU "${palavraForca}"! 🎉`);
            forcaAtivo = false;
        }
    } else {
        tentativasForca--;
        letrasErradas.push(letra);
        await enviarMsgSistema(`❌ ${usuarioAtual} errou a letra "${letra}"!`);
        atualizarModalForca();
        if (tentativasForca <= 0) {
            await enviarMsgSistema(`💀 FIM! A palavra era "${palavraForca}"! 💀`);
            forcaAtivo = false;
        }
    }
}

// ============================================
// JOGO GARTIC (SINCRONIZADO)
// ============================================
async function iniciarGartic() {
    if (garticAtivo) {
        await enviarMsgSistema(`🎨 ${desenhistaAtual} já está desenhando!`);
        abrirGarticPanel(false);
        return;
    }
    
    garticAtivo = true;
    palavraSecreta = palavrasGartic[Math.floor(Math.random() * palavrasGartic.length)];
    desenhistaAtual = usuarioAtual;
    tempoRestante = 60;
    sessaoGartic = Date.now().toString();
    
    await rtdb.ref('gartic/' + sessaoGartic).remove();
    await db.collection('garticEstado').doc('atual').set({
        ativo: true, desenhista: desenhistaAtual, sessao: sessaoGartic, palavra: palavraSecreta
    });
    
    await enviarMsgSistema(`🎨 GARTIC! ${desenhistaAtual} é o DESENHISTA!`);
    abrirGarticPanel(true);
    iniciarTimerGartic();
}

db.collection('garticEstado').doc('atual').onSnapshot(async (doc) => {
    if (doc.exists && doc.data().ativo && !garticAtivo && doc.data().desenhista !== usuarioAtual) {
        const data = doc.data();
        garticAtivo = true;
        palavraSecreta = data.palavra;
        desenhistaAtual = data.desenhista;
        sessaoGartic = data.sessao;
        tempoRestante = 60;
        await enviarMsgSistema(`🎨 ${desenhistaAtual} iniciou o Gartic! Tente adivinhar!`);
        abrirGarticPanel(false);
        iniciarTimerGartic();
    } else if ((!doc.exists || !doc.data().ativo) && garticAtivo) {
        fecharGartic();
    }
});

function abrirGarticPanel(podeDesenhar) {
    garticPanel.classList.add('open');
    canvasElement = document.getElementById('garticCanvas');
    if (canvasElement) {
        canvasCtx = canvasElement.getContext('2d');
        canvasElement.width = 400;
        canvasElement.height = 300;
        canvasCtx.fillStyle = 'white';
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.strokeStyle = corAtual;
        canvasCtx.lineWidth = tamanhoPincel;
    }
    
    const isDrawer = (usuarioAtual === desenhistaAtual);
    const wordHint = document.getElementById('garticWordHint');
    const drawerSpan = document.getElementById('currentDrawer');
    const statusSpan = document.getElementById('garticStatusText');
    
    if (isDrawer && podeDesenhar) {
        if (wordHint) wordHint.innerHTML = `🎨 Desenhando: <strong>${palavraSecreta}</strong>`;
        if (drawerSpan) drawerSpan.innerHTML = `${desenhistaAtual} (Você)`;
        if (statusSpan) statusSpan.innerHTML = "🎨 DESENHE A PALAVRA!";
        if (canvasElement) canvasElement.style.cursor = 'crosshair';
        configurarDesenho();
    } else {
        if (wordHint) wordHint.innerHTML = "❓ ADIVINHE O DESENHO! ❓";
        if (drawerSpan) drawerSpan.innerHTML = `${desenhistaAtual}`;
        if (statusSpan) statusSpan.innerHTML = `💜 Aguardando ${desenhistaAtual} desenhar...`;
        if (canvasElement) canvasElement.style.cursor = 'not-allowed';
        escutarDesenho();
    }
    document.getElementById('guessHistoryList').innerHTML = '';
}

function configurarDesenho() {
    if (!canvasElement) return;
    function getCoords(e) {
        const rect = canvasElement.getBoundingClientRect();
        const scaleX = canvasElement.width / rect.width;
        const scaleY = canvasElement.height / rect.height;
        let x, y;
        if (e.touches) { x = (e.touches[0].clientX - rect.left) * scaleX; y = (e.touches[0].clientY - rect.top) * scaleY; }
        else { x = (e.clientX - rect.left) * scaleX; y = (e.clientY - rect.top) * scaleY; }
        return { x: Math.max(0, Math.min(canvasElement.width, x)), y: Math.max(0, Math.min(canvasElement.height, y)) };
    }
    function startDrawing(e) {
        if (usuarioAtual !== desenhistaAtual) { enviarMsgSistema(`❌ Só ${desenhistaAtual} desenha!`); return; }
        e.preventDefault();
        desenhando = true;
        const { x, y } = getCoords(e);
        ultimaX = x; ultimaY = y;
        canvasCtx.beginPath();
        canvasCtx.moveTo(x, y);
        canvasCtx.lineTo(x, y);
        canvasCtx.stroke();
    }
    function draw(e) {
        if (!desenhando || usuarioAtual !== desenhistaAtual) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        canvasCtx.beginPath();
        canvasCtx.moveTo(ultimaX, ultimaY);
        canvasCtx.lineTo(x, y);
        canvasCtx.stroke();
        rtdb.ref('gartic/' + sessaoGartic).push({ x1: ultimaX, y1: ultimaY, x2: x, y2: y, cor: corAtual, tamanho: tamanhoPincel });
        ultimaX = x; ultimaY = y;
    }
    function stopDrawing(e) { desenhando = false; e.preventDefault(); }
    canvasElement.removeEventListener('mousedown', startDrawing);
    canvasElement.removeEventListener('mousemove', draw);
    canvasElement.removeEventListener('mouseup', stopDrawing);
    canvasElement.addEventListener('mousedown', startDrawing);
    canvasElement.addEventListener('mousemove', draw);
    canvasElement.addEventListener('mouseup', stopDrawing);
}

function escutarDesenho() {
    rtdb.ref('gartic/' + sessaoGartic).off();
    rtdb.ref('gartic/' + sessaoGartic).on('child_added', (snapshot) => {
        const t = snapshot.val();
        if (canvasCtx && canvasElement && usuarioAtual !== desenhistaAtual) {
            canvasCtx.beginPath();
            canvasCtx.strokeStyle = t.cor;
            canvasCtx.lineWidth = t.tamanho;
            canvasCtx.moveTo(t.x1, t.y1);
            canvasCtx.lineTo(t.x2, t.y2);
            canvasCtx.stroke();
        }
    });
}

function iniciarTimerGartic() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(async () => {
        if (!garticAtivo) { clearInterval(timerInterval); return; }
        tempoRestante--;
        const timerDisplay = document.getElementById('garticStatusText');
        if (timerDisplay) timerDisplay.innerHTML = tempoRestante <= 10 ? `⏰ ${tempoRestante}s!` : `⏱️ ${tempoRestante}s`;
        if (tempoRestante <= 0) {
            clearInterval(timerInterval);
            await enviarMsgSistema(`⏰ TEMPO ESGOTADO! Palavra: "${palavraSecreta}"`);
            fecharGartic();
        }
    }, 1000);
}

async function palpiteGartic(palpite) {
    if (!garticAtivo) return;
    if (usuarioAtual === desenhistaAtual) { await enviarMsgSistema(`Você é o DESENHISTA!`); return; }
    if (palpite.toUpperCase().trim() === palavraSecreta) {
        await enviarMsgSistema(`🎉🎉🎉 ${usuarioAtual} ACERTOU! "${palavraSecreta}"! 🎉🎉🎉`);
        fecharGartic();
    } else {
        await enviarMsgSistema(`❌ ${usuarioAtual}: "${palpite}" - ERRADO!`);
        const history = document.getElementById('guessHistoryList');
        if (history) {
            const item = document.createElement('div');
            item.className = 'guess-item';
            item.innerHTML = `<span style="color:#a78bfa">${usuarioAtual}</span>: "${palpite}" ❌`;
            history.appendChild(item);
        }
    }
}

function fecharGartic() {
    garticAtivo = false;
    if (timerInterval) clearInterval(timerInterval);
    garticPanel.classList.remove('open');
    if (sessaoGartic) rtdb.ref('gartic/' + sessaoGartic).remove();
    db.collection('garticEstado').doc('atual').delete();
    sessaoGartic = null;
}

// ============================================
// JOGO DA COBRA
// ============================================
function iniciarSnake() {
    if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    snakeGame.canvas = document.getElementById('snakeCanvas');
    if (!snakeGame.canvas) return;
    snakeGame.ctx = snakeGame.canvas.getContext('2d');
    snakeGame.canvas.width = 400;
    snakeGame.canvas.height = 400;
    snakeGame.snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
    snakeGame.direction = 'RIGHT';
    snakeGame.score = 0;
    snakeGame.gameRunning = true;
    document.getElementById('snakeScore').innerText = '0';
    gerarComida();
    desenharSnake();
    snakeGame.gameLoop = setInterval(atualizarSnake, 100);
    snakeModal.style.display = 'flex';
}

function gerarComida() {
    if (!snakeGame.canvas) return;
    const maxX = Math.floor(snakeGame.canvas.width / 20) - 1;
    const maxY = Math.floor(snakeGame.canvas.height / 20) - 1;
    let nova;
    do { nova = { x: Math.floor(Math.random() * maxX), y: Math.floor(Math.random() * maxY) }; }
    while (snakeGame.snake.some(s => s.x === nova.x && s.y === nova.y));
    snakeGame.food = nova;
}

function desenharSnake() {
    if (!snakeGame.ctx || !snakeGame.canvas) return;
    const ctx = snakeGame.ctx;
    const canvas = snakeGame.canvas;
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(snakeGame.food.x * 20, snakeGame.food.y * 20, 18, 18);
    snakeGame.snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#a78bfa' : '#7c3aed';
        ctx.fillRect(s.x * 20, s.y * 20, 18, 18);
    });
}

function atualizarSnake() {
    if (!snakeGame.gameRunning) return;
    let newHead = { ...snakeGame.snake[0] };
    switch (snakeGame.direction) {
        case 'RIGHT': newHead.x += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
    }
    const maxX = Math.floor(snakeGame.canvas.width / 20);
    const maxY = Math.floor(snakeGame.canvas.height / 20);
    if (newHead.x < 0 || newHead.x >= maxX || newHead.y < 0 || newHead.y >= maxY) { gameOverSnake(); return; }
    if (snakeGame.snake.some(s => s.x === newHead.x && s.y === newHead.y)) { gameOverSnake(); return; }
    snakeGame.snake.unshift(newHead);
    if (newHead.x === snakeGame.food.x && newHead.y === snakeGame.food.y) {
        snakeGame.score += 10;
        document.getElementById('snakeScore').innerText = snakeGame.score;
        gerarComida();
    } else { snakeGame.snake.pop(); }
    desenharSnake();
}

function gameOverSnake() {
    snakeGame.gameRunning = false;
    if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    enviarMsgSistema(`🐍 ${usuarioAtual} fez ${snakeGame.score} pontos!`);
    if (snakeGame.ctx) {
        snakeGame.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        snakeGame.ctx.fillRect(0, 0, snakeGame.canvas.width, snakeGame.canvas.height);
        snakeGame.ctx.fillStyle = 'white';
        snakeGame.ctx.font = '20px Arial';
        snakeGame.ctx.textAlign = 'center';
        snakeGame.ctx.fillText('GAME OVER', 200, 200);
        snakeGame.ctx.fillText(`Pontos: ${snakeGame.score}`, 200, 240);
    }
}

function handleSnakeKey(e) {
    const key = e.key;
    if (key === 'ArrowRight' || key === 'd') { if (snakeGame.direction !== 'LEFT') snakeGame.direction = 'RIGHT'; }
    else if (key === 'ArrowLeft' || key === 'a') { if (snakeGame.direction !== 'RIGHT') snakeGame.direction = 'LEFT'; }
    else if (key === 'ArrowUp' || key === 'w') { if (snakeGame.direction !== 'DOWN') snakeGame.direction = 'UP'; }
    else if (key === 'ArrowDown' || key === 's') { if (snakeGame.direction !== 'UP') snakeGame.direction = 'DOWN'; }
}

// ============================================
// MENSAGENS DO CHAT
// ============================================
async function enviarMensagem(texto) {
    if (!texto.trim() || !usuarioAtual) return;
    const cmd = texto.toLowerCase().trim();
    if (cmd === '/cls') { await limparChat(usuarioAtual); return; }
    if (cmd.startsWith('/kick')) { await kickUser(texto, usuarioAtual); return; }
    if (cmd.startsWith('/gunto')) { await enviarGunto(texto, usuarioAtual); return; }
    await db.collection('mensagens').add({ usuario: usuarioAtual, texto: texto, timestamp: new Date(), hora: getHora() });
}

function carregarMensagens() {
    db.collection('mensagens').orderBy('timestamp', 'asc').onSnapshot((snap) => {
        if (!messagesDiv) return;
        if (snap.empty) { messagesDiv.innerHTML = '<div class="welcome-box">💜 CHAT ROXO V2<br>🎨 Gartic | 🪢 Forca | 🐍 Snake | 🔫 /gunto | 👢 /kick | 🗑️ /cls</div>'; return; }
        let html = '';
        snap.forEach(doc => {
            const msg = doc.data();
            if (msg.isSystem) html += `<div class="system-message">${msg.texto}</div>`;
            else {
                const isOwn = usuarioAtual === msg.usuario;
                const cls = isOwn ? 'message-own' : 'message-other';
                html += `<div class="message ${cls}"><div class="message-info">${!isOwn ? `<span class="message-name">${msg.usuario}</span>` : ''}<span class="message-time">${msg.hora}</span></div><div class="message-bubble">${msg.texto}</div></div>`;
            }
        });
        messagesDiv.innerHTML = html;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

async function entrarChat() {
    const nome = loginInput.value.trim();
    if (!nome) return alert('Digite seu nome');
    if (nome.length > 20) return alert('Nome muito longo');
    usuarioAtual = nome;
    localStorage.setItem('chatUsername', nome);
    if (userNameSpan) userNameSpan.textContent = nome;
    if (userLevelSpan) userLevelSpan.textContent = `Nv.1`;
    if (userAvatar) userAvatar.textContent = "👤";
    await enviarMsgSistema(`${nome} entrou no chat 💜`);
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

// ============================================
// EVENTOS
// ============================================
if (loginBtn) loginBtn.onclick = entrarChat;
if (sendBtn) sendBtn.onclick = () => { enviarMensagem(messageInput.value); messageInput.value = ''; };
if (messageInput) messageInput.onkeypress = (e) => { if (e.key === 'Enter') { enviarMensagem(messageInput.value); messageInput.value = ''; } };
if (loginInput) loginInput.onkeypress = (e) => { if (e.key === 'Enter') entrarChat(); };

let typingTime;
if (messageInput) messageInput.oninput = () => {
    if (messageInput.value.length > 0 && usuarioAtual && typingIndicator) {
        typingIndicator.textContent = `${usuarioAtual} digitando...`;
        clearTimeout(typingTime);
        typingTime = setTimeout(() => { if (typingIndicator) typingIndicator.textContent = ''; }, 1000);
    }
};

// BOTÕES LATERAIS
if (openGarticBtn) openGarticBtn.onclick = () => { if (!garticAtivo) iniciarGartic(); else abrirGarticPanel(usuarioAtual === desenhistaAtual); };
if (openForcaBtn) openForcaBtn.onclick = () => iniciarForca();
if (openSnakeBtn) openSnakeBtn.onclick = () => iniciarSnake();
if (closeGarticPanel) closeGarticPanel.onclick = () => fecharGartic();

document.addEventListener('click', (e) => {
    if (garticPanel && garticPanel.classList.contains('open') && !garticPanel.contains(e.target) && openGarticBtn && !openGarticBtn.contains(e.target)) fecharGartic();
});

// MODAIS
document.querySelectorAll('.close-forca, .close-snake').forEach(el => {
    if (el) el.onclick = () => { if (forcaModal) forcaModal.style.display = 'none'; if (snakeModal) snakeModal.style.display = 'none'; if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop); };
});

// FORCA
if (document.getElementById('forcaGuessBtn')) document.getElementById('forcaGuessBtn').onclick = () => { const input = document.getElementById('forcaLetter'); if (input && input.value.trim()) { palpitarForca(input.value); input.value = ''; } };
if (document.getElementById('forcaLetter')) document.getElementById('forcaLetter').onkeypress = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { palpitarForca(e.target.value); e.target.value = ''; } };
if (document.getElementById('forcaNewGameBtn')) document.getElementById('forcaNewGameBtn').onclick = () => iniciarForca();

// SNAKE
if (document.getElementById('snakeRestartBtn')) document.getElementById('snakeRestartBtn').onclick = () => { if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop); iniciarSnake(); };
window.addEventListener('keydown', (e) => { if (snakeModal && snakeModal.style.display === 'flex') handleSnakeKey(e); });

// GARTIC TOOLS
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.onclick = () => {
        if (btn.dataset.clear && canvasElement && canvasCtx) { canvasCtx.fillStyle = 'white'; canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height); if (sessaoGartic) rtdb.ref('gartic/' + sessaoGartic).remove(); }
        else if (btn.dataset.color) { corAtual = btn.dataset.color; if (canvasCtx) canvasCtx.strokeStyle = corAtual; }
    };
});
if (document.getElementById('brushSizePanel')) document.getElementById('brushSizePanel').oninput = (e) => { tamanhoPincel = parseInt(e.target.value); if (canvasCtx) canvasCtx.lineWidth = tamanhoPincel; };
if (document.getElementById('garticGuessBtn')) document.getElementById('garticGuessBtn').onclick = () => { const input = document.getElementById('garticGuessInput'); if (input && input.value.trim()) { palpiteGartic(input.value); input.value = ''; } };
if (document.getElementById('garticGuessInput')) document.getElementById('garticGuessInput').onkeypress = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { palpiteGartic(e.target.value); e.target.value = ''; } };

// ONLINE COUNT
async function atualizarOnlineCount() { try { const snap = await db.collection('usuarios').get(); if (onlineCountSpan) onlineCountSpan.textContent = snap.size; } catch(e) {} }

// INICIAR
const salvo = localStorage.getItem('chatUsername');
if (salvo && loginInput) { loginInput.value = salvo; entrarChat(); }
carregarMensagens();
setInterval(atualizarOnlineCount, 5000);

console.log("🎮 VERSÃO 2.0 - CHAT ROXO COMPLETO! Gartic sincronizado, Forca e Snake funcionando!");
// ============================================
// ENVIO DE FOTOS
// ============================================
// ============================================
// ENVIO DE FOTOS - CORRIGIDO
// ============================================
const photoBtn = document.getElementById('photoBtn');
const photoModal = document.getElementById('photoModal');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const sendPhotoBtn = document.getElementById('sendPhotoBtn');
const closeModal = document.querySelector('.close-modal');

console.log("🔍 Botão foto:", photoBtn);
console.log("🔍 Modal foto:", photoModal);

if (photoBtn) {
    photoBtn.onclick = () => {
        console.log("📷 Botão clicado!");
        if (photoModal) photoModal.style.display = 'flex';
        if (photoInput) photoInput.value = '';
        if (photoPreview) photoPreview.innerHTML = '';
    };
}

if (closeModal) {
    closeModal.onclick = () => {
        if (photoModal) photoModal.style.display = 'none';
    };
}

// Fechar modal clicando fora
window.onclick = (e) => {
    if (photoModal && e.target === photoModal) {
        photoModal.style.display = 'none';
    }
};

if (photoInput) {
    photoInput.onchange = (e) => {
        const file = e.target.files[0];
        console.log("📷 Arquivo:", file?.name);
        if (file && photoPreview) {
            const reader = new FileReader();
            reader.onload = (event) => {
                photoPreview.innerHTML = `<img src="${event.target.result}" style="max-width:100%; border-radius:10px;">`;
            };
            reader.readAsDataURL(file);
        }
    };
}

if (sendPhotoBtn) {
    sendPhotoBtn.onclick = async () => {
        const file = photoInput.files[0];
        if (!file) {
            alert('Selecione uma foto!');
            return;
        }
        
        sendPhotoBtn.textContent = '📤 ENVIANDO...';
        sendPhotoBtn.disabled = true;
        
        try {
            const storage = firebase.storage();
            const nome = `fotos/${Date.now()}_${file.name}`;
            const ref = storage.ref(nome);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            
            await db.collection('mensagens').add({
                usuario: usuarioAtual,
                tipo: 'imagem',
                imagemUrl: url,
                timestamp: new Date(),
                hora: getHora()
            });
            
            photoModal.style.display = 'none';
            photoInput.value = '';
            photoPreview.innerHTML = '';
            
        } catch (error) {
            console.error("Erro:", error);
            alert('Erro ao enviar foto: ' + error.message);
        } finally {
            sendPhotoBtn.textContent = '📤 ENVIAR FOTO';
            sendPhotoBtn.disabled = false;
        }
    };
}
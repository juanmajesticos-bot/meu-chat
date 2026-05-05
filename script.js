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
const storage = firebase.storage();
const rtdb = firebase.database();

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let dadosUsuario = null;
let guntoTimeout = null;

// VARIÁVEIS DO GARTIC
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

// VARIÁVEIS DA FORCA
let forcaAtivo = false;
let palavraForca = "";
let letrasDescobertas = [];
let tentativasForca = 6;
let letrasErradas = [];

// VARIÁVEIS DA COBRA
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
const palavrasGartic = ["CASA", "CARRO", "CACHORRO", "GATO", "SOL", "LUA", "FLOR", "ARVORE", "PRAIA", "MONTANHA", "CHUVA", "FOGO", "ESTRELA", "BORBOLETA", "PEIXE", "PASSARO", "MACACO", "ELEFANTE", "GIRAFA", "TIGRE"];
const palavrasForca = ["JAVASCRIPT", "FIREBASE", "PROGRAMADOR", "COMPUTADOR", "INTERNET", "SERVIDOR", "BANCO", "DADOS", "CLOUD", "HACKER", "MATRIX", "TERMINAL", "CODIGO", "SENHA", "ALGORITMO"];

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
const photoBtn = document.getElementById('photoBtn');
const photoModal = document.getElementById('photoModal');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const sendPhotoBtn = document.getElementById('sendPhotoBtn');
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
function getTitulo(nivel) {
    if (nivel >= 20) return "👑 LENDA 👑";
    if (nivel >= 15) return "⚡ MESTRE ⚡";
    if (nivel >= 10) return "💎 ÉLITE 💎";
    if (nivel >= 5) return "🏆 VETERANO 🏆";
    if (nivel >= 3) return "📈 APRENDIZ 📈";
    return "⭐ INICIANTE ⭐";
}

function getHora() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============================================
// SISTEMA DE XP
// ============================================
async function adicionarXP(username, qtd) {
    const ref = db.collection('usuarios').doc(username);
    const doc = await ref.get();
    let xp = qtd;
    if (doc.exists) xp = (doc.data().xp || 0) + qtd;
    const nivel = Math.floor(xp / 100) + 1;
    await ref.set({ nome: username, xp: xp, nivel: nivel }, { merge: true });
    if (username === usuarioAtual) await carregarUsuario();
}

async function carregarUsuario() {
    if (!usuarioAtual) return;
    const ref = db.collection('usuarios').doc(usuarioAtual);
    const doc = await ref.get();
    dadosUsuario = doc.exists ? doc.data() : { nome: usuarioAtual, xp: 0, nivel: 1 };
    if (!doc.exists) await ref.set(dadosUsuario);
    
    if (userNameSpan) userNameSpan.textContent = usuarioAtual;
    const nivel = dadosUsuario.nivel || 1;
    if (userLevelSpan) userLevelSpan.textContent = `Nv.${nivel}`;
    if (userAvatar) {
        if (nivel >= 20) userAvatar.textContent = "👑";
        else if (nivel >= 10) userAvatar.textContent = "💎";
        else userAvatar.textContent = "👤";
    }
}

// ============================================
// MENSAGENS DO SISTEMA
// ============================================
async function enviarMsgSistema(texto) {
    await db.collection('mensagens').add({
        usuario: '💜 SISTEMA',
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
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
    await db.collection('alertas').add({ tipo: 'gunto', mensagem: texto, autor: autor, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    await enviarMsgSistema(`🔫 ${autor} usou GUNTO: "${texto}"`);
    return true;
}

db.collection('alertas').orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
            const alerta = change.doc.data();
            if (alerta.autor !== usuarioAtual) mostrarGunto(alerta.mensagem, alerta.autor);
            change.doc.ref.delete();
        }
    });
});

// ============================================
// COMANDO KICK
// ============================================
async function kickUser(mensagem, autor) {
    const partes = mensagem.split(' ');
    const alvo = partes[1]?.replace('@', '');
    
    if (!alvo) {
        await enviarMsgSistema("Use: /kick @usuario");
        return true;
    }
    if (autor === alvo) {
        await enviarMsgSistema(`${autor} não pode se kickar!`);
        return true;
    }
    
    const autorRef = await db.collection('usuarios').doc(autor).get();
    const autorNivel = autorRef.exists ? (autorRef.data().nivel || 1) : 1;
    
    if (autorNivel < 5) {
        await enviarMsgSistema(`${autor} precisa ser nível 5+ para kickar!`);
        return true;
    }
    
    await enviarMsgSistema(`💀 ${alvo} foi EXPULSO do chat por ${autor}! 💀`);
    
    if (alvo === usuarioAtual) {
        setTimeout(() => {
            localStorage.removeItem('chatUsername');
            location.reload();
        }, 2000);
    }
    return true;
}

// ============================================
// COMANDO CLS
// ============================================
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
    
    for (let i = 0; i < palavraForca.length; i++) {
        letrasDescobertas.push('_');
    }
    
    atualizarModalForca();
    forcaModal.style.display = 'flex';
    
    await enviarMsgSistema(`🪢 JOGO DA FORCA INICIADO! Uma palavra de ${palavraForca.length} letras!`);
    return true;
}

function atualizarModalForca() {
    const wordDisplay = document.getElementById('forcaWord');
    const attemptsDisplay = document.getElementById('forcaAttempts');
    const lettersDisplay = document.getElementById('forcaLetters');
    const drawingDisplay = document.getElementById('forcaDrawing');
    const statusDisplay = document.getElementById('forcaStatus');
    
    if (wordDisplay) wordDisplay.textContent = letrasDescobertas.join(' ');
    if (attemptsDisplay) attemptsDisplay.textContent = tentativasForca;
    if (drawingDisplay) drawingDisplay.textContent = getForcaDesenho();
    
    // Mostrar letras erradas
    if (lettersDisplay) {
        lettersDisplay.innerHTML = letrasErradas.map(l => `<span class="letter-badge">${l}</span>`).join('');
    }
    
    // Status do jogo
    if (statusDisplay) {
        if (!letrasDescobertas.includes('_')) {
            statusDisplay.innerHTML = '<span style="color:#4caf50">🎉 VOCÊ GANHOU! 🎉</span>';
        } else if (tentativasForca <= 0) {
            statusDisplay.innerHTML = `<span style="color:#ff0000">💀 FIM DE JOGO! A palavra era: ${palavraForca} 💀</span>`;
        } else {
            statusDisplay.innerHTML = '<span>💜 Tente adivinhar a palavra! 💜</span>';
        }
    }
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
    
    if (letra.length !== 1 || !/[A-Z]/.test(letra)) {
        await enviarMsgSistema(`${usuarioAtual}, digite apenas uma letra!`);
        return;
    }
    
    if (letrasDescobertas.includes(letra) || letrasErradas.includes(letra)) {
        await enviarMsgSistema(`${usuarioAtual}, a letra "${letra}" já foi usada!`);
        return;
    }
    
    if (palavraForca.includes(letra)) {
        for (let i = 0; i < palavraForca.length; i++) {
            if (palavraForca[i] === letra) {
                letrasDescobertas[i] = letra;
            }
        }
        await enviarMsgSistema(`✅ ${usuarioAtual} acertou a letra "${letra}"!`);
        atualizarModalForca();
        
        if (!letrasDescobertas.includes('_')) {
            const xpGanho = 50;
            await adicionarXP(usuarioAtual, xpGanho);
            await enviarMsgSistema(`🎉🎉🎉 ${usuarioAtual} ACERTOU A PALAVRA "${palavraForca}"! Ganhou +${xpGanho} XP! 🎉🎉🎉`);
            forcaAtivo = false;
        }
    } else {
        tentativasForca--;
        letrasErradas.push(letra);
        await enviarMsgSistema(`❌ ${usuarioAtual} errou a letra "${letra}"!`);
        atualizarModalForca();
        
        if (tentativasForca <= 0) {
            await enviarMsgSistema(`💀 FIM DE JOGO! A palavra era "${palavraForca}"! 💀`);
            forcaAtivo = false;
        }
    }
}

// ============================================
// JOGO GARTIC
// ============================================
async function iniciarGartic() {
    if (garticAtivo) {
        await enviarMsgSistema("🎨 Já tem um jogo Gartic em andamento!");
        return;
    }
    
    garticAtivo = true;
    palavraSecreta = palavrasGartic[Math.floor(Math.random() * palavrasGartic.length)];
    desenhistaAtual = usuarioAtual;
    tempoRestante = 60;
    sessaoGartic = Date.now().toString();
    
    await rtdb.ref('gartic/' + sessaoGartic).remove();
    
    await enviarMsgSistema(`🎨 GARTIC INICIADO! ${desenhistaAtual} é o DESENHISTA!`);
    await enviarMsgSistema(`✨ Os outros jogadores devem adivinhar o desenho!`);
    await enviarMsgSistema(`⏱️ Tempo: 60 segundos!`);
    
    abrirGarticPanel();
    configurarGarticPainel();
    iniciarTimerGartic();
}

function abrirGarticPanel() {
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
        canvasCtx.lineCap = 'round';
        canvasCtx.lineJoin = 'round';
    }
    
    const wordHint = document.getElementById('garticWordHint');
    const drawerSpan = document.getElementById('currentDrawer');
    const statusSpan = document.querySelector('.gartic-status .status-text');
    
    if (usuarioAtual === desenhistaAtual) {
        if (wordHint) wordHint.innerHTML = `🎨 Você está desenhando: <strong style="color:#a78bfa">${palavraSecreta}</strong>`;
        if (drawerSpan) drawerSpan.textContent = desenhistaAtual + " (Você)";
        if (statusSpan) statusSpan.innerHTML = "🎨 VOCÊ É O DESENHISTA! Desenhe a palavra!";
        habilitarDesenho(true);
    } else {
        if (wordHint) wordHint.innerHTML = "❓ Adivinhe o desenho! ❓";
        if (drawerSpan) drawerSpan.textContent = desenhistaAtual;
        if (statusSpan) statusSpan.innerHTML = "💜 Aguardando o desenhista...";
        habilitarDesenho(false);
        escutarDesenho();
    }
    
    document.getElementById('guessHistoryList').innerHTML = '';
}

function habilitarDesenho(enable) {
    if (canvasElement) {
        canvasElement.style.cursor = enable ? 'crosshair' : 'not-allowed';
    }
}

function configurarGarticPainel() {
    if (!canvasElement) return;
    
    function getCoords(e) {
        const rect = canvasElement.getBoundingClientRect();
        const scaleX = canvasElement.width / rect.width;
        const scaleY = canvasElement.height / rect.height;
        let x, y;
        if (e.touches) {
            x = (e.touches[0].clientX - rect.left) * scaleX;
            y = (e.touches[0].clientY - rect.top) * scaleY;
        } else {
            x = (e.clientX - rect.left) * scaleX;
            y = (e.clientY - rect.top) * scaleY;
        }
        return { x: Math.max(0, Math.min(canvasElement.width, x)), y: Math.max(0, Math.min(canvasElement.height, y)) };
    }
    
    function startDrawing(e) {
        if (usuarioAtual !== desenhistaAtual) return;
        e.preventDefault();
        desenhando = true;
        const { x, y } = getCoords(e);
        ultimaX = x;
        ultimaY = y;
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
        
        const traco = {
            x1: ultimaX, y1: ultimaY,
            x2: x, y2: y,
            cor: corAtual,
            tamanho: tamanhoPincel,
            timestamp: Date.now()
        };
        rtdb.ref('gartic/' + sessaoGartic).push(traco);
        
        ultimaX = x;
        ultimaY = y;
    }
    
    function stopDrawing(e) {
        desenhando = false;
        e.preventDefault();
    }
    
    canvasElement.removeEventListener('mousedown', startDrawing);
    canvasElement.removeEventListener('mousemove', draw);
    canvasElement.removeEventListener('mouseup', stopDrawing);
    canvasElement.removeEventListener('touchstart', startDrawing);
    canvasElement.removeEventListener('touchmove', draw);
    canvasElement.removeEventListener('touchend', stopDrawing);
    
    canvasElement.addEventListener('mousedown', startDrawing);
    canvasElement.addEventListener('mousemove', draw);
    canvasElement.addEventListener('mouseup', stopDrawing);
    canvasElement.addEventListener('touchstart', startDrawing);
    canvasElement.addEventListener('touchmove', draw);
    canvasElement.addEventListener('touchend', stopDrawing);
}

function escutarDesenho() {
    const desenhoRef = rtdb.ref('gartic/' + sessaoGartic);
    desenhoRef.off();
    desenhoRef.on('child_added', (snapshot) => {
        if (usuarioAtual === desenhistaAtual) return;
        const traco = snapshot.val();
        if (canvasCtx && canvasElement) {
            canvasCtx.beginPath();
            canvasCtx.strokeStyle = traco.cor;
            canvasCtx.lineWidth = traco.tamanho;
            canvasCtx.moveTo(traco.x1, traco.y1);
            canvasCtx.lineTo(traco.x2, traco.y2);
            canvasCtx.stroke();
        }
    });
}

function iniciarTimerGartic() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(async () => {
        if (!garticAtivo) { clearInterval(timerInterval); return; }
        tempoRestante--;
        
        const timerDisplay = document.querySelector('.gartic-status');
        if (timerDisplay && tempoRestante <= 10) {
            timerDisplay.style.backgroundColor = 'rgba(255,0,0,0.2)';
        }
        
        if (tempoRestante <= 0) {
            clearInterval(timerInterval);
            await enviarMsgSistema(`⏰ TEMPO ESGOTADO! A palavra era "${palavraSecreta}"!`);
            fecharGartic();
        }
    }, 1000);
}

async function palpiteGartic(palpite) {
    if (!garticAtivo) {
        await enviarMsgSistema("🎨 Não há jogo Gartic ativo!");
        return;
    }
    
    if (usuarioAtual === desenhistaAtual) {
        await enviarMsgSistema(`${usuarioAtual}, você é o desenhista! Não pode palpitar!`);
        return;
    }
    
    const palpiteUpper = palpite.toUpperCase().trim();
    
    if (palpiteUpper === palavraSecreta) {
        const xpGanho = 30;
        await adicionarXP(usuarioAtual, xpGanho);
        await adicionarXP(desenhistaAtual, 20);
        
        await enviarMsgSistema(`🎉🎉🎉 ${usuarioAtual} ACERTOU! A palavra era "${palavraSecreta}"! 🎉🎉🎉`);
        await enviarMsgSistema(`🏆 ${usuarioAtual} ganhou +${xpGanho} XP!`);
        await enviarMsgSistema(`🎨 ${desenhistaAtual} ganhou +20 XP por desenhar!`);
        
        fecharGartic();
    } else {
        await enviarMsgSistema(`❌ ${usuarioAtual} palpitou: "${palpite}" - ERRADO!`);
        
        const historyList = document.getElementById('guessHistoryList');
        if (historyList) {
            const item = document.createElement('div');
            item.className = 'guess-item';
            item.innerHTML = `<span style="color:#a78bfa">${usuarioAtual}</span> palpitou: "${palpite}" ❌`;
            historyList.appendChild(item);
            historyList.scrollTop = historyList.scrollHeight;
        }
    }
}

function fecharGartic() {
    garticAtivo = false;
    if (timerInterval) clearInterval(timerInterval);
    garticPanel.classList.remove('open');
    if (sessaoGartic) {
        rtdb.ref('gartic/' + sessaoGartic).remove();
    }
    sessaoGartic = null;
    desenhistaAtual = null;
    palavraSecreta = "";
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
    const scoreSpan = document.getElementById('snakeScore');
    if (scoreSpan) scoreSpan.innerText = '0';
    
    gerarComida();
    desenharSnake();
    
    snakeGame.gameLoop = setInterval(atualizarSnake, 100);
    snakeModal.style.display = 'flex';
}

function gerarComida() {
    if (!snakeGame.canvas) return;
    const maxX = Math.floor(snakeGame.canvas.width / 20) - 1;
    const maxY = Math.floor(snakeGame.canvas.height / 20) - 1;
    let novaComida;
    do {
        novaComida = { x: Math.floor(Math.random() * maxX), y: Math.floor(Math.random() * maxY) };
    } while (snakeGame.snake.some(segment => segment.x === novaComida.x && segment.y === novaComida.y));
    snakeGame.food = novaComida;
}

function desenharSnake() {
    if (!snakeGame.ctx || !snakeGame.canvas) return;
    const ctx = snakeGame.ctx;
    const canvas = snakeGame.canvas;
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(snakeGame.food.x * 20, snakeGame.food.y * 20, 18, 18);
    
    snakeGame.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#a78bfa' : '#7c3aed';
        ctx.fillRect(segment.x * 20, segment.y * 20, 18, 18);
        if (index === 0) {
            ctx.fillStyle = 'white';
            ctx.fillRect(segment.x * 20 + 5, segment.y * 20 + 5, 4, 4);
            ctx.fillRect(segment.x * 20 + 11, segment.y * 20 + 5, 4, 4);
        }
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
    
    if (newHead.x < 0 || newHead.x >= maxX || newHead.y < 0 || newHead.y >= maxY) {
        gameOverSnake();
        return;
    }
    
    if (snakeGame.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        gameOverSnake();
        return;
    }
    
    snakeGame.snake.unshift(newHead);
    
    if (newHead.x === snakeGame.food.x && newHead.y === snakeGame.food.y) {
        snakeGame.score += 10;
        const scoreSpan = document.getElementById('snakeScore');
        if (scoreSpan) scoreSpan.innerText = snakeGame.score;
        gerarComida();
    } else {
        snakeGame.snake.pop();
    }
    
    desenharSnake();
}

function gameOverSnake() {
    snakeGame.gameRunning = false;
    if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    enviarMsgSistema(`🐍 ${usuarioAtual} fez ${snakeGame.score} pontos no Jogo da Cobrinha!`);
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
// ENVIO DE MENSAGENS
// ============================================
async function enviarMensagem(texto) {
    if (!texto.trim() || !usuarioAtual) return;
    
    const cmd = texto.toLowerCase().trim();
    
    if (cmd === '/cls') { await limparChat(usuarioAtual); return; }
    if (cmd.startsWith('/kick')) { await kickUser(texto, usuarioAtual); return; }
    if (cmd.startsWith('/gunto')) { await enviarGunto(texto, usuarioAtual); return; }
    
    await adicionarXP(usuarioAtual, 5);
    await db.collection('mensagens').add({
        usuario: usuarioAtual,
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        hora: getHora()
    });
}

function carregarMensagens() {
    db.collection('mensagens').orderBy('timestamp', 'asc').onSnapshot((snap) => {
        if (!messagesDiv) return;
        if (snap.empty) {
            messagesDiv.innerHTML = '<div class="welcome-box">💜 CHAT ROXO 💜<br>Clique nos botões da esquerda para jogar!</div>';
            return;
        }
        let html = '';
        snap.forEach(doc => {
            const msg = doc.data();
            if (msg.isSystem) {
                html += `<div class="system-message">${msg.texto}</div>`;
            } else if (msg.tipo === 'imagem') {
                const isOwn = usuarioAtual === msg.usuario;
                const cls = isOwn ? 'message-own' : 'message-other';
                html += `
                    <div class="message ${cls}">
                        <div class="message-info">
                            ${!isOwn ? `<span class="message-name">${msg.usuario}</span>` : ''}
                            <span class="message-time">${msg.hora}</span>
                        </div>
                        <div class="message-bubble">
                            <img src="${msg.imagemUrl}" class="message-image" onclick="window.open('${msg.imagemUrl}')">
                        </div>
                    </div>
                `;
            } else {
                const isOwn = usuarioAtual === msg.usuario;
                const cls = isOwn ? 'message-own' : 'message-other';
                html += `
                    <div class="message ${cls}">
                        <div class="message-info">
                            ${!isOwn ? `<span class="message-name">${msg.usuario}</span>` : ''}
                            <span class="message-time">${msg.hora}</span>
                        </div>
                        <div class="message-bubble">${msg.texto}</div>
                    </div>
                `;
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
    await carregarUsuario();
    await enviarMsgSistema(`${nome} entrou no chat 💜`);
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

// ============================================
// ENVIO DE FOTOS
// ============================================
if (photoBtn) {
    photoBtn.onclick = () => {
        photoModal.style.display = 'flex';
        if (photoInput) photoInput.value = '';
        if (photoPreview) photoPreview.innerHTML = '';
    };
}

document.querySelectorAll('.close-modal, .close-forca, .close-snake').forEach(el => {
    if (el) {
        el.onclick = () => {
            if (photoModal) photoModal.style.display = 'none';
            if (forcaModal) forcaModal.style.display = 'none';
            if (snakeModal) snakeModal.style.display = 'none';
            if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
        };
    }
});

if (photoInput) {
    photoInput.onchange = (e) => {
        const file = e.target.files[0];
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
            alert('Selecione uma foto primeiro!');
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas imagens!');
            return;
        }
        
        sendPhotoBtn.textContent = '📤 ENVIANDO...';
        sendPhotoBtn.disabled = true;
        
        try {
            const nomeArquivo = `fotos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = storage.ref(nomeArquivo);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            
            await db.collection('mensagens').add({
                usuario: usuarioAtual,
                tipo: 'imagem',
                imagemUrl: url,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                hora: getHora()
            });
            
            await adicionarXP(usuarioAtual, 5);
            photoModal.style.display = 'none';
            if (photoInput) photoInput.value = '';
            if (photoPreview) photoPreview.innerHTML = '';
            await enviarMsgSistema(`📷 ${usuarioAtual} enviou uma foto!`);
            
        } catch (error) {
            console.error("Erro ao enviar foto:", error);
            alert('Erro ao enviar foto: ' + error.message);
        } finally {
            sendPhotoBtn.textContent = '📤 ENVIAR FOTO';
            sendPhotoBtn.disabled = false;
        }
    };
}

// ============================================
// BOTÕES DA SIDEBAR
// ============================================
if (openGarticBtn) {
    openGarticBtn.onclick = () => {
        if (!garticAtivo) {
            iniciarGartic();
        } else {
            abrirGarticPanel();
        }
    };
}

if (openForcaBtn) {
    openForcaBtn.onclick = () => {
        iniciarForca();
    };
}

if (openSnakeBtn) {
    openSnakeBtn.onclick = () => {
        iniciarSnake();
    };
}

if (closeGarticPanel) {
    closeGarticPanel.onclick = () => {
        fecharGartic();
    };
}

// Fechar Gartic panel clicando fora
document.addEventListener('click', (e) => {
    if (garticPanel && garticPanel.classList.contains('open')) {
        if (!garticPanel.contains(e.target) && !openGarticBtn.contains(e.target)) {
            fecharGartic();
        }
    }
});

// ============================================
// CONFIGURAÇÕES DOS BOTÕES DO GARTIC
// ============================================
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.onclick = () => {
        if (btn.dataset.clear) {
            if (canvasElement && canvasCtx) {
                canvasCtx.fillStyle = 'white';
                canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
                if (sessaoGartic) {
                    rtdb.ref('gartic/' + sessaoGartic).remove();
                }
            }
        } else if (btn.dataset.color) {
            corAtual = btn.dataset.color;
            if (canvasCtx) canvasCtx.strokeStyle = corAtual;
        }
    };
});

const brushSizePanel = document.getElementById('brushSizePanel');
if (brushSizePanel) {
    brushSizePanel.oninput = (e) => {
        tamanhoPincel = parseInt(e.target.value);
        if (canvasCtx) canvasCtx.lineWidth = tamanhoPincel;
    };
}

const garticGuessBtnPanel = document.getElementById('garticGuessBtn');
if (garticGuessBtnPanel) {
    garticGuessBtnPanel.addEventListener('click', () => {
        const input = document.getElementById('garticGuessInput');
        if (input && input.value.trim()) {
            palpiteGartic(input.value);
            input.value = '';
        }
    });
}

const garticGuessInputPanel = document.getElementById('garticGuessInput');
if (garticGuessInputPanel) {
    garticGuessInputPanel.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            palpiteGartic(e.target.value);
            e.target.value = '';
        }
    });
}

const forcaGuessBtn = document.getElementById('forcaGuessBtn');
if (forcaGuessBtn) {
    forcaGuessBtn.addEventListener('click', () => {
        const input = document.getElementById('forcaLetter');
        if (input && input.value.trim()) {
            palpitarForca(input.value);
            input.value = '';
        }
    });
}

const forcaLetterInput = document.getElementById('forcaLetter');
if (forcaLetterInput) {
    forcaLetterInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            palpitarForca(e.target.value);
            e.target.value = '';
        }
    });
}

const forcaNewGameBtn = document.getElementById('forcaNewGameBtn');
if (forcaNewGameBtn) {
    forcaNewGameBtn.onclick = () => {
        iniciarForca();
    };
}

const snakeRestartBtn = document.getElementById('snakeRestartBtn');
if (snakeRestartBtn) {
    snakeRestartBtn.addEventListener('click', () => {
        if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
        iniciarSnake();
    });
}

window.addEventListener('keydown', (e) => {
    if (snakeModal && snakeModal.style.display === 'flex') handleSnakeKey(e);
});

// ============================================
// EVENTOS PRINCIPAIS
// ============================================
if (loginBtn) loginBtn.onclick = entrarChat;
if (sendBtn) {
    sendBtn.onclick = () => { enviarMensagem(messageInput.value); if (messageInput) messageInput.value = ''; };
}
if (messageInput) {
    messageInput.onkeypress = (e) => { if (e.key === 'Enter') { enviarMensagem(messageInput.value); messageInput.value = ''; } };
}
if (loginInput) {
    loginInput.onkeypress = (e) => { if (e.key === 'Enter') entrarChat(); };
}

let typingTime;
if (messageInput) {
    messageInput.oninput = () => {
        if (messageInput.value.length > 0 && usuarioAtual && typingIndicator) {
            typingIndicator.textContent = `${usuarioAtual} digitando...`;
            clearTimeout(typingTime);
            typingTime = setTimeout(() => { if (typingIndicator) typingIndicator.textContent = ''; }, 1000);
        }
    };
}

// ============================================
// INICIAR
// ============================================
const salvo = localStorage.getItem('chatUsername');
if (salvo && loginInput) { loginInput.value = salvo; entrarChat(); }
carregarMensagens();
setInterval(async () => { const snap = await db.collection('usuarios').get(); if (onlineCountSpan) onlineCountSpan.textContent = snap.size; }, 5000);

console.log("✅ CHAT ROXO PRONTO! Clique nos botões da esquerda para jogar Gartic, Forca ou Snake!");
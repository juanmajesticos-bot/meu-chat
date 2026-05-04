// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC5yWUgfpwD3g6FU1VKhHiZW2Q1XBs_TWs",
    authDomain: "chat-79da1.firebaseapp.com",
    projectId: "chat-79da1",
    storageBucket: "chat-79da1.firebasestorage.app",
    messagingSenderId: "832541118241",
    appId: "1:832541118241:web:5d3c8e2650877106b13860"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// VARIÁVEIS
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

// VARIÁVEIS DA COBRA
let snakeGame = {
    canvas: null,
    ctx: null,
    snake: [{x: 10, y: 10}],
    direction: 'RIGHT',
    food: {x: 15, y: 10},
    score: 0,
    gameLoop: null,
    gameRunning: false
};

// DOM
const telaLogin = document.getElementById('loginScreen');
const telaChat = document.getElementById('chatMain');
const loginBtn = document.getElementById('loginBtn');
const loginInput = document.getElementById('loginUsername');
const userNameSpan = document.getElementById('userName');
const userLevelSpan = document.getElementById('userLevel');
const userTitleSpan = document.getElementById('userTitle');
const xpBarFill = document.getElementById('xpBarFill');
const xpTextSpan = document.getElementById('xpText');
const userAvatar = document.getElementById('userAvatar');
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
const garticModal = document.getElementById('garticModal');
const snakeModal = document.getElementById('snakeModal');

// ============================================
// SISTEMA DE NÍVEL
// ============================================
function getTitulo(nivel) {
    if (nivel >= 20) return "👑 LENDA";
    if (nivel >= 15) return "⚡ MESTRE";
    if (nivel >= 10) return "💎 ÉLITE";
    if (nivel >= 5) return "🏆 VETERANO";
    return "⭐ INICIANTE";
}

function getHora() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// GUNTO
// ============================================
function mostrarGunto(mensagem, autor) {
    const alerta = document.getElementById('guntoAlert');
    if (!alerta) return;
    if (guntoTimeout) clearTimeout(guntoTimeout);
    alerta.innerHTML = `🔫 ${autor} DISPAROU!<br>💙 ${mensagem} 💙`;
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
async function enviarMsgSistema(texto) {
    await db.collection('mensagens').add({ usuario: '💙 SISTEMA', texto: texto, timestamp: new Date(), hora: getHora(), isSystem: true });
}

async function limparChat(autor) {
    const msgs = await db.collection('mensagens').get();
    const batch = db.batch();
    msgs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    await enviarMsgSistema(`🗑️ Chat limpo por ${autor}`);
}

async function kickUser(mensagem, autor) {
    const partes = mensagem.split(' ');
    const alvo = partes[1]?.replace('@', '');
    if (!alvo) { await enviarMsgSistema("Use: /kick @usuario"); return true; }
    if (autor === alvo) { await enviarMsgSistema(`${autor} não pode se kickar`); return true; }
    await enviarMsgSistema(`💀 ${alvo} foi expulso por ${autor}`);
    if (alvo === usuarioAtual) setTimeout(() => { localStorage.removeItem('chatUsername'); location.reload(); }, 2000);
    return true;
}

// ============================================
// JOGO DA COBRA
// ============================================
function iniciarSnake() {
    if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    
    snakeGame.canvas = document.getElementById('snakeCanvas');
    snakeGame.ctx = snakeGame.canvas.getContext('2d');
    snakeGame.canvas.width = 400;
    snakeGame.canvas.height = 400;
    
    snakeGame.snake = [{x: 10, y: 10}];
    snakeGame.direction = 'RIGHT';
    snakeGame.score = 0;
    snakeGame.gameRunning = true;
    document.getElementById('snakeScore').innerText = '0';
    
    gerarComida();
    desenharSnake();
    
    if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    snakeGame.gameLoop = setInterval(atualizarSnake, 100);
    
    snakeModal.style.display = 'flex';
}

function gerarComida() {
    const maxX = Math.floor(snakeGame.canvas.width / 20) - 1;
    const maxY = Math.floor(snakeGame.canvas.height / 20) - 1;
    let novaComida;
    do {
        novaComida = { x: Math.floor(Math.random() * maxX), y: Math.floor(Math.random() * maxY) };
    } while (snakeGame.snake.some(segment => segment.x === novaComida.x && segment.y === novaComida.y));
    snakeGame.food = novaComida;
}

function desenharSnake() {
    const ctx = snakeGame.ctx;
    const canvas = snakeGame.canvas;
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar comida
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(snakeGame.food.x * 20, snakeGame.food.y * 20, 18, 18);
    
    // Desenhar cobra
    snakeGame.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#42a5f5' : '#1565c0';
        ctx.fillRect(segment.x * 20, segment.y * 20, 18, 18);
        ctx.fillStyle = 'white';
        if (index === 0) {
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
        document.getElementById('snakeScore').innerText = snakeGame.score;
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
    const ctx = snakeGame.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, snakeGame.canvas.width, snakeGame.canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', 200, 200);
    ctx.fillText(`Pontos: ${snakeGame.score}`, 200, 240);
}

function handleSnakeKey(e) {
    const key = e.key;
    if (key === 'ArrowRight' || key === 'd') { if (snakeGame.direction !== 'LEFT') snakeGame.direction = 'RIGHT'; }
    else if (key === 'ArrowLeft' || key === 'a') { if (snakeGame.direction !== 'RIGHT') snakeGame.direction = 'LEFT'; }
    else if (key === 'ArrowUp' || key === 'w') { if (snakeGame.direction !== 'DOWN') snakeGame.direction = 'UP'; }
    else if (key === 'ArrowDown' || key === 's') { if (snakeGame.direction !== 'UP') snakeGame.direction = 'DOWN'; }
}

// ============================================
// GARTIC
// ============================================
const palavrasGartic = ["CASA", "CARRO", "CACHORRO", "GATO", "SOL", "LUA", "FLOR", "ARVORE", "PRAIA", "MONTANHA"];

async function iniciarGartic() {
    if (garticAtivo) {
        await enviarMsgSistema("Já tem um jogo Gartic ativo!");
        return true;
    }
    
    garticAtivo = true;
    palavraSecreta = palavrasGartic[Math.floor(Math.random() * palavrasGartic.length)];
    desenhistaAtual = usuarioAtual;
    tempoRestante = 60;
    
    await enviarMsgSistema(`🎨 GARTIC INICIADO! ${desenhistaAtual} é o desenhista! Adivinhe a palavra! 🎨`);
    abrirModalGartic();
    iniciarTimerGartic();
    return true;
}

function abrirModalGartic() {
    const canvas = document.getElementById('garticCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 500;
    canvas.height = 400;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = corAtual;
    ctx.lineWidth = tamanhoPincel;
    
    const wordDisplay = document.getElementById('garticWordDisplay');
    const drawerInfo = document.getElementById('garticDrawerInfo');
    
    if (usuarioAtual === desenhistaAtual) {
        wordDisplay.innerHTML = `🎨 Desenhando: <strong style="color:#42a5f5">${palavraSecreta}</strong>`;
        drawerInfo.innerHTML = "🎨 Você é o DESENHISTA! Desenhe a palavra!";
        habilitarDesenho(true);
    } else {
        wordDisplay.innerHTML = "❓ Adivinhe o desenho! ❓";
        drawerInfo.innerHTML = `🎨 Desenhista: ${desenhistaAtual}`;
        habilitarDesenho(false);
    }
    
    document.getElementById('guessHistory').innerHTML = '';
    garticModal.style.display = 'flex';
    configurarCanvas();
}

function habilitarDesenho(enable) {
    const canvas = document.getElementById('garticCanvas');
    canvas.style.cursor = enable ? 'crosshair' : 'not-allowed';
}

function configurarCanvas() {
    const canvas = document.getElementById('garticCanvas');
    const ctx = canvas.getContext('2d');
    
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let x, y;
        if (e.touches) {
            x = (e.touches[0].clientX - rect.left) * scaleX;
            y = (e.touches[0].clientY - rect.top) * scaleY;
        } else {
            x = (e.clientX - rect.left) * scaleX;
            y = (e.clientY - rect.top) * scaleY;
        }
        return { x: Math.max(0, Math.min(canvas.width, x)), y: Math.max(0, Math.min(canvas.height, y)) };
    }
    
    function start(e) {
        if (usuarioAtual !== desenhistaAtual) return;
        e.preventDefault();
        desenhando = true;
        const { x, y } = getCoords(e);
        ultimaX = x;
        ultimaY = y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    
    function draw(e) {
        if (!desenhando || usuarioAtual !== desenhistaAtual) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(ultimaX, ultimaY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ultimaX = x;
        ultimaY = y;
        
        const imgData = canvas.toDataURL();
        db.collection('garticDesenho').doc('atual').set({ imagem: imgData, timestamp: new Date() });
    }
    
    function stop(e) { desenhando = false; e.preventDefault(); }
    
    canvas.removeEventListener('mousedown', start);
    canvas.removeEventListener('mousemove', draw);
    canvas.removeEventListener('mouseup', stop);
    canvas.removeEventListener('touchstart', start);
    canvas.removeEventListener('touchmove', draw);
    canvas.removeEventListener('touchend', stop);
    
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stop);
}

function iniciarTimerGartic() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(async () => {
        if (!garticAtivo) { clearInterval(timerInterval); return; }
        tempoRestante--;
        const timerDisplay = document.getElementById('garticTimer');
        if (timerDisplay) timerDisplay.innerHTML = `⏱️ ${tempoRestante}s`;
        if (tempoRestante <= 0) {
            clearInterval(timerInterval);
            await enviarMsgSistema(`⏰ TEMPO ESGOTADO! A palavra era "${palavraSecreta}"!`);
            fecharGartic();
        }
    }, 1000);
}

async function palpiteGartic(palpite) {
    if (!garticAtivo) return;
    if (usuarioAtual === desenhistaAtual) {
        await enviarMsgSistema(`${usuarioAtual} não pode palpitar, é o desenhista!`);
        return;
    }
    
    if (palpite.toUpperCase() === palavraSecreta) {
        await enviarMsgSistema(`🎉 ${usuarioAtual} ACERTOU! A palavra era "${palavraSecreta}"! Ganhou +30 XP! 🎉`);
        await adicionarXP(usuarioAtual, 30);
        await adicionarXP(desenhistaAtual, 20);
        await enviarMsgSistema(`🎨 ${desenhistaAtual} ganhou +20 XP por desenhar!`);
        fecharGartic();
    } else {
        await enviarMsgSistema(`❌ ${usuarioAtual} palpitou: "${palpite}" - ERRADO!`);
        const history = document.getElementById('guessHistory');
        const item = document.createElement('div');
        item.innerHTML = `<span style="color:#42a5f5">${usuarioAtual}</span> palpitou: "${palpite}" ❌`;
        history.appendChild(item);
    }
}

function fecharGartic() {
    garticAtivo = false;
    if (timerInterval) clearInterval(timerInterval);
    garticModal.style.display = 'none';
}

db.collection('garticDesenho').doc('atual').onSnapshot((doc) => {
    if (doc.exists && garticAtivo && usuarioAtual !== desenhistaAtual) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('garticCanvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
        };
        img.src = doc.data().imagem;
    }
});

// ============================================
// ENVIO DE FOTOS
// ============================================
photoBtn.onclick = () => { photoModal.style.display = 'flex'; };
document.querySelectorAll('.close-modal, .close-gartic, .close-snake').forEach(el => {
    el.onclick = () => {
        photoModal.style.display = 'none';
        garticModal.style.display = 'none';
        snakeModal.style.display = 'none';
        if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    };
});

photoInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            photoPreview.innerHTML = `<img src="${event.target.result}" style="max-width:100%; border-radius:10px;">`;
        };
        reader.readAsDataURL(file);
    }
};

sendPhotoBtn.onclick = async () => {
    const file = photoInput.files[0];
    if (!file) return;
    
    const storageRef = storage.ref(`fotos/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    
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
    await adicionarXP(usuarioAtual, XP_POR_MSG);
};

// ============================================
// SISTEMA DE MENSAGENS
// ============================================
const XP_POR_MSG = 5;

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
    
    userNameSpan.textContent = usuarioAtual;
    const nivel = dadosUsuario.nivel || 1;
    userLevelSpan.textContent = `Nv.${nivel}`;
    userTitleSpan.textContent = getTitulo(nivel);
    const xpAtual = (dadosUsuario.xp || 0) % 100;
    const percentual = (xpAtual / 100) * 100;
    xpBarFill.style.width = `${percentual}%`;
    xpTextSpan.textContent = `${xpAtual}/100 XP`;
    if (nivel >= 20) userAvatar.textContent = "👑";
    else if (nivel >= 10) userAvatar.textContent = "💎";
    else userAvatar.textContent = "👤";
}

async function enviarMensagem(texto) {
    if (!texto.trim() || !usuarioAtual) return;
    
    const cmd = texto.toLowerCase().trim();
    if (cmd === '/cls') { await limparChat(usuarioAtual); return; }
    if (cmd.startsWith('/kick')) { await kickUser(texto, usuarioAtual); return; }
    if (cmd.startsWith('/gunto')) { await enviarGunto(texto, usuarioAtual); return; }
    if (cmd === '/gartic') { await iniciarGartic(); return; }
    if (cmd === '/snake') { iniciarSnake(); return; }
    
    await adicionarXP(usuarioAtual, XP_POR_MSG);
    await db.collection('mensagens').add({
        usuario: usuarioAtual,
        texto: texto,
        timestamp: new Date(),
        hora: getHora()
    });
}

function carregarMensagens() {
    db.collection('mensagens').orderBy('timestamp', 'asc').onSnapshot((snap) => {
        if (snap.empty) {
            messagesDiv.innerHTML = '<div class="welcome-box">💙 BLUE CHAT<br>🎨 /gartic | 🐍 /snake | 📷 Envie fotos!</div>';
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
    usuarioAtual = nome;
    localStorage.setItem('chatUsername', nome);
    await carregarUsuario();
    await enviarMsgSistema(`${nome} entrou no chat 💙`);
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

// EVENTOS
loginBtn.onclick = entrarChat;
sendBtn.onclick = () => { enviarMensagem(messageInput.value); messageInput.value = ''; };
messageInput.onkeypress = (e) => { if (e.key === 'Enter') { enviarMensagem(messageInput.value); messageInput.value = ''; } };
loginInput.onkeypress = (e) => { if (e.key === 'Enter') entrarChat(); };

let typingTime;
messageInput.oninput = () => {
    if (messageInput.value.length > 0 && usuarioAtual) {
        typingIndicator.textContent = `${usuarioAtual} digitando...`;
        clearTimeout(typingTime);
        typingTime = setTimeout(() => typingIndicator.textContent = '', 1000);
    }
};

// Configurar ferramentas do Gartic
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.onclick = () => {
        if (btn.dataset.clear) {
            const canvas = document.getElementById('garticCanvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (usuarioAtual === desenhistaAtual) {
                const imgData = canvas.toDataURL();
                db.collection('garticDesenho').doc('atual').set({ imagem: imgData, timestamp: new Date() });
            }
        } else if (btn.dataset.color) {
            corAtual = btn.dataset.color;
            const canvas = document.getElementById('garticCanvas');
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = corAtual;
        }
    };
});

const brushSize = document.getElementById('brushSize');
if (brushSize) {
    brushSize.oninput = (e) => {
        tamanhoPincel = parseInt(e.target.value);
        const canvas = document.getElementById('garticCanvas');
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = tamanhoPincel;
        document.getElementById('brushValue').innerText = tamanhoPincel + 'px';
    };
}

document.getElementById('garticGuessBtn')?.addEventListener('click', () => {
    const input = document.getElementById('garticGuess');
    palpiteGartic(input.value);
    input.value = '';
});

document.getElementById('garticGuess')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        palpiteGartic(e.target.value);
        e.target.value = '';
    }
});

document.getElementById('snakeRestartBtn')?.addEventListener('click', () => {
    if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    iniciarSnake();
});

window.addEventListener('keydown', (e) => {
    if (snakeModal.style.display === 'flex') handleSnakeKey(e);
});

// INICIAR
const salvo = localStorage.getItem('chatUsername');
if (salvo && loginInput) { loginInput.value = salvo; entrarChat(); }
carregarMensagens();
setInterval(async () => { const snap = await db.collection('usuarios').get(); onlineCountSpan.textContent = snap.size; }, 5000);

console.log("✅ CHAT PRONTO! Comandos: /gunto, /kick, /cls, /gartic, /snake | 📷 Envie fotos!");
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
// ENVIO DE FOTOS
// ============================================
if (photoBtn) {
    photoBtn.onclick = () => {
        if (photoModal) photoModal.style.display = 'flex';
        if (photoInput) photoInput.value = '';
        if (photoPreview) photoPreview.innerHTML = '';
    };
}

document.querySelectorAll('.close-modal, .close-gartic, .close-snake').forEach(el => {
    if (el) {
        el.onclick = () => {
            if (photoModal) photoModal.style.display = 'none';
            if (garticModal) garticModal.style.display = 'none';
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
                timestamp: new Date(),
                hora: getHora()
            });
            
            await adicionarXP(usuarioAtual, 5);
            if (photoModal) photoModal.style.display = 'none';
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
// JOGO DA COBRA
// ============================================
function iniciarSnake() {
    if (snakeGame.gameLoop) clearInterval(snakeGame.gameLoop);
    
    snakeGame.canvas = document.getElementById('snakeCanvas');
    if (!snakeGame.canvas) return;
    snakeGame.ctx = snakeGame.canvas.getContext('2d');
    snakeGame.canvas.width = 400;
    snakeGame.canvas.height = 400;
    
    snakeGame.snake = [{x: 10, y: 10}];
    snakeGame.direction = 'RIGHT';
    snakeGame.score = 0;
    snakeGame.gameRunning = true;
    const scoreSpan = document.getElementById('snakeScore');
    if (scoreSpan) scoreSpan.innerText = '0';
    
    gerarComida();
    desenharSnake();
    
    snakeGame.gameLoop = setInterval(atualizarSnake, 100);
    if (snakeModal) snakeModal.style.display = 'flex';
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
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(snakeGame.food.x * 20, snakeGame.food.y * 20, 18, 18);
    
    snakeGame.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#42a5f5' : '#1565c0';
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
// GARTIC SINCRONIZADO EM TEMPO REAL
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
    
    // Limpar desenhos anteriores
    await db.collection('garticTraco').doc('sessao').delete().catch(() => {});
    
    await enviarMsgSistema(`🎨 GARTIC INICIADO! ${desenhistaAtual} é o desenhista! Adivinhe a palavra! 🎨`);
    abrirModalGartic();
    iniciarTimerGartic();
    return true;
}

function abrirModalGartic() {
    const canvas = document.getElementById('garticCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 500;
    canvas.height = 400;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = corAtual;
    ctx.lineWidth = tamanhoPincel;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const wordDisplay = document.getElementById('garticWordDisplay');
    const drawerInfo = document.getElementById('garticDrawerInfo');
    
    if (usuarioAtual === desenhistaAtual) {
        if (wordDisplay) wordDisplay.innerHTML = `🎨 Desenhando: <strong style="color:#42a5f5">${palavraSecreta}</strong>`;
        if (drawerInfo) drawerInfo.innerHTML = "🎨 Você é o DESENHISTA! Desenhe a palavra!";
    } else {
        if (wordDisplay) wordDisplay.innerHTML = "❓ Adivinhe o desenho! ❓";
        if (drawerInfo) drawerInfo.innerHTML = `🎨 Desenhista: ${desenhistaAtual}`;
    }
    
    const historyDiv = document.getElementById('guessHistory');
    if (historyDiv) historyDiv.innerHTML = '';
    if (garticModal) garticModal.style.display = 'flex';
    
    // Carregar traços anteriores
    carregarTraços();
    configurarCanvasGartic();
}

// SALVAR TRAÇO NO FIREBASE
async function salvarTraco(x1, y1, x2, y2, cor, tamanho) {
    if (usuarioAtual !== desenhistaAtual) return;
    
    await db.collection('garticTraco').add({
        x1: x1, y1: y1, x2: x2, y2: y2,
        cor: cor,
        tamanho: tamanho,
        timestamp: new Date(),
        sessao: 'sessao'
    });
}

// CARREGAR TRAÇOS DO FIREBASE
function carregarTraços() {
    db.collection('garticTraco')
        .where('sessao', '==', 'sessao')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            const canvas = document.getElementById('garticCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            // Se for o desenhista, não redesenha tudo (ele já desenha em tempo real)
            if (usuarioAtual === desenhistaAtual) return;
            
            // Redesenhar todos os traços
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            snapshot.forEach((doc) => {
                const traco = doc.data();
                ctx.beginPath();
                ctx.strokeStyle = traco.cor;
                ctx.lineWidth = traco.tamanho;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(traco.x1, traco.y1);
                ctx.lineTo(traco.x2, traco.y2);
                ctx.stroke();
            });
        });
}

function configurarCanvasGartic() {
    const canvas = document.getElementById('garticCanvas');
    if (!canvas) return;
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
    
    function startDrawing(e) {
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
        
        // Desenhar localmente
        ctx.beginPath();
        ctx.moveTo(ultimaX, ultimaY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // Salvar traço no Firebase para outros verem
        salvarTraco(ultimaX, ultimaY, x, y, corAtual, tamanhoPincel);
        
        ultimaX = x;
        ultimaY = y;
    }
    
    function stopDrawing(e) {
        desenhando = false;
        e.preventDefault();
    }
    
    canvas.removeEventListener('mousedown', startDrawing);
    canvas.removeEventListener('mousemove', draw);
    canvas.removeEventListener('mouseup', stopDrawing);
    canvas.removeEventListener('touchstart', startDrawing);
    canvas.removeEventListener('touchmove', draw);
    canvas.removeEventListener('touchend', stopDrawing);
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
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
        if (history) {
            const item = document.createElement('div');
            item.innerHTML = `<span style="color:#42a5f5">${usuarioAtual}</span> palpitou: "${palpite}" ❌`;
            history.appendChild(item);
        }
    }
}

function fecharGartic() {
    garticAtivo = false;
    if (timerInterval) clearInterval(timerInterval);
    if (garticModal) garticModal.style.display = 'none';
    // Limpar traços da sessão
    db.collection('garticTraco').where('sessao', '==', 'sessao').get().then((snap) => {
        snap.forEach(doc => doc.ref.delete());
    });
}

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
    
    if (userNameSpan) userNameSpan.textContent = usuarioAtual;
    const nivel = dadosUsuario.nivel || 1;
    if (userLevelSpan) userLevelSpan.textContent = `Nv.${nivel}`;
    if (userTitleSpan) userTitleSpan.textContent = getTitulo(nivel);
    const xpAtual = (dadosUsuario.xp || 0) % 100;
    const percentual = (xpAtual / 100) * 100;
    if (xpBarFill) xpBarFill.style.width = `${percentual}%`;
    if (xpTextSpan) xpTextSpan.textContent = `${xpAtual}/100 XP`;
    if (userAvatar) {
        if (nivel >= 20) userAvatar.textContent = "👑";
        else if (nivel >= 10) userAvatar.textContent = "💎";
        else userAvatar.textContent = "👤";
    }
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
        if (!messagesDiv) return;
        if (snap.empty) {
            messagesDiv.innerHTML = '<div class="welcome-box">💙 BLUE CHAT<br>🎨 /gartic | 🐍 /snake | 📷 clique na câmera para enviar fotos!</div>';
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
                            <img src="${msg.imagemUrl}" class="message-image" onclick="window.open('${msg.imagemUrl}')" style="max-width:200px; max-height:150px; border-radius:10px; cursor:pointer;">
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
    if (telaLogin) telaLogin.style.display = 'none';
    if (telaChat) telaChat.style.display = 'flex';
    if (messageInput) messageInput.focus();
}

// EVENTOS
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

// Configurar ferramentas do Gartic
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.onclick = () => {
        if (btn.dataset.clear) {
            const canvas = document.getElementById('garticCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Limpar traços do Firebase
                db.collection('garticTraco').where('sessao', '==', 'sessao').get().then((snap) => {
                    snap.forEach(doc => doc.ref.delete());
                });
            }
        } else if (btn.dataset.color) {
            corAtual = btn.dataset.color;
            const canvas = document.getElementById('garticCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.strokeStyle = corAtual;
            }
        }
    };
});

const brushSizeEl = document.getElementById('brushSize');
if (brushSizeEl) {
    brushSizeEl.oninput = (e) => {
        tamanhoPincel = parseInt(e.target.value);
        const canvas = document.getElementById('garticCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = tamanhoPincel;
        }
        const brushValue = document.getElementById('brushValue');
        if (brushValue) brushValue.innerText = tamanhoPincel + 'px';
    };
}

const garticGuessBtn = document.getElementById('garticGuessBtn');
if (garticGuessBtn) {
    garticGuessBtn.addEventListener('click', () => {
        const input = document.getElementById('garticGuess');
        if (input) {
            palpiteGartic(input.value);
            input.value = '';
        }
    });
}

const garticGuess = document.getElementById('garticGuess');
if (garticGuess) {
    garticGuess.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            palpiteGartic(e.target.value);
            e.target.value = '';
        }
    });
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

// INICIAR
const salvo = localStorage.getItem('chatUsername');
if (salvo && loginInput) { loginInput.value = salvo; entrarChat(); }
carregarMensagens();
setInterval(async () => { const snap = await db.collection('usuarios').get(); if (onlineCountSpan) onlineCountSpan.textContent = snap.size; }, 5000);

console.log("✅ CHAT PRONTO! Gartic sincronizado! Comandos: /gunto, /kick, /cls, /gartic, /snake | 📷 Envie fotos!");
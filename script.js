// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyC5yWUgfpwD3g6FU1VKhHiZW2Q1XBs_TWs",
    authDomain: "chat-79da1.firebaseapp.com",
    projectId: "chat-79da1",
    storageBucket: "chat-79da1.firebasestorage.app",
    messagingSenderId: "832541118241",
    appId: "1:832541118241:web:5d3c8e2650877106b13860",
    measurementId: "G-C0N1M4Q99F"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// SISTEMA DE XP E NÍVEIS
// ============================================
const XP_POR_MSG = 5;
const XP_POR_NIVEL = 100;

function getTituloPorNivel(nivel) {
    if (nivel >= 20) return "👑 LENDA 👑";
    if (nivel >= 15) return "⚡ MESTRE ⚡";
    if (nivel >= 10) return "💎 ÉLITE 💎";
    if (nivel >= 5) return "🏆 VETERANO 🏆";
    if (nivel >= 3) return "📈 APRENDIZ 📈";
    return "⭐ INICIANTE ⭐";
}

function calcularNivel(xp) { return Math.floor(xp / XP_POR_NIVEL) + 1; }
function getXpAtual(xp) { return xp % XP_POR_NIVEL; }

let usuarioAtual = null;
let dadosUsuario = null;
let mensagensCache = new Set();

// Elementos DOM
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

function getHoraAtual() {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// VARIÁVEIS DOS JOGOS
// ============================================
let jogoAtivo = false;
let palavraAtual = "";
let letrasAdivinhadas = [];
let tentativasRestantes = 6;

let garticAtivo = false;
let palavraSecreta = "";
let desenhistaAtual = "";
let tempoRestante = 60;
let timerInterval = null;
let desenhando = false;
let ultimaX = 0, ultimaY = 0;
let corAtual = "#000000";
let tamanhoPincel = 3;
let guntoTimeout = null;

const palavrasForca = [
    "HACKER", "MATRIX", "SISTEMA", "FIREBASE", "TERMINAL",
    "CODIGO", "SENHA", "CRIPTOGRAFIA", "ALGORITIMO", "PROTOCOLO"
];

const palavrasGartic = [
    "CASA", "CARRO", "CACHORRO", "GATO", "SOL", "LUA", "ESTRELA",
    "FLOR", "ARVORE", "MONTANHA", "RIO", "MAR", "PRAIA", "CHUVA",
    "FOGO", "GELO", "VENTO", "NUVEM", "ARCO-IRIS", "BORBOLETA"
];

// ============================================
// COMANDO GUNTO
// ============================================
function mostrarGuntoAlert(mensagem, autor) {
    const alertDiv = document.getElementById('guntoAlert');
    if (guntoTimeout) clearTimeout(guntoTimeout);
    
    alertDiv.innerHTML = `🔫 ${autor} DISPAROU!<br>💙 ${mensagem} 💙`;
    alertDiv.style.display = 'flex';
    
    guntoTimeout = setTimeout(() => {
        alertDiv.style.display = 'none';
        guntoTimeout = null;
    }, 5000);
}

// ============================================
// COMANDO CLS
// ============================================
async function executarCls(autor) {
    try {
        const snapshot = await db.collection('mensagens').get();
        const batch = db.batch();
        snapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        mensagensCache.clear();
        await enviarMensagemSistema(`🗑️ Todas as mensagens foram limpas por ${autor}!`);
    } catch (error) {
        console.error("Erro ao limpar:", error);
    }
}

// ============================================
// COMANDO KICK
// ============================================
async function executarKick(mensagem, autor) {
    const partes = mensagem.split(' ');
    const alvo = partes[1]?.replace('@', '');
    
    if (!alvo) {
        enviarMensagemSistema("Uso correto: /kick @usuario");
        return true;
    }
    
    if (autor === alvo) {
        enviarMensagemSistema(`${autor} tentou se kickar mas falhou! 🤡`);
        return true;
    }
    
    const autorRef = await db.collection('usuarios').doc(autor).get();
    const autorNivel = autorRef.exists ? (autorRef.data().nivel || 1) : 1;
    
    if (autorNivel < 5) {
        enviarMensagemSistema(`${autor} tentou kickar mas precisa ser nível 5+!`);
        return true;
    }
    
    await enviarMensagemSistema(`💀 ${alvo} foi EXPULSO do chat por ${autor}! 💀`);
    
    if (alvo === usuarioAtual) {
        setTimeout(() => {
            localStorage.removeItem('chatUsername');
            location.reload();
        }, 2000);
    }
    return true;
}

// ============================================
// JOGO DA FORCA
// ============================================
async function executarForca() {
    if (jogoAtivo) {
        await enviarMensagemSistema("Já tem um jogo da forca ativo!");
        return true;
    }
    
    jogoAtivo = true;
    palavraAtual = palavrasForca[Math.floor(Math.random() * palavrasForca.length)];
    letrasAdivinhadas = [];
    tentativasRestantes = 6;
    
    mostrarModalForca();
    return true;
}

function mostrarModalForca() {
    const modal = document.createElement('div');
    modal.className = 'hangman-modal';
    modal.id = 'hangmanModal';
    
    function atualizarModal() {
        const palavraExibida = palavraAtual.split('').map(letra => 
            letrasAdivinhadas.includes(letra) ? letra : '_'
        ).join(' ');
        
        modal.innerHTML = `
            <div class="hangman-content">
                <h2>🪢 JOGO DA FORCA</h2>
                <div class="hangman-word">${palavraExibida}</div>
                <div class="hangman-attempts">💀 Tentativas: ${tentativasRestantes} / 6</div>
                <input type="text" maxlength="1" placeholder="?" class="hangman-input" id="hangmanLetter" autocomplete="off">
                <div><button id="hangmanGuessBtn">ADIVINHAR</button><button id="hangmanCloseBtn">FECHAR</button></div>
                <div style="margin-top:15px;font-size:12px;color:#666;">Letras usadas: ${letrasAdivinhadas.join(', ') || 'nenhuma'}</div>
            </div>
        `;
        
        const input = modal.querySelector('#hangmanLetter');
        const guessBtn = modal.querySelector('#hangmanGuessBtn');
        const closeBtn = modal.querySelector('#hangmanCloseBtn');
        
        guessBtn.onclick = async () => {
            const letra = input.value.toUpperCase();
            if (!letra || letra.length !== 1) return;
            if (letrasAdivinhadas.includes(letra)) {
                await enviarMensagemSistema(`Letra "${letra}" já foi usada!`);
                input.value = '';
                return;
            }
            
            letrasAdivinhadas.push(letra);
            
            if (palavraAtual.includes(letra)) {
                await enviarMensagemSistema(`✅ Letra "${letra}" está na palavra!`);
                const palavraCompleta = palavraAtual.split('').every(l => letrasAdivinhadas.includes(l));
                if (palavraCompleta) {
                    await enviarMensagemSistema(`🎉 ${usuarioAtual} acertou a palavra "${palavraAtual}" e ganhou +50 XP! 🎉`);
                    await adicionarXP(usuarioAtual, 50);
                    jogoAtivo = false;
                    modal.remove();
                } else {
                    atualizarModal();
                }
            } else {
                tentativasRestantes--;
                await enviarMensagemSistema(`❌ Letra "${letra}" não está na palavra!`);
                if (tentativasRestantes <= 0) {
                    await enviarMensagemSistema(`💀 FIM DE JOGO! A palavra era "${palavraAtual}"! 💀`);
                    jogoAtivo = false;
                    modal.remove();
                } else {
                    atualizarModal();
                }
            }
            input.value = '';
            input.focus();
        };
        
        closeBtn.onclick = () => {
            jogoAtivo = false;
            modal.remove();
        };
        
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') guessBtn.click(); });
    }
    
    atualizarModal();
    document.body.appendChild(modal);
}

// ============================================
// JOGO GARTIC
// ============================================
async function executarGartic() {
    if (garticAtivo) {
        await enviarMensagemSistema("🎨 Já tem um jogo Gartic ativo!");
        return true;
    }
    
    garticAtivo = true;
    palavraSecreta = palavrasGartic[Math.floor(Math.random() * palavrasGartic.length)];
    desenhistaAtual = usuarioAtual;
    tempoRestante = 60;
    
    await enviarMensagemSistema(`🎨 GARTIC INICIADO! ${desenhistaAtual} é o desenhista! Adivinhe a palavra! 🎨`);
    abrirModalGartic();
    iniciarTimerGartic();
    return true;
}

function abrirModalGartic() {
    const modal = document.getElementById('garticModal');
    const canvas = document.getElementById('garticCanvas');
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
        wordDisplay.innerHTML = `🎨 Desenhando: <strong style="color:#42a5f5">${palavraSecreta}</strong>`;
        drawerInfo.innerHTML = `🎨 Você é o DESENHISTA!`;
        enableDrawing(true);
    } else {
        wordDisplay.innerHTML = `❓ Adivinhe o desenho! ❓`;
        drawerInfo.innerHTML = `🎨 Desenhista: ${desenhistaAtual}`;
        enableDrawing(false);
    }
    
    modal.style.display = 'flex';
    setupCanvasEvents();
    document.getElementById('guessHistory').innerHTML = '';
}

function enableDrawing(enable) {
    const canvas = document.getElementById('garticCanvas');
    canvas.style.cursor = enable ? 'crosshair' : 'not-allowed';
}

function setupCanvasEvents() {
    const canvas = document.getElementById('garticCanvas');
    const ctx = canvas.getContext('2d');
    
    function getCoordenadas(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        let x = (clientX - rect.left) * scaleX;
        let y = (clientY - rect.top) * scaleY;
        x = Math.max(0, Math.min(canvas.width, x));
        y = Math.max(0, Math.min(canvas.height, y));
        return { x, y };
    }
    
    function startDrawing(e) {
        if (usuarioAtual !== desenhistaAtual) return;
        e.preventDefault();
        desenhando = true;
        const { x, y } = getCoordenadas(e);
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
        const { x, y } = getCoordenadas(e);
        ctx.beginPath();
        ctx.moveTo(ultimaX, ultimaY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ultimaX = x;
        ultimaY = y;
        
        const imageData = canvas.toDataURL();
        db.collection('garticDesenho').doc('atual').set({ imagem: imageData, timestamp: new Date() });
    }
    
    function stopDrawing(e) { desenhando = false; e.preventDefault(); }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
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
        timerDisplay.innerHTML = `⏱️ ${tempoRestante}s`;
        if (tempoRestante <= 0) {
            clearInterval(timerInterval);
            await enviarMensagemSistema(`⏰ TEMPO ESGOTADO! A palavra era "${palavraSecreta}"!`);
            fecharGartic();
        }
    }, 1000);
}

async function palpiteGartic(palpite, usuario) {
    if (!garticAtivo) return false;
    if (usuario === desenhistaAtual) return false;
    
    if (palpite.toUpperCase() === palavraSecreta) {
        await enviarMensagemSistema(`🎉 ${usuario} ACERTOU! A palavra era "${palavraSecreta}"! Ganhou +30 XP! 🎉`);
        await adicionarXP(usuario, 30);
        await adicionarXP(desenhistaAtual, 20);
        await enviarMensagemSistema(`🎨 ${desenhistaAtual} ganhou +20 XP por desenhar!`);
        fecharGartic();
        return true;
    } else {
        await enviarMensagemSistema(`❌ ${usuario} palpitou: "${palpite}" - ERRADO!`);
        const historyDiv = document.getElementById('guessHistory');
        const guessItem = document.createElement('div');
        guessItem.className = 'guess-item';
        guessItem.innerHTML = `<span style="color:#ff9800">${usuario}</span> palpitou: "${palpite}" ❌`;
        historyDiv.appendChild(guessItem);
        return false;
    }
}

function fecharGartic() {
    garticAtivo = false;
    if (timerInterval) clearInterval(timerInterval);
    const modal = document.getElementById('garticModal');
    if (modal) modal.style.display = 'none';
}

db.collection('garticDesenho').doc('atual').onSnapshot((doc) => {
    if (doc.exists && garticAtivo && usuarioAtual !== desenhistaAtual) {
        const imagem = doc.data().imagem;
        const canvas = document.getElementById('garticCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = imagem;
    }
});

// ============================================
// PROCESSAR COMANDOS
// ============================================
async function processarComando(mensagem, usuario) {
    const cmd = mensagem.toLowerCase().trim();
    
    if (cmd === '/cls') { await executarCls(usuario); return true; }
    if (cmd.startsWith('/kick')) { await executarKick(mensagem, usuario); return true; }
    if (cmd === '/forca') { await executarForca(); return true; }
    if (cmd === '/gartic') { await executarGartic(); return true; }
    
    return false;
}

// Escutar alertas do Firebase
db.collection('alertas').onSnapshot((snapshot) => {
    snapshot.forEach((doc) => {
        const alerta = doc.data();
        if (alerta.tipo === 'gunto') {
            mostrarGuntoAlert(alerta.mensagem, alerta.autor);
            doc.ref.delete();
        }
    });
});

// ============================================
// SISTEMA DE MENSAGENS
// ============================================
async function adicionarXP(username, quantidade) {
    try {
        const userRef = db.collection('usuarios').doc(username);
        const userDoc = await userRef.get();
        let xpAtual = quantidade;
        if (userDoc.exists) xpAtual = (userDoc.data().xp || 0) + quantidade;
        const novoNivel = calcularNivel(xpAtual);
        await userRef.set({ nome: username, xp: xpAtual, nivel: novoNivel }, { merge: true });
        if (username === usuarioAtual) await carregarDadosUsuario();
    } catch (error) { console.error("Erro XP:", error); }
}

async function carregarDadosUsuario() {
    if (!usuarioAtual) return;
    const userRef = db.collection('usuarios').doc(usuarioAtual);
    const userDoc = await userRef.get();
    dadosUsuario = userDoc.exists ? userDoc.data() : { nome: usuarioAtual, xp: 0, nivel: 1 };
    if (!userDoc.exists) await userRef.set(dadosUsuario);
    atualizarInterface();
}

function atualizarInterface() {
    if (!dadosUsuario) return;
    const nivel = dadosUsuario.nivel || 1;
    const xp = dadosUsuario.xp || 0;
    const xpAtual = getXpAtual(xp);
    const percentual = (xpAtual / XP_POR_NIVEL) * 100;
    userNameSpan.textContent = usuarioAtual;
    userLevelSpan.textContent = `Nv. ${nivel}`;
    userTitleSpan.textContent = getTituloPorNivel(nivel);
    xpBarFill.style.width = `${percentual}%`;
    xpTextSpan.textContent = `${xpAtual}/${XP_POR_NIVEL} XP`;
    if (nivel >= 20) userAvatar.textContent = "👑";
    else if (nivel >= 10) userAvatar.textContent = "💎";
    else if (nivel >= 5) userAvatar.textContent = "🏆";
    else userAvatar.textContent = "👤";
}

async function enviarMensagemFirebase(conteudo) {
    if (!conteudo.trim() || !usuarioAtual) return;
    
    // Verificar se é comando
    const isComando = await processarComando(conteudo, usuarioAtual);
    if (isComando) return;
    
    // Verificar se é palpite do Gartic
    if (conteudo.startsWith('/')) return;
    
    // Se for mensagem normal, enviar
    await adicionarXP(usuarioAtual, XP_POR_MSG);
    const userRef = db.collection('usuarios').doc(usuarioAtual);
    const userDoc = await userRef.get();
    const nivel = userDoc.exists ? (userDoc.data().nivel || 1) : 1;
    const titulo = getTituloPorNivel(nivel);
    
    await db.collection('mensagens').add({
        usuario: usuarioAtual,
        texto: conteudo,
        nivel: nivel,
        titulo: titulo,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        hora: getHoraAtual()
    });
}

async function enviarMensagemSistema(texto) {
    await db.collection('mensagens').add({
        usuario: '💙 SISTEMA',
        texto: texto,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        hora: getHoraAtual(),
        isSystem: true
    });
}

function carregarMensagens() {
    db.collection('mensagens').orderBy('timestamp', 'asc').onSnapshot((snapshot) => {
        let html = '';
        let mensagensTemp = [];
        
        snapshot.forEach((doc) => {
            mensagensTemp.push({ id: doc.id, ...doc.data() });
        });
        
        if (mensagensTemp.length === 0) {
            messagesDiv.innerHTML = `<div class="welcome-box">💙 BLUE CHAT 💙<br>🎨 /gartic | 🔫 /gunto | 👢 /kick | 🗑️ /cls | 🪢 /forca</div>`;
            return;
        }
        
        mensagensTemp.forEach((msg) => {
            if (msg.isSystem) {
                html += `<div class="system-message">💙 ${msg.texto}</div>`;
            } else {
                const isOwn = usuarioAtual === msg.usuario;
                const messageClass = isOwn ? 'message-own' : 'message-other';
                html += `
                    <div class="message ${messageClass}">
                        <div class="message-info">
                            ${!isOwn ? `<span class="message-name">${msg.usuario}</span>` : ''}
                            ${msg.nivel ? `<span class="message-level">Nv.${msg.nivel}</span>` : ''}
                            ${msg.titulo ? `<span class="message-title">${msg.titulo}</span>` : ''}
                            <span class="message-time">${msg.hora || 'agora'}</span>
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

async function atualizarOnlineCount() {
    const snapshot = await db.collection('usuarios').get();
    onlineCountSpan.textContent = snapshot.size;
}

async function entrarNoChat() {
    const nome = loginInput.value.trim();
    if (!nome) return alert('Digite seu nome!');
    if (nome.length > 20) return alert('Nome muito longo!');
    usuarioAtual = nome;
    localStorage.setItem('chatUsername', nome);
    await carregarDadosUsuario();
    await enviarMensagemSistema(`${nome} entrou no chat! 💙`);
    telaLogin.style.display = 'none';
    telaChat.style.display = 'flex';
    messageInput.focus();
}

function enviarMensagem() {
    const texto = messageInput.value.trim();
    if (!texto) return;
    enviarMensagemFirebase(texto);
    messageInput.value = '';
}

// ============================================
// EVENTOS
// ============================================
let timeoutTyping;
messageInput.addEventListener('input', () => {
    if (messageInput.value.length > 0 && usuarioAtual) {
        typingIndicator.textContent = `${usuarioAtual} está digitando...`;
        clearTimeout(timeoutTyping);
        timeoutTyping = setTimeout(() => {
            typingIndicator.textContent = '';
        }, 1000);
    }
});

// Configurar ferramentas do Gartic
document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('tool-btn')) {
        if (e.target.dataset.clear) {
            const canvas = document.getElementById('garticCanvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (usuarioAtual === desenhistaAtual) {
                const imageData = canvas.toDataURL();
                db.collection('garticDesenho').doc('atual').set({ imagem: imageData, timestamp: new Date() });
            }
        } else if (e.target.dataset.color) {
            corAtual = e.target.dataset.color;
            const canvas = document.getElementById('garticCanvas');
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = corAtual;
        }
    }
});

const brushSize = document.getElementById('garticBrushSize');
if (brushSize) {
    brushSize.addEventListener('input', (e) => {
        tamanhoPincel = parseInt(e.target.value);
        const canvas = document.getElementById('garticCanvas');
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = tamanhoPincel;
        const span = document.getElementById('brushSizeValue');
        if (span) span.innerText = tamanhoPincel + 'px';
    });
}

const guessBtn = document.getElementById('garticGuessBtn');
if (guessBtn) {
    guessBtn.addEventListener('click', async () => {
        const input = document.getElementById('garticGuessInput');
        const palpite = input.value.trim();
        if (palpite && garticAtivo) {
            await palpiteGartic(palpite, usuarioAtual);
            input.value = '';
        }
    });
}

const guessInput = document.getElementById('garticGuessInput');
if (guessInput) {
    guessInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const palpite = guessInput.value.trim();
            if (palpite && garticAtivo) {
                await palpiteGartic(palpite, usuarioAtual);
                guessInput.value = '';
            }
        }
    });
}

const closeGartic = document.getElementById('garticCloseBtn');
if (closeGartic) closeGartic.addEventListener('click', () => fecharGartic());

loginBtn.addEventListener('click', entrarNoChat);
sendBtn.addEventListener('click', enviarMensagem);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagem(); });
loginInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') entrarNoChat(); });

const usuarioSalvo = localStorage.getItem('chatUsername');
if (usuarioSalvo) { loginInput.value = usuarioSalvo; entrarNoChat(); }

carregarMensagens();
setInterval(atualizarOnlineCount, 3000);
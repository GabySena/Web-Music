const entradaUrlServidor = document.getElementById('serverUrl');
const botaoConectar = document.getElementById('connectBtn');
const elementoStatus = document.getElementById('status');
const listaMusicasEl = document.getElementById('songList');
const audioEl = document.getElementById('audio');
const tocandoAgoraEl = document.getElementById('nowPlaying');

const urlSalva = localStorage.getItem('urlServidor') ?? localStorage.getItem('serverUrl');
if (urlSalva) entradaUrlServidor.value = urlSalva;

function juntarUrl(base, relativo) {
    try {
        return new URL(relativo, base).href;
    } catch {
        return base.replace(/\/+$/, '') + '/' + relativo.replace(/^\/+/, '');
    }
}

async function buscarJSON(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.json();
}

function definirStatus(mensagem) {
    elementoStatus.textContent = mensagem;
}

botaoConectar.addEventListener('click', async () => {
    const base = entradaUrlServidor.value.trim().replace(/\/$/, '');
    if (!base) { definirStatus('Informe a URL do servidor.'); return; }

    localStorage.setItem('urlServidor', base);
    localStorage.setItem('serverUrl', base);

    definirStatus('Conectando…');
    try {
        const saude = await buscarJSON(juntarUrl(base, '/api/saude'));
        definirStatus(`Conectado. ${saude.count} músicas disponíveis.`);
        const musicas = await buscarJSON(juntarUrl(base, '/api/musicas'));
        renderizarMusicas(base, musicas);
    } catch (erro) {
        definirStatus('Falha ao conectar. Verifique a URL e a rede.');
        console.error(erro);
    }
});

function renderizarMusicas(base, musicas) {
    listaMusicasEl.innerHTML = '';

    if (!musicas.length) {
        listaMusicasEl.innerHTML = '<li>Nenhuma música encontrada no servidor.</li>';
        return;
    }

    const tabelaMusicas = document.createElement('div');
    tabelaMusicas.className = 'tabela-musicas';
    listaMusicasEl.appendChild(tabelaMusicas);
    
    // Logo no topo
    const logoArea = document.createElement('div');
    logoArea.className = 'logo-area';
    const logoCell = document.createElement('div');
    logoCell.className = 'logo-cell';
    logoCell.innerHTML = '<img src="../static/assets/logo.png" alt="Logo Vinilfy">';
    logoArea.appendChild(logoCell);
    tabelaMusicas.appendChild(logoArea);

    musicas.forEach((musica, index) => {
        const linha = document.createElement('div');
        linha.className = 'tabela-musicas-linha';
        
        const numCelula = document.createElement('div');
        numCelula.className = 'tabela-musicas-celula numero-musica';
        numCelula.textContent = (index + 1).toString().padStart(2, '0');
        
        const tituloCelula = document.createElement('div');
        tituloCelula.className = 'tabela-musicas-celula celula-titulo-musica';
        tituloCelula.innerHTML = `<div>${musica.title || '(Sem título)'}</div><small>${musica.artist || 'Desconhecido'}</small>`;
        
        const celulaTocar = document.createElement('div');
        celulaTocar.className = 'tabela-musicas-celula celula-tocar';
        const botaoTocar = document.createElement('button');
        botaoTocar.textContent = 'Tocar';
        botaoTocar.addEventListener('click', () => tocarMusica(base, musica));
        celulaTocar.appendChild(botaoTocar);
        
        linha.appendChild(numCelula);
        linha.appendChild(tituloCelula);
        linha.appendChild(celulaTocar);
        
        tabelaMusicas.appendChild(linha);
    });
}

// 🔹 Função de tocar música + salvar em Mais Tocadas + Histórico
function tocarMusica(base, musica) {
    const url = musica.url?.startsWith('http') ? musica.url : juntarUrl(base, musica.url);
    audioEl.src = url;
    audioEl.play().catch(console.error);
    tocandoAgoraEl.textContent = `Tocando: ${musica.title} — ${musica.artist}`;

    // Mais Tocadas
    let tocadas = JSON.parse(localStorage.getItem('maisTocadas')) || {};
    const key = `${musica.title} — ${musica.artist}`;
    tocadas[key] = (tocadas[key] || 0) + 1;
    localStorage.setItem('maisTocadas', JSON.stringify(tocadas));
    renderizarMaisTocadas();

    // Histórico (últimas 10)
    let historico = JSON.parse(localStorage.getItem('historico')) || [];
    historico.unshift({
        title: musica.title,
        artist: musica.artist,
        url: url,
        data: new Date().toLocaleString()
    });
    historico = historico.slice(0, 10);
    localStorage.setItem('historico', JSON.stringify(historico));
    renderizarHistorico();
}

// 🔹 Renderizar Mais Tocadas
function renderizarMaisTocadas() {
    const blocoMaisTocadas = document.querySelector('.blocozinho');
    blocoMaisTocadas.innerHTML = "";

    let tocadas = JSON.parse(localStorage.getItem('maisTocadas')) || {};
    let entradas = Object.entries(tocadas);

    if (entradas.length === 0) {
        blocoMaisTocadas.innerHTML = "<p style='margin:auto;color:#d85d51;font-size:20px;'>Nenhuma música tocada ainda ⭐</p>";
        return;
    }

    // ordenar do mais tocado para o menos
    entradas.sort((a, b) => b[1] - a[1]);

    entradas.slice(0, 5).forEach(([nome, qtd], i) => {
        const item = document.createElement('div');
        item.style.margin = "8px";
        item.style.color = "#5c2c2c";
        item.style.color = "#FFFFFF";
        item.style.color = "#d85d51";
        item.style.fontFamily = "Shrikhand";
        item.innerHTML = `${i+1}. ${nome} <span style="color:#d85d51;">(${qtd}x)</span>`;
        blocoMaisTocadas.appendChild(item);
    });
}

// 🔹 Renderizar Histórico
function renderizarHistorico() {
    const blocoHistorico = document.querySelector('.blocoHistorico');
    blocoHistorico.innerHTML = "<h1 class='tituloHistorico'>Histórico</h1>"; 

    let historico = JSON.parse(localStorage.getItem('historico')) || [];

    if (historico.length === 0) {
        blocoHistorico.innerHTML += "<p style='margin:auto;color:#d85d51;font-size:20px;'>Nenhuma música no histórico 🎵</p>";
        return;
    }

    historico.forEach((musica) => {
        const item = document.createElement('div');
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.margin = "10px";
        item.style.borderBottom = "1px solid #d85d51";
        item.style.padding = "5px 0";

        item.innerHTML = `
            <div style="flex:1;">
                <strong style="color:#d85d51;">${musica.title}</strong> — <small style="color:#d85d51;">${musica.artist}</small><br>
                <span style="font-size:12px;color:#d85d51;">${musica.data}</span>
            </div>
            <button style="background:none;border:none;color:#d85d51;cursor:pointer;">▶</button>
        `;

        item.querySelector("button").addEventListener("click", () => {
            audioEl.src = musica.url;
            audioEl.play().catch(console.error);
            tocandoAgoraEl.textContent = `Tocando: ${musica.title} — ${musica.artist}`;
        });

        blocoHistorico.appendChild(item);
    });
}

// Inicializar na abertura da página
document.addEventListener("DOMContentLoaded", () => {
    renderizarMaisTocadas();
    renderizarHistorico();
});

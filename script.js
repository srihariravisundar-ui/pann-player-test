/**
 * Pann - Web3 Interactive Music Player
 * 100% Transparent Architecture & Zero-Fetch Metadata
 */

const CONSTANTS = {
    CONTRACT_ADDRESS: "0xb6dae651468e9593e4581705a09c10a76ac1e0c8",
    RPC_URL: "https://cloudflare-eth.com", 
    IPFS_GATEWAYS: [
        "https://cloudflare-ipfs.com/ipfs/",
        "https://dweb.link/ipfs/",
        "https://ipfs.io/ipfs/"
    ]
};

const TOKEN_MAP = {
    1: 'Strings', 2: 'Winds', 3: 'Ambience', 4: 'Rhythm', 5: 'Traditional',
    6: 'Voices', 7: 'Guitars', 8: 'Keys', 9: 'Electronic'
};

const ARTISTS = [
    "Pradeep Kumar", "Anthony Daasan", "Kalyani Nair", "Susha", "Ghana NB", 
    "Vidhya Vijay", "Sujith Sreedhar", "Rakesh", "Manoj Y D", "Pravekha", 
    "M S Yeshwanth", "Praveen Sparsh", "Tapass Naresh", "Kanaxx", "Manonmani", 
    "Ramana Balachandran", "Padmaja Sreenivasan", "Samanvitha G. Sasidaran", 
    "Sushmita Narasimhan", "Nidhi Saraogi", "Sriradha Bharath", "Avantika K", 
    "Fathima Henna", "Pranjal Thakore", "Manoj Krishna", "Himanshu Barot", 
    "Manikandan Chembai", "Aditya Ravindran", "Solomon Ravindar", "Karthik Manickavasakam", 
    "Naveen Narendranath", "Rithu Vysakh", "Nikhil Ram", "Mylai M Karthikeyan", 
    "Bharath Sankar", "Amrit", "Aarvay", "Radar with a K", "Keba Jeremiah", 
    "Shallu Varun", "Jhanu", "Metapurse"
];

// HARDCODED METADATA - Completely bypasses IPFS 429 Rate Limits
const PANN_METADATA = {
    "layout": {
        "layers": [
            { "id": "Strings", "token-id": 1, "states": { "options": [ { "uri": "QmbmRmMToTbS6NQRC2BNEjVHHp9P6yNRJGzwD62QnqFP7Y", "label": "Bright" }, { "uri": "QmWCWvSsBMiSdwg2ULf63ckgN8GaXWju4nZAJ6PRcmAgfo", "label": "Dark" }, { "uri": "QmZqBpUgr1yS3s8C4K36amxXMBBvMiTegV8JhA2zvq5vmT", "label": "Ambient" } ] } },
            { "id": "Winds", "token-id": 2, "states": { "options": [ { "uri": "Qmb3CLHtFbbQbpiZ5jebxjVPbv5bC6UFnezpqrpApSKmAL", "label": "Bamboo Flute" }, { "uri": "QmUiB45C58Q8mqHpXEt9KGbkvQscdcMqdrZCbM1NLwYpwV", "label": "Penny Whistle" }, { "uri": "QmUmJSCgCuXkJ9tJwLpExf4SxvnZNLySJ6ujSGwxTJ3Dmv", "label": "Melodica" }, { "uri": "QmdyJk4e1NAP3bWTXahE1EDykDbFsRjHc9xW2RVthxUULT", "label": "Nadaswaram" } ] } },
            { "id": "Ambience", "token-id": 3, "states": { "options": [ { "uri": "QmXzwiB3BK5wUfpTtYQ4RfC9Dw2i1VDsLVnyYSXPnfg3xt", "label": "Kurinji" }, { "uri": "QmW6vRQFSSqLDmWUxXgoRuU1siZEMDcoxzj8BKZ12kZGSa", "label": "Mullai" }, { "uri": "QmQNLJ9L3RmXzL5RwQR3KYaJbZ2Fz1RLZZJaicNzf5kiMJ", "label": "Marutham" }, { "uri": "QmVhTuuS9rNBNrAEVmcXfXchUGW6ZaBME91cwwGzBwDFyp", "label": "Neidhal" }, { "uri": "Qme6JxTt7odkQK1gDFUZaL6URTgUbHMo9GKEgKqbnKD2eM", "label": "Paalai" } ] } },
            { "id": "Rhythm", "token-id": 4, "states": { "options": [ { "uri": "QmaKqFEEQ2C4ygmHQAHFoN1aTH1t55Hofh5hZtCSkq99WF", "label": "Mridangam & Latin" }, { "uri": "QmNRLwMo4cCeLAp298me2WrPidGvsHubrbvrjuQjoqHkxq", "label": "Acoustic Drums" }, { "uri": "QmNWupbdybDgGHoqd6St2nBYijVF73vtTHwssWFGRssCtk", "label": "Folk" } ] } },
            { "id": "Traditional", "token-id": 5, "states": { "options": [ { "uri": "QmU19EK7gmy4wo8zaCZyfbabWrkxEgj15LowkZZszAJk7Y", "label": "Sarangi" }, { "uri": "QmStrZzJ33o8eF4XpQVXAvstrFcV1pzuKNof7wRj7gKE7f", "label": "Veena" }, { "uri": "QmZR9UZaMniXqB5REKiK4yDJbuAKTQtmoWtwQTKKKHDcp3", "label": "Slide Guitar - Live" } ] } },
            { "id": "Voices", "token-id": 6, "states": { "options": [ { "uri": "Qmadsy39UVhtsR9V5TUTqFpLpZLWfRvTUBApMdwQv7xyTq", "label": "Solo" }, { "uri": "QmQTxQauxBL9qbj6XbLT9zsmEhsZr6Zf6RgDhVpEEM3RCj", "label": "Folk voice" }, { "uri": "QmSnk8wDVUiBH5RBFoF2T3JZsnr4Z8Yp5Pp5ds1GGMNEwj", "label": "Choir" } ] } },
            { "id": "Guitars", "token-id": 7, "states": { "options": [ { "uri": "QmaJSSmhtY5tjx1eQPR5d4ZCdCiMxevzHAhsqwUE9z3FbS", "label": "Acoustic" }, { "uri": "QmWYuyydDJFNYsBkWgMjHMRCANmencFgTTPBFAGzwKpqi8", "label": "Electric" } ] } },
            { "id": "Keys", "token-id": 8, "states": { "options": [ { "uri": "Qme2Ykbfp8YaFq6A3U1BciXafZW6wsHPAuDhSfCWAiETUC", "label": "Piano" }, { "uri": "QmQYQGA3Voq8xR8y1qEe3fR5HucuZZ7TBG4wkBKG8Lcr56", "label": "Mallet - Live" } ] } },
            { "id": "Electronic", "token-id": 9, "states": { "options": [ { "uri": "QmSfv4ZcHqjS38zWErJaZfZMBKCCYxamXqkeih4GNVuaTu", "label": "Synth & Bass" }, { "uri": "QmW6SuYciNzd7CigdKArqnrZ4Q9By3LXsK65ftwUuRhFn5", "label": "Modular" }, { "uri": "QmVBpVcrBqJqoKGCHzLBUiynkFyRXJHiG38oKsJgGPB3QL", "label": "Live reactive layer" } ] } }
        ]
    },
    "audio-layout": {
        "layers": [
            { "token-id": 1, "states": { "options": [ { "uri": "QmUzMyhSm2HYYexMbZp5BjRJ5wqPTCRvKvDiU8udL5AHPM" }, { "uri": "QmXdM8k6Wje2BwHrigWUmcHAYQar9BfCkQcTMdPtqajWrN" }, { "uri": "QmTLcwbXoXgU2jWjqP7hBFFFtmEJiD22Y7bUw7uSem7UKp" } ] } },
            { "token-id": 2, "states": { "options": [ { "uri": "Qmc8t887PbT2poBxdXsfEqxUec673aiiREJRg9fnLxJTk7" }, { "uri": "QmWfK4k67yi3aPtJ74vo4tyg7zuxGUxEzLTsTEdLUtZbnK" }, { "uri": "QmUe5QD12QpMeHRMj924d1KQTXcTAPZ31QXZZc4iYxGdsc" }, { "uri": "QmRPpPzNQunUHGR5gtHi6Gjd8zb969yQcMHZNpHJ5ihePj" } ] } },
            { "token-id": 3, "states": { "options": [ { "uri": "QmfKFKHX8ptEwR7PECjPsofmkqT8hh3xueb3Hq27hGoVGj" }, { "uri": "QmbYZBUaeT6Ei25Xr9eRXtevLBtqQWEb8eEXJaUU71V9pW" }, { "uri": "QmXnHWdEnCxrgf2V3FBmSW8iaD1yBLcA4zt5ftzAshBJMy" }, { "uri": "QmX9Vpgka1FXq2HjzUhvuT7fNRgLtspdWVWfXd5fdpgymx" }, { "uri": "QmeMzFuXRU6UGkCHMv5hmYuoyZHxgGPCAuU8uBBuzNc6gL" } ] } },
            { "token-id": 4, "states": { "options": [ { "uri": "Qmd7tYFcQ2wfTi1agT8JkannB1VP8dSRypzAdY7ksvnim6" }, { "uri": "QmdwD8ix4qJmRB4SaEBuC8XV19UZR24j7fzmV8jiKBqtDG" }, { "uri": "QmV3ifuMB86MKe1GcPsZrRnSpuBkCkPfLJacqTvDD5gXPE" } ] } },
            { "token-id": 5, "states": { "options": [ { "uri": "QmRaVXfrm6kvhifNcAaCnbVFYdUY3RfbGTe68qnKhrD5tf" }, { "uri": "QmTvvHMtJdH9BsNeC7Fj3K2ZyoPKFCLo7hAHtu2Ke5VzTu" }, { "uri": "QmPGjwNkL7EncSw8oaemu74P4FArV9SFTvbL8jDNq63V9W" } ] } },
            { "token-id": 6, "states": { "options": [ { "uri": "QmVqTxhTDSxQXrgAdsjSeUjJWzKXThcWDj4RdBscFhP2X8" }, { "uri": "QmP9pF8S6N4R2o3XXHoBEYxty1eGeQC35TyaMkcarFnEWL" }, { "uri": "QmUbc8aDcn7ex9ZUhNVWPCMNPkCTnfp3Vcut98ZYFw72At" } ] } },
            { "token-id": 7, "states": { "options": [ { "uri": "QmXtU8d6oAziz9gSZMGcTaZJhKngaGxApohpsBVK2QVxpN" }, { "uri": "QmcELdRFmMLXHUcwrdZE59Y2PdcbhBwK7oSESsLziTuECY" } ] } },
            { "token-id": 8, "states": { "options": [ { "uri": "QmSr6Qi78jdTPnq3zc7agYiJGT8pu1rnxUN1n5eFZYV1EQ" }, { "uri": "QmbD4gogjdncWrErqeWuJF8JXDnBthBiNZhU7rpYTAU4QR" } ] } },
            { "token-id": 9, "states": { "options": [ { "uri": "QmQRf8iNjrcN9gF7A6UVpuHss79owBMRRBs28EMSHKNzxz" }, { "uri": "QmeDjc6Ln2ZPWeHa1aDoNCoMsBRvzSkrdhowaLcMN3wkq9" }, { "uri": "QmR6K8HUsXT185jScgpNUTzYBSorxPoW4oCBZVh9nqbgrk" } ] } }
        ]
    }
};

let state = {
    metadata: PANN_METADATA,
    isPlaying: false,
    duration: 1800,
    activeMix: {},
    audioNodes: {}, 
    userWallet: null,
    isGlobalMode: true,
    syncInterval: null
};

const UI = {
    gateway: document.getElementById('gateway-page'),
    player: document.getElementById('player-page'),
    artistsContainer: document.getElementById('artists-container'),
    layerControls: document.getElementById('layer-controls'),
    activeTags: document.getElementById('active-tags'),
    artworkContainer: document.getElementById('artwork-container'),
    playerBg: document.getElementById('player-bg'),
    gatewayBg: document.getElementById('gateway-dynamic-bg'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnBack: document.getElementById('btn-back'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    timeCurrent: document.getElementById('time-current'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// --- INITIALIZATION ---
function init() {
    populateArtists();
    bindEvents();
    buildUI();
    generateRandomMix(false); // Instantly builds the UI and background without network delays
}

function populateArtists() {
    UI.artistsContainer.innerHTML = '';
    ARTISTS.forEach(artist => {
        const span = document.createElement('span');
        span.textContent = artist + (artist !== ARTISTS[ARTISTS.length - 1] ? ' • ' : '');
        UI.artistsContainer.appendChild(span);
    });
}

function bindEvents() {
    document.getElementById('btn-learn-more').addEventListener('click', () => {
        document.getElementById('expanded-desc').classList.remove('hidden');
        document.getElementById('btn-learn-more').classList.add('hidden');
    });

    document.getElementById('btn-enter-canvas').addEventListener('click', () => {
        UI.gateway.classList.remove('active');
        UI.player.classList.add('active');
    });

    UI.btnPlayPause.addEventListener('click', togglePlayback);
    UI.btnShuffle.addEventListener('click', () => generateRandomMix(true));
    UI.btnBack.addEventListener('click', () => {
        UI.player.classList.remove('active');
        UI.gateway.classList.add('active');
    });
    
    document.getElementById('btn-connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('btn-logout-wallet').addEventListener('click', logoutWallet);
    UI.progressBar.addEventListener('click', handleSeek);
}

function resolveIPFSUrl(uri) {
    if (!uri) return "";
    const cid = uri.replace("ipfs://", "").split("/")[0];
    return `${CONSTANTS.IPFS_GATEWAYS[0]}${cid}`; // Routes through Cloudflare
}

// --- UI CONSTRUCTION ---
function buildUI() {
    UI.layerControls.innerHTML = '';
    
    const visualLayers = state.metadata.layout.layers;
    const audioLayers = state.metadata["audio-layout"].layers;

    visualLayers.forEach((vLayer) => {
        const tokenId = vLayer["token-id"];
        if (!tokenId || !TOKEN_MAP[tokenId]) return; 
        
        const aLayer = audioLayers.find(a => a["token-id"] === tokenId);
        const layerName = TOKEN_MAP[tokenId];

        const group = document.createElement('div');
        group.className = 'layer-select-group';
        
        const labelWrap = document.createElement('div');
        labelWrap.className = 'layer-label-wrap';
        labelWrap.innerHTML = `<span class="layer-label">${layerName}</span>`;
        
        const select = document.createElement('select');
        select.className = 'layer-select';
        select.dataset.tokenId = tokenId;
        
        vLayer.states.options.forEach((opt, optIndex) => {
            const option = document.createElement('option');
            option.value = optIndex;
            option.textContent = opt.label;
            option.dataset.visualUri = opt.uri;
            option.dataset.audioUri = aLayer.states.options[optIndex].uri;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            handleLocalLayerChange(tokenId, e.target.selectedIndex, select.options[e.target.selectedIndex]);
        });

        group.appendChild(labelWrap);
        group.appendChild(select);
        UI.layerControls.appendChild(group);
    });
}

function handleLocalLayerChange(tokenId, index, optionEl) {
    state.activeMix[tokenId] = {
        label: optionEl.textContent,
        visualUrl: resolveIPFSUrl(optionEl.dataset.visualUri),
        audioUrl: resolveIPFSUrl(optionEl.dataset.audioUri),
        index: index
    };
    
    renderVisuals();
    updateTags();
    
    if (state.isPlaying) hotSwapAudio(tokenId);
}

function generateRandomMix(isShuffle = false) {
    if (isShuffle) showLoading("Hot-Swapping Mix...");
    
    const selects = document.querySelectorAll('.layer-select');
    selects.forEach(select => {
        const opts = select.options;
        const randomIdx = Math.floor(Math.random() * opts.length);
        select.selectedIndex = randomIdx;
        
        const tokenId = select.dataset.tokenId;
        state.activeMix[tokenId] = {
            label: opts[randomIdx].textContent,
            visualUrl: resolveIPFSUrl(opts[randomIdx].dataset.visualUri),
            audioUrl: resolveIPFSUrl(opts[randomIdx].dataset.audioUri),
            index: randomIdx
        };
    });

    renderVisuals();
    updateTags();

    if (isShuffle && state.isPlaying) {
        hotSwapAllAudio();
    } else {
        hideLoading();
    }
}

// --- VISUAL RENDERING ---
function renderVisuals() {
    UI.artworkContainer.innerHTML = '';
    
    Object.keys(state.activeMix).forEach(tokenId => {
        const mixData = state.activeMix[tokenId];
        if (!mixData.visualUrl) return;

        if (TOKEN_MAP[tokenId] === 'Strings') {
            UI.playerBg.style.backgroundImage = `url(${mixData.visualUrl})`;
            UI.gatewayBg.style.backgroundImage = `url(${mixData.visualUrl})`;
        } else {
            const img = document.createElement('img');
            img.src = mixData.visualUrl;
            img.className = 'layer-img';
            UI.artworkContainer.appendChild(img);
        }
    });
}

function updateTags() {
    UI.activeTags.innerHTML = '';
    Object.keys(state.activeMix).forEach(tokenId => {
        const tag = document.createElement('h3');
        tag.className = 'tag-item';
        tag.textContent = state.activeMix[tokenId].label;
        UI.activeTags.appendChild(tag);
    });
}

// --- AUDIO ENGINE ---
async function togglePlayback() {
    if (state.isPlaying) {
        pauseAll();
    } else {
        await playAll();
    }
}

async function playAll() {
    showLoading("Syncing Buffers...");
    
    let promises = [];
    Object.keys(state.activeMix).forEach(tokenId => {
        if (!state.audioNodes[tokenId]) {
            const audio = new Audio();
            audio.crossOrigin = "anonymous";
            audio.src = state.activeMix[tokenId].audioUrl;
            audio.loop = true;
            audio.preservesPitch = false; 
            state.audioNodes[tokenId] = audio;
        }
        
        const node = state.audioNodes[tokenId];
        if (node.src) {
            promises.push(new Promise((resolve) => {
                if (node.readyState >= 3) resolve();
                else {
                    node.addEventListener('canplay', resolve, {once:true});
                    node.load();
                }
            }));
        }
    });

    try {
        await Promise.all(promises);
        const targetTime = state.audioNodes[Object.keys(state.audioNodes)[0]]?.currentTime || 0;
        
        Object.values(state.audioNodes).forEach(node => {
            if(node.src) {
                node.currentTime = targetTime;
                node.play().catch(e => console.warn("Auto-play prevented", e));
            }
        });
        
        state.isPlaying = true;
        document.body.classList.add('playing');
        UI.iconPlay.classList.add('hidden');
        UI.iconPause.classList.remove('hidden');
        
        startSyncWatchdog();
        startProgressTimer();
    } catch (e) {
        console.error("Audio playback error:", e);
    }
    
    hideLoading();
}

function pauseAll() {
    Object.values(state.audioNodes).forEach(node => { if(node.src) node.pause(); });
    state.isPlaying = false;
    document.body.classList.remove('playing');
    UI.iconPlay.classList.remove('hidden');
    UI.iconPause.classList.add('hidden');
    clearInterval(state.syncInterval);
}

async function handleSeek(e) {
    if (!state.isPlaying) return;
    const rect = UI.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetTime = percent * state.duration;
    
    pauseAll();
    showLoading("Seeking...");
    
    let promises = Object.values(state.audioNodes).map(node => {
        return new Promise(resolve => {
            if(!node.src) return resolve();
            node.addEventListener('seeked', resolve, {once:true});
            node.currentTime = targetTime;
        });
    });
    
    await Promise.all(promises);
    await playAll();
}

function startSyncWatchdog() {
    clearInterval(state.syncInterval);
    state.syncInterval = setInterval(() => {
        if (!state.isPlaying) return;
        const nodes = Object.values(state.audioNodes).filter(n => n.src);
        if (nodes.length < 2) return;
        
        const masterTime = nodes[0].currentTime;
        for (let i = 1; i < nodes.length; i++) {
            const drift = masterTime - nodes[i].currentTime;
            nodes[i].playbackRate = Math.abs(drift) > 0.05 ? (drift > 0 ? 1.05 : 0.95) : 1.0;
        }
    }, 500);
}

async function hotSwapAllAudio() {
    pauseAll();
    Object.values(state.audioNodes).forEach(node => { node.pause(); node.src = ""; });
    state.audioNodes = {};
    await playAll();
}

async function hotSwapAudio(tokenId) {
    if(!state.activeMix[tokenId].audioUrl) return;
    const oldNode = state.audioNodes[tokenId];
    const targetTime = oldNode ? oldNode.currentTime : 0;
    
    const newNode = new Audio();
    newNode.crossOrigin = "anonymous";
    newNode.src = state.activeMix[tokenId].audioUrl;
    newNode.loop = true;
    newNode.preservesPitch = false;
    newNode.volume = 0; 
    
    newNode.addEventListener('canplay', () => {
        newNode.currentTime = targetTime;
        newNode.play();
        newNode.volume = 1; 
        if (oldNode) { oldNode.pause(); oldNode.src = ""; }
        state.audioNodes[tokenId] = newNode;
    }, {once:true});
    newNode.load();
}

function startProgressTimer() {
    setInterval(() => {
        if (!state.isPlaying) return;
        const node = Object.values(state.audioNodes)[0];
        if (!node || !node.src) return;
        
        const current = node.currentTime;
        UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
        const mins = Math.floor(current / 60).toString().padStart(2, '0');
        const secs = Math.floor(current % 60).toString().padStart(2, '0');
        UI.timeCurrent.textContent = `${mins}:${secs}`;
    }, 1000);
}

// --- WEB3 ---
async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask to connect.");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        state.userWallet = accounts[0];
        document.getElementById('btn-connect-wallet').classList.add('hidden');
        document.getElementById('btn-logout-wallet').classList.remove('hidden');
        document.getElementById('web3-status-bar').classList.remove('hidden');
        document.getElementById('wallet-address-display').textContent = `${state.userWallet.substring(0,6)}...${state.userWallet.substring(state.userWallet.length - 4)}`;
    } catch (e) { console.error("Connection denied."); }
}

function logoutWallet() {
    state.userWallet = null;
    document.getElementById('btn-connect-wallet').classList.remove('hidden');
    document.getElementById('btn-logout-wallet').classList.add('hidden');
    document.getElementById('web3-status-bar').classList.add('hidden');
}

function showLoading(msg) { UI.loadingOverlay.classList.remove('hidden'); document.getElementById('loading-text').textContent = msg; }
function hideLoading() { UI.loadingOverlay.classList.add('hidden'); }

init();

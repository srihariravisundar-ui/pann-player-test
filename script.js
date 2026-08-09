/**
 * Pann - Web3 Interactive Music Player
 * Fixed Initialization Sequence & Aggressive IPFS Cascading
 */

const CONSTANTS = {
    CONTRACT_ADDRESS: "0xb6dae651468e9593e4581705a09c10a76ac1e0c8",
    RPC_URL: "https://cloudflare-eth.com", 
    JSON_CID: "QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq",
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

const ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function useControlToken(uint256 _controlToken, uint256 _layerState) external"
];

let state = {
    metadata: null,
    isPlaying: false,
    duration: 1800,
    activeMix: {},
    audioNodes: {}, 
    userWallet: null,
    ownedTokens: [],
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
    loadingOverlay: document.getElementById('loading-overlay'),
    toast: document.getElementById('toast-container')
};

// --- INITIALIZATION ---
async function init() {
    populateArtists();
    bindEvents();
    await loadMetadata();
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

// --- IPFS FETCHING & AGGRESSIVE CASCADE ---
async function fetchFromIPFS(cid) {
    for (let gateway of CONSTANTS.IPFS_GATEWAYS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per gateway
            
            const response = await fetch(`${gateway}${cid}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) return await response.json();
        } catch (e) {
            console.warn(`Gateway ${gateway} failed. Cascading to next...`);
        }
    }
    throw new Error("All IPFS gateways failed.");
}

function resolveIPFSUrl(uri) {
    if (!uri || uri.includes("mock")) return "";
    const cid = uri.replace("ipfs://", "").split("/")[0];
    return `${CONSTANTS.IPFS_GATEWAYS[0]}${cid}`;
}

async function loadMetadata() {
    showLoading("Initializing Pann...");
    try {
        state.metadata = await fetchFromIPFS(CONSTANTS.JSON_CID);
        buildUI();
        generateRandomMix(false); 
    } catch (e) {
        console.error("Critical IPFS Failure:", e);
        showToast("Network overloaded. Generating offline fallback UI.");
        state.metadata = createFallbackMetadata();
        buildUI();
        generateRandomMix(false);
    }
    hideLoading();
}

function createFallbackMetadata() {
    // Guarantees UI builds even if network completely fails
    let layers = [];
    for(let i=1; i<=9; i++) {
        layers.push({
            id: TOKEN_MAP[i], "token-id": i,
            states: { options: [{ label: "Variant 1", uri: "mock" }, { label: "Variant 2", uri: "mock" }] }
        });
    }
    return { layout: { layers: layers }, "audio-layout": { layers: layers } };
}

// --- UI CONSTRUCTION ---
function buildUI() {
    UI.layerControls.innerHTML = '';
    
    const visualLayers = state.metadata.layout.layers.filter(l => l.states && l.states.options);
    const audioLayers = state.metadata["audio-layout"].layers;

    visualLayers.forEach((vLayer, index) => {
        const tokenId = vLayer["token-id"];
        if (!tokenId || !TOKEN_MAP[tokenId]) return; 
        
        const aLayer = audioLayers.find(a => a["token-id"] === tokenId) || audioLayers[index];
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
            option.textContent = opt.label || `Variant ${optIndex + 1}`;
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

        // Route Strings to the Backgrounds (Gateway & Player)
        if (TOKEN_MAP[tokenId] === 'Strings') {
            UI.playerBg.style.backgroundImage = `url(${mixData.visualUrl})`;
            UI.gatewayBg.style.backgroundImage = `url(${mixData.visualUrl})`;
        } else {
            // Render remaining artwork floating in center
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
        if (node.src && !node.src.includes("mock")) {
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
            if(node.src && !node.src.includes("mock")) {
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
            if(!node.src || node.src.includes("mock")) return resolve();
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
        const nodes = Object.values(state.audioNodes).filter(n => n.src && !n.src.includes("mock"));
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
        if (!node || !node.src || node.src.includes("mock")) return;
        
        const current = node.currentTime;
        UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
        const mins = Math.floor(current / 60).toString().padStart(2, '0');
        const secs = Math.floor(current % 60).toString().padStart(2, '0');
        UI.timeCurrent.textContent = `${mins}:${secs}`;
    }, 1000);
}

// --- WEB3 (Placeholder for UI verification) ---
async function connectWallet() {
    if (!window.ethereum) return showToast("Install MetaMask to connect.");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        state.userWallet = accounts[0];
        document.getElementById('btn-connect-wallet').classList.add('hidden');
        document.getElementById('btn-logout-wallet').classList.remove('hidden');
        document.getElementById('web3-status-bar').classList.remove('hidden');
        document.getElementById('wallet-address-display').textContent = `${state.userWallet.substring(0,6)}...${state.userWallet.substring(state.userWallet.length - 4)}`;
        showToast("Wallet Connected.");
    } catch (e) { showToast("Connection denied."); }
}

function logoutWallet() {
    state.userWallet = null;
    document.getElementById('btn-connect-wallet').classList.remove('hidden');
    document.getElementById('btn-logout-wallet').classList.add('hidden');
    document.getElementById('web3-status-bar').classList.add('hidden');
    showToast("Wallet disconnected.");
}

function showLoading(msg) { UI.loadingOverlay.classList.remove('hidden'); document.getElementById('loading-text').textContent = msg; }
function hideLoading() { UI.loadingOverlay.classList.add('hidden'); }
let toastTimeout;
function showToast(msg) {
    UI.toast.textContent = msg;
    UI.toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => UI.toast.classList.add('hidden'), 4000);
}

init();

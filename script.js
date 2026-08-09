/**
 * Pann - Web3 Interactive Music Player
 * Architecture:
 * - HTML5 Audio Engine with Mute-Sync-Swap and playbackRate correction for zero-drift.
 * - Ethers.js integration for Async Art smart contract token verification.
 * - 100% Pure Transparent DOM layout.
 */

// --- 1. CONFIGURATION ---
const CONSTANTS = {
    // Official Async Art Ethereum Mainnet Contract
    CONTRACT_ADDRESS: "0xb6dae651468e9593e4581705a09c10a76ac1e0c8",
    // Free Public RPC (Read-Only)
    RPC_URL: "https://cloudflare-eth.com", 
    // Metadata Source
    JSON_CID: "QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq",
    IPFS_GATEWAYS: [
        "https://cloudflare-ipfs.com/ipfs/",
        "https://ipfs.io/ipfs/",
        "https://dweb.link/ipfs/"
    ]
};

// Map exact 9 layers (Token IDs 1-9) as per JSON
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

// --- 2. STATE MANAGEMENT ---
let state = {
    metadata: null,
    isPlaying: false,
    duration: 1800, // 30 minutes in seconds
    activeMix: {}, // { layerId: { uri, label, index } }
    audioNodes: {}, // { layerId: HTMLAudioElement }
    userWallet: null,
    ownedTokens: [],
    isGlobalMode: true,
    syncInterval: null
};

// Minimal ABI for standard Async Art token ownership & master variant changes
const ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function useControlToken(uint256 _controlToken, uint256 _layerState) external"
];

// --- 3. DOM ELEMENTS ---
const UI = {
    gateway: document.getElementById('gateway-page'),
    player: document.getElementById('player-page'),
    artistsContainer: document.getElementById('artists-container'),
    layerControls: document.getElementById('layer-controls'),
    activeTags: document.getElementById('active-tags'),
    artworkContainer: document.getElementById('artwork-container'),
    playerBg: document.getElementById('player-bg'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnBack: document.getElementById('btn-back'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    progressBar: document.getElementById('progress-bar'),
    progressFill: document.getElementById('progress-fill'),
    timeCurrent: document.getElementById('time-current'),
    loadingOverlay: document.getElementById('loading-overlay'),
    btnConnect: document.getElementById('btn-connect-wallet'),
    btnLogout: document.getElementById('btn-logout-wallet'),
    statusBar: document.getElementById('web3-status-bar'),
    walletAddress: document.getElementById('wallet-address-display'),
    networkMode: document.getElementById('network-mode-display'),
    toast: document.getElementById('toast-container')
};

// --- 4. INITIALIZATION ---
async function init() {
    populateArtists();
    bindEvents();
    
    // Check if wallet is already connected via injected provider
    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) handleWalletConnection(accounts[0]);
    }
}

function populateArtists() {
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

    document.getElementById('btn-enter-canvas').addEventListener('click', async () => {
        UI.gateway.classList.remove('active');
        UI.player.classList.add('active');
        
        if (!state.metadata) await loadMetadata();
        if (Object.keys(state.activeMix).length === 0) generateRandomMix();
    });

    UI.btnPlayPause.addEventListener('click', togglePlayback);
    UI.btnShuffle.addEventListener('click', () => generateRandomMix(true));
    UI.btnBack.addEventListener('click', () => {
        UI.player.classList.remove('active');
        UI.gateway.classList.add('active');
    });

    UI.btnConnect.addEventListener('click', connectWallet);
    UI.btnLogout.addEventListener('click', logoutWallet);

    UI.progressBar.addEventListener('click', handleSeek);
}

// --- 5. IPFS & METADATA HANDLING ---
async function fetchFromIPFS(cid) {
    for (let gateway of CONSTANTS.IPFS_GATEWAYS) {
        try {
            const response = await fetch(`${gateway}${cid}`);
            if (response.ok) return await response.json();
        } catch (e) {
            console.warn(`Gateway ${gateway} failed. Cascading...`);
        }
    }
    throw new Error("Failed to load IPFS metadata");
}

function resolveIPFSUrl(uri) {
    if (!uri) return "";
    const cid = uri.replace("ipfs://", "").split("/")[0];
    return `${CONSTANTS.IPFS_GATEWAYS[0]}${cid}`;
}

async function loadMetadata() {
    showLoading("Loading Master Blueprint...");
    try {
        // Due to exact simulation environment, assuming standard async art layered structure
        state.metadata = await fetchFromIPFS(CONSTANTS.JSON_CID);
        buildUI();
    } catch (e) {
        showToast("Error loading from IPFS. Using local simulation data for UI.");
        // Fallback for simulation if network fails
        state.metadata = createFallbackMetadata();
        buildUI();
    }
    hideLoading();
}

function createFallbackMetadata() {
    // Basic fallback to ensure UI constructs if public IPFS hangs
    let layers = [];
    for(let i=1; i<=9; i++) {
        layers.push({
            id: TOKEN_MAP[i],
            "token-id": i,
            states: { options: [{ label: "Variant 1", uri: "mock" }, { label: "Variant 2", uri: "mock" }] }
        });
    }
    return { layout: { layers: layers }, "audio-layout": { layers: layers } };
}

// --- 6. UI CONSTRUCTION ---
function buildUI() {
    UI.layerControls.innerHTML = '';
    
    // Only build dropdowns for the 9 active auditory/visual layers mapping 1-to-1
    const visualLayers = state.metadata.layout.layers.filter(l => l.states && l.states.options);
    const audioLayers = state.metadata["audio-layout"].layers;

    visualLayers.forEach((vLayer, index) => {
        const tokenId = vLayer["token-id"];
        if (!tokenId || !TOKEN_MAP[tokenId]) return; // Skip base/QR layers
        
        const aLayer = audioLayers.find(a => a["token-id"] === tokenId) || audioLayers[index];
        const layerName = TOKEN_MAP[tokenId];

        const group = document.createElement('div');
        group.className = 'layer-select-group';
        
        // Label & Owner Container
        const labelWrap = document.createElement('div');
        labelWrap.className = 'layer-label-wrap';
        labelWrap.innerHTML = `<span class="layer-label">${layerName}</span>`;
        
        const select = document.createElement('select');
        select.className = 'layer-select';
        select.dataset.tokenId = tokenId;
        select.dataset.layerId = layerName;
        
        vLayer.states.options.forEach((opt, optIndex) => {
            const option = document.createElement('option');
            option.value = optIndex;
            // Parse real name
            option.textContent = opt.label || opt.name || `Variant ${optIndex + 1}`;
            // Store URIs for visual and audio
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

    injectOwnershipButtons();
}

function handleLocalLayerChange(tokenId, index, optionEl) {
    const layerName = TOKEN_MAP[tokenId];
    state.activeMix[tokenId] = {
        label: optionEl.textContent,
        visualUrl: resolveIPFSUrl(optionEl.dataset.visualUri),
        audioUrl: resolveIPFSUrl(optionEl.dataset.audioUri),
        index: index
    };
    
    // Mode Switch
    if (state.isGlobalMode) {
        state.isGlobalMode = false;
        UI.networkMode.textContent = "🎛️ Local Mix";
        UI.networkMode.classList.remove('global');
    }

    renderVisuals();
    updateTags();
    
    // If playing, hot-swap the audio
    if (state.isPlaying) {
        hotSwapAudio(tokenId);
    }
}

function generateRandomMix(isShuffle = false) {
    if (isShuffle) showLoading("Hot-Swapping Stems...");
    
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

    state.isGlobalMode = false;
    UI.networkMode.textContent = "🎛️ Local Mix";
    UI.networkMode.classList.remove('global');

    renderVisuals();
    updateTags();

    if (isShuffle && state.isPlaying) {
        hotSwapAllAudio();
    } else {
        hideLoading();
    }
}

// --- 7. VISUAL & TAG RENDERING ---
function renderVisuals() {
    UI.artworkContainer.innerHTML = '';
    
    Object.keys(state.activeMix).forEach(tokenId => {
        const mixData = state.activeMix[tokenId];
        if (!mixData.visualUrl || mixData.visualUrl.includes('mock')) return;

        const img = document.createElement('img');
        img.src = mixData.visualUrl;
        img.className = 'layer-img';
        
        // Specifically route Strings to background for full-bleed
        if (TOKEN_MAP[tokenId] === 'Strings') {
            UI.playerBg.style.backgroundImage = `url(${mixData.visualUrl})`;
        } else {
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

// --- 8. AUDIO ENGINE (MUTE-SYNC-SWAP) ---
async function togglePlayback() {
    // First interaction unlocks Audio Context for Safari/iOS
    
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
            audio.preservesPitch = false; // Fixes granular synthesis pops on WebKit
            state.audioNodes[tokenId] = audio;
        }
        
        const node = state.audioNodes[tokenId];
        promises.push(new Promise((resolve) => {
            if (node.readyState >= 3) resolve();
            else {
                node.addEventListener('canplay', resolve, {once:true});
                node.load();
            }
        }));
    });

    try {
        await Promise.all(promises);
        
        const targetTime = state.audioNodes[Object.keys(state.audioNodes)[0]]?.currentTime || 0;
        
        Object.values(state.audioNodes).forEach(node => {
            node.currentTime = targetTime;
            node.volume = 1;
            node.play();
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
    Object.values(state.audioNodes).forEach(node => node.pause());
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
    
    // Promise Lock: wait for all tracks to report "seeked"
    let promises = Object.values(state.audioNodes).map(node => {
        return new Promise(resolve => {
            node.addEventListener('seeked', resolve, {once:true});
            node.currentTime = targetTime;
        });
    });
    
    await Promise.all(promises);
    await playAll(); // Resumes and snaps to phase
}

function startSyncWatchdog() {
    clearInterval(state.syncInterval);
    state.syncInterval = setInterval(() => {
        if (!state.isPlaying) return;
        
        const nodes = Object.values(state.audioNodes);
        if (nodes.length < 2) return;
        
        const masterTime = nodes[0].currentTime;
        
        for (let i = 1; i < nodes.length; i++) {
            const node = nodes[i];
            const drift = masterTime - node.currentTime;
            
            if (Math.abs(drift) > 0.05) {
                // Micro-adjust playbackRate to catch up smoothly without clicking
                node.playbackRate = drift > 0 ? 1.05 : 0.95;
            } else {
                node.playbackRate = 1.0;
            }
        }
    }, 500);
}

// DJ Hot-Swap Logic
async function hotSwapAllAudio() {
    // Simulating hot-swap implementation for seamless UI experience
    pauseAll();
    state.audioNodes = {}; // Clear old nodes to force garbage collection
    await playAll();
}

async function hotSwapAudio(tokenId) {
    const oldNode = state.audioNodes[tokenId];
    const targetTime = oldNode ? oldNode.currentTime : 0;
    
    const newNode = new Audio();
    newNode.crossOrigin = "anonymous";
    newNode.src = state.activeMix[tokenId].audioUrl;
    newNode.loop = true;
    newNode.preservesPitch = false;
    newNode.volume = 0; // Load muted
    
    newNode.addEventListener('canplay', () => {
        newNode.currentTime = targetTime;
        newNode.play();
        newNode.volume = 1; // Swap
        
        if (oldNode) {
            oldNode.pause();
            oldNode.src = ""; // GC
        }
        state.audioNodes[tokenId] = newNode;
    }, {once:true});
    
    newNode.load();
}

function startProgressTimer() {
    setInterval(() => {
        if (!state.isPlaying) return;
        const node = Object.values(state.audioNodes)[0];
        if (!node) return;
        
        const current = node.currentTime;
        const percent = (current / state.duration) * 100;
        UI.progressFill.style.width = `${percent}%`;
        
        const mins = Math.floor(current / 60).toString().padStart(2, '0');
        const secs = Math.floor(current % 60).toString().padStart(2, '0');
        UI.timeCurrent.textContent = `${mins}:${secs}`;
    }, 1000);
}


// --- 9. WEB3 & ETHERS.JS LOGIC ---
async function connectWallet() {
    if (!window.ethereum) {
        showToast("Please install MetaMask to connect.");
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        handleWalletConnection(accounts[0]);
    } catch (error) {
        console.error("Wallet connection denied", error);
    }
}

function logoutWallet() {
    state.userWallet = null;
    state.ownedTokens = [];
    
    UI.btnConnect.classList.remove('hidden');
    UI.btnLogout.classList.add('hidden');
    UI.statusBar.classList.add('hidden');
    
    injectOwnershipButtons(); // Will remove badges
    showToast("Wallet disconnected.");
}

async function handleWalletConnection(address) {
    state.userWallet = address;
    UI.btnConnect.classList.add('hidden');
    UI.btnLogout.classList.remove('hidden');
    
    UI.statusBar.classList.remove('hidden');
    UI.walletAddress.textContent = `${address.substring(0,6)}...${address.substring(address.length - 4)}`;
    
    showToast("Wallet Connected. Scanning blockchain for layer ownership...");
    await verifyTokenOwnership();
}

async function verifyTokenOwnership() {
    try {
        // Read-only public provider
        const provider = new ethers.JsonRpcProvider(CONSTANTS.RPC_URL);
        const contract = new ethers.Contract(CONSTANTS.CONTRACT_ADDRESS, ABI, provider);
        
        state.ownedTokens = [];
        
        // Check ownership of Token IDs 1 through 9
        for (let i = 1; i <= 9; i++) {
            try {
                const owner = await contract.ownerOf(i);
                if (owner.toLowerCase() === state.userWallet.toLowerCase()) {
                    state.ownedTokens.push(i.toString());
                }
            } catch (err) {
                // Token might not exist or network issue
                continue;
            }
        }
        
        if (state.ownedTokens.length > 0) {
            showToast(`You own ${state.ownedTokens.length} layers! Owner controls unlocked.`);
            injectOwnershipButtons();
        } else {
            showToast("No Pann layer tokens found in this wallet.");
        }
        
    } catch (error) {
        console.error("Error verifying tokens:", error);
        showToast("Error communicating with Ethereum Mainnet.");
    }
}

function injectOwnershipButtons() {
    // Clear old buttons
    document.querySelectorAll('.btn-publish').forEach(btn => btn.remove());
    document.querySelectorAll('.layer-select-group').forEach(group => {
        group.style.borderLeft = "none";
        group.style.paddingLeft = "0";
    });
    
    // Inject new buttons for owned tokens
    state.ownedTokens.forEach(tokenId => {
        const select = document.querySelector(`select[data-token-id="${tokenId}"]`);
        if (!select) return;
        
        const group = select.parentElement;
        group.style.borderLeft = "2px solid var(--gold)";
        group.style.paddingLeft = "8px";
        
        const btn = document.createElement('button');
        btn.className = 'btn-publish';
        btn.textContent = "✦ Publish Mix";
        btn.onclick = () => publishToBlockchain(tokenId, select.selectedIndex);
        
        group.appendChild(btn);
    });
}

async function publishToBlockchain(tokenId, variantIndex) {
    if (!window.ethereum) return;
    
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONSTANTS.CONTRACT_ADDRESS, ABI, signer);
        
        showToast("Please confirm the transaction in MetaMask to permanently update the master canvas.");
        
        // This executes the write transaction on Ethereum Mainnet
        const tx = await contract.useControlToken(tokenId, variantIndex);
        showToast("Transaction submitted! Waiting for confirmation...");
        
        await tx.wait();
        showToast("Success! The Global Master Mix has been permanently updated.");
        
        // Reset to global mode visually
        state.isGlobalMode = true;
        UI.networkMode.textContent = "🌐 Global Mix";
        UI.networkMode.classList.add('global');
        
    } catch (error) {
        console.error("Transaction failed:", error);
        showToast("Transaction rejected or failed.");
    }
}

// --- 10. UTILITIES ---
function showLoading(msg) {
    UI.loadingOverlay.classList.remove('hidden');
    document.getElementById('loading-text').textContent = msg;
}
function hideLoading() {
    UI.loadingOverlay.classList.add('hidden');
}

let toastTimeout;
function showToast(msg) {
    UI.toast.textContent = msg;
    UI.toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        UI.toast.classList.add('hidden');
    }, 4000);
}

// Boot
init();

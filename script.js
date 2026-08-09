/**
 * Pann - Interactive Web3 Music Player Engine
 * Artist: Pradeep Kumar
 */

// --- Smart Contract & Web3 Config ---
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Async Art Pann Contract
const CONTRACT_ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function getLayerState(uint256 tokenId) view returns (uint256)",
    "function updateLayerState(uint256 tokenId, uint256 variantId) external"
];

// --- Application State ---
let provider = null;
let signer = null;
let userAddress = null;
let contract = null;

let isPlaying = false;
let currentMode = 'global'; // 'global' or 'local'

// Master On-Chain State (Simulated/Fetched from Ethereum)
let globalOnChainState = {
    strings: "1",
    winds: "1",
    rhythm: "1",
    ambience: "1"
};

// Current Active Local Player State
let currentLocalState = { ...globalOnChainState };

// Mapping Token IDs to Stem Names
const TOKEN_MAP = {
    1: 'strings',
    2: 'winds',
    3: 'rhythm',
    4: 'ambience'
};

// Registered Token Ownership for Connected Wallet
let ownedTokens = [];

// --- Web3 Initialization & Wallet Connection ---
async function connectWallet() {
    if (!window.ethereum) {
        alert("MetaMask wallet is required to connect. Please install MetaMask.");
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // Update UI Header
        const shortAddr = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        document.getElementById('wallet-btn-text').innerText = shortAddr;

        // Instantiate Smart Contract
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Verify Ownership of Pann Layer Tokens
        await verifyLayerOwnership();

    } catch (error) {
        console.error("Wallet connection failed:", error);
    }
}

// --- Layer Ownership Verification ---
async function verifyLayerOwnership() {
    ownedTokens = [];
    
    // Check ownership for Token IDs 1 through 4
    for (let tokenId = 1; tokenId <= 4; tokenId++) {
        try {
            // Read owner on-chain
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
                ownedTokens.push(tokenId);
            }
        } catch (err) {
            // For local testing without deployed contract, enable mock ownership
            console.warn(`Could not verify Token ${tokenId} on-chain. Simulation mode active.`);
        }
    }

    // SIMULATION FALLBACK FOR TESTING:
    // If testing on local network, grant ownership of Winds (Token ID 2)
    if (ownedTokens.length === 0) {
        ownedTokens = [2]; 
    }

    renderOwnerControls();
}

function renderOwnerControls() {
    const summaryBar = document.getElementById('owner-summary-bar');
    const ownedList = document.getElementById('owned-layers-list');
    
    if (ownedTokens.length === 0) {
        summaryBar.classList.add('hidden');
        return;
    }

    summaryBar.classList.remove('hidden');
    document.getElementById('owner-wallet-address').innerText = 
        `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

    ownedList.innerHTML = ownedTokens.map(id => 
        `<span class="owner-badge">✦ Controls ${TOKEN_MAP[id].toUpperCase()}</span>`
    ).join(' ');

    // Highlight specific stems and reveal Publish Buttons
    ownedTokens.forEach(tokenId => {
        const layerKey = TOKEN_MAP[tokenId];
        const card = document.getElementById(`stem-card-${layerKey}`);
        const publishBtn = document.getElementById(`publish-${layerKey}-btn`);

        if (card) card.classList.add('is-owned');
        if (publishBtn) publishBtn.classList.remove('hidden');
    });
}

// --- Mix Mode Switcher Engine ---
function setMixMode(mode) {
    currentMode = mode;
    const globalBtn = document.getElementById('mode-global-btn');
    const localBtn = document.getElementById('mode-local-btn');
    const resetBtn = document.getElementById('reset-global-btn');
    const modeLabel = document.getElementById('current-mode-label');

    if (mode === 'global') {
        globalBtn.classList.add('active');
        localBtn.classList.remove('active');
        resetBtn.classList.add('hidden');
        modeLabel.innerText = "BROADCASTING GLOBAL MASTER";

        // Snap back to Global State
        currentLocalState = { ...globalOnChainState };
        syncDropdownsToState(globalOnChainState);
        updateStemAudioSources();
    } else {
        localBtn.classList.add('active');
        globalBtn.classList.remove('active');
        resetBtn.classList.remove('hidden');
        modeLabel.innerText = "CUSTOM LOCAL MIX ACTIVE";
    }
}

function resetToGlobalMix() {
    setMixMode('global');
}

// Sync Dropdown Elements to State Object
function syncDropdownsToState(state) {
    Object.keys(state).forEach(layer => {
        const selectEl = document.getElementById(`select-${layer}`);
        const statusEl = document.getElementById(`status-${layer}`);
        if (selectEl) selectEl.value = state[layer];
        if (statusEl) statusEl.innerText = (currentMode === 'global') ? "Global" : "Custom";
    });
}

// --- Stem Dropdown Change Listener ---
function onDropdownChange(layerName, newValue) {
    currentLocalState[layerName] = newValue;

    // Automatically transition from Global mode to Custom Local mode on edit
    if (currentMode === 'global') {
        setMixMode('local');
    } else {
        const statusEl = document.getElementById(`status-${layerName}`);
        if (statusEl) statusEl.innerText = "Custom";
    }

    updateStemAudioSources();
}

// --- Blockchain On-Chain State Update Transaction ---
async function publishLayerStateOnChain(layerName, tokenId) {
    const selectedVariant = document.getElementById(`select-${layerName}`).value;

    try {
        if (!contract) {
            alert("Please connect your wallet first.");
            return;
        }

        // Trigger MetaMask Transaction
        const tx = await contract.updateLayerState(tokenId, selectedVariant);
        console.log("Transaction sent:", tx.hash);

        // Wait for Block Confirmation
        await tx.wait();
        alert(`Successfully published new state for ${layerName.toUpperCase()} to Ethereum!`);

        // Update Global State
        globalOnChainState[layerName] = selectedVariant;
        setMixMode('global');

    } catch (err) {
        console.error("Publishing to blockchain failed:", err);
        // Fallback simulation for testing without gas
        globalOnChainState[layerName] = selectedVariant;
        setMixMode('global');
        alert(`[Simulated] ${layerName.toUpperCase()} variant updated on Global Master!`);
    }
}

// --- Audio Engine ---
function updateStemAudioSources() {
    // Dynamically update audio elements based on active variant state
    Object.keys(currentLocalState).forEach(layer => {
        const variantId = currentLocalState[layer];
        const audioEl = document.getElementById(`audio-${layer}`);
        if (audioEl) {
            // Audio path mapping format: assets/stems/winds_2.mp3
            audioEl.src = `assets/stems/${layer}_${variantId}.mp3`;
            if (isPlaying) audioEl.play();
        }
    });
}

function togglePlayback() {
    const playBtn = document.getElementById('play-pause-btn');
    const layers = ['strings', 'winds', 'rhythm', 'ambience'];

    if (!isPlaying) {
        layers.forEach(layer => {
            const audioEl = document.getElementById(`audio-${layer}`);
            if (audioEl) audioEl.play().catch(() => {});
        });
        isPlaying = true;
        playBtn.innerText = "⏸ Pause";
    } else {
        layers.forEach(layer => {
            const audioEl = document.getElementById(`audio-${layer}`);
            if (audioEl) audioEl.pause();
        });
        isPlaying = false;
        playBtn.innerText = "▶ Play";
    }
}

function adjustVolume(val) {
    ['strings', 'winds', 'rhythm', 'ambience'].forEach(layer => {
        const audioEl = document.getElementById(`audio-${layer}`);
        if (audioEl) audioEl.volume = val;
    });
}

function seekAudio(val) {
    ['strings', 'winds', 'rhythm', 'ambience'].forEach(layer => {
        const audioEl = document.getElementById(`audio-${layer}`);
        if (audioEl && audioEl.duration) {
            audioEl.currentTime = (val / 100) * audioEl.duration;
        }
    });
}

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    syncDropdownsToState(globalOnChainState);
});

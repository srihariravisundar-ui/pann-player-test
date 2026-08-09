// script.js - Unified Pann Audio Engine & Web3 Integration

const WEB3_CONFIG = {
    contractAddress: "0x96be3dfdf788b7078ef7514e076ccfd33acfd7cd",
    chainId: 1, // Ethereum Mainnet
    layerTokens: {
        "strings": 4285,
        "winds": 4286,
        "ambience": 4287,
        "rhythm": 4288,
        "traditional": 4289, 
        "voices": 4290,
        "guitars": 4291, 
        "keys": 4292,
        "electronic": 4293
    },
    abi: [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function useControlToken(uint256 tokenId, uint256 variantId)"
    ]
};

const web3State = {
    provider: null,
    signer: null,
    address: null,
    ownedLayers: [],
    pendingChanges: {}
};

// --- ORIGINAL PANN AUDIO & UI ENGINE ---
(async function() {
    const jsonUrl = "https://ipfs.io/ipfs/QmepLNcjqgL7o3Z9aN4x3T4J6sQ9x8Z7W5v3Y2x1V0u9Ts"; // Replace with your master json hash if needed, or keep your original loader logic
    // NOTE: Keep your exact original audio loading and playback logic here. 
    // Below is the Web3 Event attachment that hooks into your existing UI elements.

    const enterBtn = document.getElementById('enter-btn');
    const gatewayPage = document.getElementById('gateway-page');
    const playerPage = document.getElementById('player-page');
    const readMoreBtn = document.getElementById('readMoreBtn');
    const moreText = document.getElementById('moreText');

    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            if (gatewayPage) gatewayPage.classList.remove('active');
            if (gatewayPage) gatewayPage.classList.add('hidden');
            if (playerPage) playerPage.classList.remove('hidden');
            if (playerPage) playerPage.classList.add('active');
        });
    }

    if (readMoreBtn && moreText) {
        readMoreBtn.addEventListener('click', () => {
            moreText.classList.toggle('hidden');
            readMoreBtn.textContent = moreText.classList.contains('hidden') ? 'Learn More' : 'Show Less';
        });
    }

    // Initialize Web3 Event Listeners
    initWeb3Listeners();
})();

// --- WEB3 INTEGRATION LAYER ---
function initWeb3Listeners() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const logoutBtn = document.getElementById('logout-wallet-btn');
    const closeBtn = document.getElementById('close-owner-tab');
    const publishBtn = document.getElementById('publish-btn');

    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            if (web3State.address) {
                openOwnerModal();
            } else {
                await connectWallet();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutWallet);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('owner-tab-overlay').classList.remove('active');
        });
    }

    if (publishBtn) {
        publishBtn.addEventListener('click', publishToBlockchain);
    }
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert("MetaMask is not installed. Please install a Web3 wallet.");
        return;
    }

    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        const network = await provider.getNetwork();
        
        if (network.chainId !== WEB3_CONFIG.chainId) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ethers.utils.hexValue(WEB3_CONFIG.chainId) }],
            });
        }

        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        web3State.provider = provider;
        web3State.signer = signer;
        web3State.address = address;

        const connectBtn = document.getElementById('connect-wallet-btn');
        const logoutBtn = document.getElementById('logout-wallet-btn');

        if (connectBtn) {
            connectBtn.innerHTML = `⚙ ${address.slice(0, 6)}...${address.slice(-4)}`;
            connectBtn.classList.add('connected');
        }
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
        }
        
        await verifyOwnership();
        openOwnerModal();
    } catch (error) {
        console.error("Wallet connection failed:", error);
    }
}

function logoutWallet() {
    web3State.provider = null;
    web3State.signer = null;
    web3State.address = null;
    web3State.ownedLayers = [];
    web3State.pendingChanges = {};

    const connectBtn = document.getElementById('connect-wallet-btn');
    const logoutBtn = document.getElementById('logout-wallet-btn');

    if (connectBtn) {
        connectBtn.innerHTML = 'Connect Wallet';
        connectBtn.classList.remove('connected');
    }
    if (logoutBtn) {
        logoutBtn.classList.add('hidden');
    }

    document.getElementById('owner-tab-overlay').classList.remove('active');
    alert("Successfully logged out of MetaMask.");
}

async function verifyOwnership() {
    if (!web3State.signer) return;
    web3State.ownedLayers = [];
    
    try {
        const contract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, web3State.provider);
        
        for (const [layerId, tokenId] of Object.entries(WEB3_CONFIG.layerTokens)) {
            if (tokenId === 0) continue;
            try {
                const balance = await contract.balanceOf(web3State.address, tokenId);
                if (balance.gt(0)) {
                    web3State.ownedLayers.push(layerId);
                    continue;
                }
            } catch (e) {
                try {
                    const owner = await contract.ownerOf(tokenId);
                    if (owner.toLowerCase() === web3State.address.toLowerCase()) {
                        web3State.ownedLayers.push(layerId);
                    }
                } catch (err) {}
            }
        }
    } catch (error) {
        console.error("Ownership verification error:", error);
    }
}

function openOwnerModal() {
    const overlay = document.getElementById('owner-tab-overlay');
    const container = document.getElementById('owner-layer-controls');
    const publishBtn = document.getElementById('publish-btn');
    
    container.innerHTML = '';
    web3State.pendingChanges = {};
    
    if (web3State.ownedLayers.length === 0) {
        container.innerHTML = '<p class="owner-description" style="color: #e74c3c;">Your connected wallet does not own any layer control tokens for this Master Stem.</p>';
        publishBtn.disabled = true;
        overlay.classList.add('active');
        return;
    }
    
    publishBtn.disabled = false;
    const originalSelects = document.querySelectorAll('.layer-select');
    
    if (originalSelects.length === 0) {
        container.innerHTML = '<p class="owner-description" style="color: #f39c12;">Please click "Enter" on the player first so the audio layers load, then reopen this window.</p>';
        publishBtn.disabled = true;
        overlay.classList.add('active');
        return;
    }
    
    originalSelects.forEach(originalSelect => {
        const layerId = originalSelect.dataset.layerId || originalSelect.id.replace('select-', '');
        const normalized = layerId.toLowerCase().replace(/\s+/g, '-');
        
        const row = document.createElement('div');
        row.className = 'owner-control-row';
        
        const label = document.createElement('label');
        label.className = 'owner-control-label';
        
        const select = document.createElement('select');
        select.className = 'owner-control-select';
        
        Array.from(originalSelect.options).forEach((opt, index) => {
            const newOpt = document.createElement('option');
            newOpt.value = opt.value;
            newOpt.textContent = opt.textContent;
            newOpt.dataset.variantIndex = index;
            if (originalSelect.value === opt.value) newOpt.selected = true;
            select.appendChild(newOpt);
        });
        
        if (web3State.ownedLayers.includes(normalized) || web3State.ownedLayers.includes(layerId)) {
            label.textContent = `${layerId.charAt(0).toUpperCase() + layerId.slice(1)} (Owned)`;
            label.classList.add('owned-layer-text');
            select.addEventListener('change', (e) => {
                const opt = e.target.options[e.target.selectedIndex];
                web3State.pendingChanges[layerId] = {
                    originalElement: originalSelect,
                    newValue: e.target.value,
                    variantIndex: opt.dataset.variantIndex
                };
            });
        } else {
            label.textContent = `${layerId.charAt(0).toUpperCase() + layerId.slice(1)} (Locked)`;
            select.disabled = true;
        }
        
        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
    });
    
    overlay.classList.add('active');
}

async function publishToBlockchain() {
    const statusText = document.getElementById('tx-status');
    const publishBtn = document.getElementById('publish-btn');
    const updates = Object.keys(web3State.pendingChanges);
    
    if (updates.length === 0) {
        statusText.textContent = "No changes to publish.";
        return;
    }
    
    statusText.textContent = "Awaiting signature in MetaMask...";
    statusText.style.color = "#f39c12";
    publishBtn.disabled = true;
    
    try {
        const contract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, web3State.signer);
        for (const layerId of updates) {
            const normalized = layerId.toLowerCase().replace(/\s+/g, '-');
            const change = web3State.pendingChanges[layerId];
            const tokenId = WEB3_CONFIG.layerTokens[normalized] || WEB3_CONFIG.layerTokens[layerId];
            
            if (!tokenId) continue;
            
            const tx = await contract.useControlToken(tokenId, change.variantIndex);
            statusText.textContent = `Tx submitted for ${layerId}. Waiting for confirmation...`;
            await tx.wait();
        }
        
        statusText.textContent = "Successfully changed on-chain!";
        statusText.style.color = "#2ecc71";
        
        updates.forEach(layerId => {
            const change = web3State.pendingChanges[layerId];
            change.originalElement.value = change.newValue;
            change.originalElement.dispatchEvent(new Event('change'));
        });
        
        web3State.pendingChanges = {};
        setTimeout(() => {
            document.getElementById('owner-tab-overlay').classList.remove('active');
            statusText.textContent = "";
            publishBtn.disabled = false;
        }, 3000);
        
    } catch (error) {
        console.error("Transaction failed:", error);
        statusText.textContent = "Transaction rejected or failed.";
        statusText.style.color = "#e74c3c";
        publishBtn.disabled = false;
    }
}

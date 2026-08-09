// web3.js - Isolated Web3 Integration for Pann (Read & Write)

const WEB3_CONFIG = {
    contractAddress: "0x96be3dfdf788b7078ef7514e076ccfd33acfd7cd",
    chainId: 1, // Ethereum Mainnet
    
    // Free Public Node so fans don't need MetaMask to hear the live state
    publicRpcUrl: "https://cloudflare-eth.com",
    
    layerTokens: {
        "strings": 4285,
        "winds": 4286,
        "ambience": 4287,
        "rhythm": 4288,
        "traditional": 4289, // Exactly matched to your JSON ID
        "voices": 4290,
        "guitars": 4291, 
        "keys": 4292,
        "electronic": 4293
    },
    
    abi: [
        // WRITE functions (Requires MetaMask)
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function useControlToken(uint256 tokenId, uint256 variantId)",
        
        // READ function (Publicly accessible)
        "function getControlToken(uint256 tokenId) view returns (uint256)" 
    ]
};

const web3State = {
    provider: null, 
    signer: null,
    address: null,
    ownedLayers: [],
    pendingChanges: {}
};

async function initWeb3() {
    // 1. Instantly fetch and sync the live Master State for all visitors on load
    syncLiveState();

    // 2. Setup Wallet Buttons for Owners
    const connectBtn = document.getElementById('connect-wallet-btn');
    const closeBtn = document.getElementById('close-owner-tab');
    const publishBtn = document.getElementById('publish-btn');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            if (web3State.address) openOwnerTab();
            else await connectWallet();
        });
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

// --- THE GLOBAL READ FUNCTION (For Fans & Visitors) ---
async function syncLiveState() {
    try {
        console.log("Fetching live Master state from Ethereum...");
        const publicProvider = new ethers.providers.JsonRpcProvider(WEB3_CONFIG.publicRpcUrl);
        const readContract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, publicProvider);

        const originalSelects = document.querySelectorAll('.layer-select');

        for (const select of originalSelects) {
            const layerId = select.dataset.layerId || select.id.replace('select-', '');
            // Failsafe normalization (e.g., "Traditional" -> "traditional")
            const normalizedLayerId = layerId.toLowerCase().replace(/\s+/g, '-');
            const tokenId = WEB3_CONFIG.layerTokens[normalizedLayerId] || WEB3_CONFIG.layerTokens[layerId];

            if (!tokenId || tokenId === 0) continue;

            try {
                const currentVariant = await readContract.getControlToken(tokenId);
                
                if (select.selectedIndex !== Number(currentVariant)) {
                    select.selectedIndex = Number(currentVariant);
                    // This tells your script.js to physically change the audio/image!
                    select.dispatchEvent(new Event('change'));
                }
            } catch (err) {
                console.warn(`Could not fetch state for ${layerId} (Token ${tokenId}).`);
            }
        }
        console.log("Pann is fully synced with the blockchain!");
    } catch (error) {
        console.error("Failed to sync global state:", error);
    }
}

// --- THE WRITE FUNCTIONS (For Layer Owners) ---
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert("MetaMask is not installed. Please install a Web3 wallet to continue.");
        return;
    }

    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        
        // Force Ethereum Mainnet
        const network = await provider.getNetwork();
        if (network.chainId !== WEB3_CONFIG.chainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ethers.utils.hexValue(WEB3_CONFIG.chainId) }],
                });
            } catch (switchError) {
                alert("Please switch your MetaMask network to Ethereum Mainnet.");
                return;
            }
        }

        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        web3State.provider = provider;
        web3State.signer = signer;
        web3State.address = address;

        const connectBtn = document.getElementById('connect-wallet-btn');
        connectBtn.innerHTML = `⚙ ${address.slice(0, 6)}...${address.slice(-4)}`;
        connectBtn.classList.add('connected');
        
        await verifyOwnership();
        openOwnerTab();
        
    } catch (error) {
        console.error("Wallet connection failed:", error);
    }
}

async function verifyOwnership() {
    if (!web3State.signer) return;
    web3State.ownedLayers = [];
    const contract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, web3State.provider);
    
    for (const [layerId, tokenId] of Object.entries(WEB3_CONFIG.layerTokens)) {
        if (tokenId === 0) continue; 
        try {
            // ERC-1155 standard check
            const balance = await contract.balanceOf(web3State.address, tokenId);
            if (balance.gt(0)) {
                web3State.ownedLayers.push(layerId);
            }
        } catch (error) {
            console.error(`Failed to fetch ownership for ${layerId}:`, error);
        }
    }
}

function openOwnerTab() {
    const overlay = document.getElementById('owner-tab-overlay');
    const controlsContainer = document.getElementById('owner-layer-controls');
    const publishBtn = document.getElementById('publish-btn');
    
    controlsContainer.innerHTML = ''; 
    web3State.pendingChanges = {}; 
    
    if (web3State.ownedLayers.length === 0) {
        controlsContainer.innerHTML = '<p class="owner-description" style="color: #e74c3c;">You do not own any layers in this Master Stem.</p>';
        publishBtn.disabled = true;
        overlay.classList.add('active');
        return;
    }
    
    publishBtn.disabled = false;
    const originalSelects = document.querySelectorAll('.layer-select');
    
    originalSelects.forEach(originalSelect => {
        const layerId = originalSelect.dataset.layerId || originalSelect.id.replace('select-', '');
        const normalizedLayerId = layerId.toLowerCase().replace(/\s+/g, '-');
        
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
        
        if (web3State.ownedLayers.includes(normalizedLayerId) || web3State.ownedLayers.includes(layerId)) {
            label.textContent = `${layerId.charAt(0).toUpperCase() + layerId.slice(1)} (Owned)`;
            label.classList.add('owned-layer-text');
            
            select.addEventListener('change', (e) => {
                const selectedOpt = e.target.options[e.target.selectedIndex];
                web3State.pendingChanges[layerId] = {
                    originalElement: originalSelect,
                    newValue: e.target.value,
                    variantIndex: selectedOpt.dataset.variantIndex
                };
            });
        } else {
            label.textContent = `${layerId.charAt(0).toUpperCase() + layerId.slice(1)} (Locked)`;
            select.disabled = true;
        }
        
        row.appendChild(label);
        row.appendChild(select);
        controlsContainer.appendChild(row);
    });
    
    overlay.classList.add('active');
}

async function publishToBlockchain() {
    const statusText = document.getElementById('tx-status');
    const publishBtn = document.getElementById('publish-btn');
    
    const layerIdsToUpdate = Object.keys(web3State.pendingChanges);
    if (layerIdsToUpdate.length === 0) {
        statusText.textContent = "No changes to publish.";
        return;
    }
    
    statusText.textContent = "Awaiting signature in MetaMask...";
    statusText.style.color = "#f39c12";
    publishBtn.disabled = true;
    
    try {
        const contract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, web3State.signer);
        
        for (const layerId of layerIdsToUpdate) {
            const normalizedLayerId = layerId.toLowerCase().replace(/\s+/g, '-');
            const change = web3State.pendingChanges[layerId];
            const tokenId = WEB3_CONFIG.layerTokens[normalizedLayerId] || WEB3_CONFIG.layerTokens[layerId];
            
            if (!tokenId) continue;

            const tx = await contract.useControlToken(tokenId, change.variantIndex);
            statusText.textContent = `Tx submitted for ${layerId}. Waiting for confirmation...`;
            await tx.wait(); 
        }
        
        statusText.textContent = "Successfully published state on-chain!";
        statusText.style.color = "#2ecc71";
        
        layerIdsToUpdate.forEach(layerId => {
            const change = web3State.pendingChanges[layerId];
            change.originalElement.value = change.newValue;
            // Hot-swap the live audio
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

document.addEventListener('DOMContentLoaded', initWeb3);

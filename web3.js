// web3.js - Isolated Web3 Integration for Pann
// Handles MetaMask connection, layer ownership validation, and on-chain publishing.

const WEB3_CONFIG = {
    contractAddress: "0x96be3dfdf788b7078ef7514e076ccfd33acfd7cd",
    chainId: 1, // Ethereum Mainnet
    
    // Mapping your UI layer IDs to the Smart Contract Token IDs
    layerTokens: {
        "strings": 4285,
        "winds": 4286,
        "ambience": 4287,
        "rhythm": 4288,
        "traditional-melody": 4289, 
        "voices": 4290,
        "guitars": 0, // Placeholder until minted
        "keys": 4292,
        "electronic": 4293
    },
    
    // Standard Async Art V1/V2 ERC-721 ABI
    abi: [
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

async function initWeb3() {
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
                console.error("Failed to switch to Ethereum Mainnet:", switchError);
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

        // Update Button UI
        const connectBtn = document.getElementById('connect-wallet-btn');
        connectBtn.innerHTML = `⚙ ${address.slice(0, 6)}...${address.slice(-4)}`;
        connectBtn.classList.add('connected');
        
        await verifyOwnership();
        openOwnerTab();
        
    } catch (error) {
        console.error("Wallet connection failed:", error);
        alert("Wallet connection was rejected or failed.");
    }
}

async function verifyOwnership() {
    if (!web3State.signer) return;
    web3State.ownedLayers = [];
    const contract = new ethers.Contract(WEB3_CONFIG.contractAddress, WEB3_CONFIG.abi, web3State.provider);
    
    for (const [layerId, tokenId] of Object.entries(WEB3_CONFIG.layerTokens)) {
        if (tokenId === 0) continue; // Skip guitars for now
        try {
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() === web3State.address.toLowerCase()) {
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
        
        // Ensure mapping matches UI keys (handle formatting differences like spaces/dashes)
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
        statusText.style.color = "#fff";
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
            // Triggers the core audio/visual engine to sync
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

(async function () {
    const USE_LOCAL_GITHUB_FILES = false; 
    const GITHUB_BASE_URL = "./"; 

    const JSON_URL = "QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    const IPFS_GATEWAYS = [
        'https://ipfs.io/ipfs/', 
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/',
        'https://gateway.pinata.cloud/ipfs/'
    ];

    const ARTISTS_LIST = [
        "Pradeep Kumar", "Anthony Daasan", "Kalyani Nair", "Susha", "Ghana NB",
        "Vidhya Vijay", "Sujith Sreedhar", "Rakesh", "Manoj Y D", "Pravekha",
        "M S Yeshwanth", "Praveen Sparsh", "Tapass Naresh", "Kanaxx", "Manonmani",
        "Ramana Balachandran", "Padmaja Sreenivasan", "Samanvitha G. Sasidaran", "Sushmita Narasimhan", "Nidhi Saraogi",
        "Sriradha Bharath", "Avantika K", "Fathima Henna", "Pranjal Thakore", "Manoj Krishna",
        "Himanshu Barot", "Manikandan Chembai", "Aditya Ravindran", "Solomon Ravindar", "Karthik Manickavasakam",
        "Naveen Narendranath", "Rithu Vysakh", "Nikhil Ram", "Mylai M Karthikeyan", "Bharath"
    ];

    let manifestData = null;
    const audioElements = {};
    const audioContexts = {};

    const state = {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        selections: {
            visuals: {},
            audio: {}
        },
        web3: {
            account: null,
            isConnected: false
        }
    };

    const UI = {
        gatewayPage: document.getElementById('gateway-page'),
        playerPage: document.getElementById('player-page'),
        enterBtn: document.getElementById('enterBtn'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        stopBtn: document.getElementById('stopBtn'),
        mixBtn: document.getElementById('mixBtn'),
        iconPlay: document.getElementById('icon-play'),
        iconPause: document.getElementById('icon-pause'),
        progressBar: document.getElementById('progressBar'),
        progressFill: document.getElementById('progressFill'),
        currentTimeEl: document.getElementById('current-time'),
        totalTimeEl: document.getElementById('total-time'),
        layerContainer: document.getElementById('layer-container'),
        playerBg: document.getElementById('player-bg'),
        controls: document.getElementById('controls-container'),
        loadingOverlay: document.getElementById('loading-overlay'),
        connectWalletBtn: document.getElementById('connectWalletBtn'),
        walletInfo: document.getElementById('walletInfo'),
        walletAddressDisplay: document.getElementById('walletAddressDisplay'),
        logoutWalletBtn: document.getElementById('logoutWalletBtn'),
        blueprintList: document.getElementById('blueprint-list')
    };

    function resolveIPFS(uri) {
        if (!uri) return '';
        if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
        const hash = uri.replace('ipfs://', '');
        return `${IPFS_GATEWAYS[0]}${hash}`;
    }

    async function fetchWithFallback(ipfsHash) {
        for (const gateway of IPFS_GATEWAYS) {
            try {
                const response = await fetch(`${gateway}${ipfsHash}`);
                if (response.ok) return await response.json();
            } catch (err) {
                console.warn(`Gateway ${gateway} failed, trying next...`);
            }
        }
        throw new Error("All IPFS gateways failed to resolve manifest.");
    }

    async function init() {
        try {
            if (USE_LOCAL_GITHUB_FILES) {
                const res = await fetch(`${GITHUB_BASE_URL}manifest.json`);
                manifestData = await res.json();
            } else {
                manifestData = await fetchWithFallback(JSON_URL);
            }

            buildControls();
            initTabs();
            initWeb3();
        } catch (err) {
            console.error("Initialization error:", err);
        }
    }

    // --- Web3 Wallet Connection Logic ---
    function initWeb3() {
        if (UI.connectWalletBtn) {
            UI.connectWalletBtn.addEventListener('click', async () => {
                if (typeof window.ethereum !== 'undefined') {
                    try {
                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        if (accounts.length > 0) {
                            handleAccountConnected(accounts[0]);
                        }
                    } catch (err) {
                        console.error("User rejected wallet connection:", err);
                    }
                } else {
                    alert("MetaMask or Web3 compatible browser extension not detected. Please install MetaMask.");
                }
            });
        }

        if (UI.logoutWalletBtn) {
            UI.logoutWalletBtn.addEventListener('click', () => {
                handleWalletLogout();
            });
        }

        // Check if already connected
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
                if (accounts.length > 0) {
                    handleAccountConnected(accounts[0]);
                }
            }).catch(console.error);

            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    handleAccountConnected(accounts[0]);
                } else {
                    handleWalletLogout();
                }
            });
        }
    }

    function handleAccountConnected(account) {
        state.web3.account = account;
        state.web3.isConnected = true;
        const shortAddr = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        
        UI.walletAddressDisplay.textContent = shortAddr;
        UI.connectWalletBtn.classList.add('hidden');
        UI.walletInfo.classList.remove('hidden');

        renderOwnerBlueprints();
    }

    function handleWalletLogout() {
        state.web3.account = null;
        state.web3.isConnected = false;

        UI.walletInfo.classList.add('hidden');
        UI.connectWalletBtn.classList.remove('hidden');
        
        if (UI.blueprintList) {
            UI.blueprintList.innerHTML = `<div class="blueprint-empty">Connect your MetaMask wallet to view and control your active blueprints.</div>`;
        }
    }

    function renderOwnerBlueprints() {
        if (!UI.blueprintList) return;
        UI.blueprintList.innerHTML = `
            <div class="blueprint-card">
                <div class="blueprint-card-title">Pann Master Blueprint #01 (Landscape: Kurinji)</div>
                <button class="blueprint-card-action" onclick="alert('Blueprint #01 configuration successfully synchronized on-chain!')">Configure</button>
            </div>
            <div class="blueprint-card">
                <div class="blueprint-card-title">Pann Living Stem #04 (Ambience & Strings)</div>
                <button class="blueprint-card-action" onclick="alert('Stem #04 configuration successfully synchronized on-chain!')">Configure</button>
            </div>
        `;
    }

    // --- Tab Switcher Logic ---
    function initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`tab-${targetTab}`).classList.add('active');
            });
        });
    }

    function buildControls() {
        if (!manifestData || !manifestData.layers) return;

        UI.controls.innerHTML = '';
        manifestData.layers.forEach(layer => {
            const layerId = layer.id;
            const variants = layer.variants;

            if (variants && variants.length > 0) {
                state.selections.visuals[layerId] = resolveIPFS(variants[0].visual);
                state.selections.audio[layerId] = resolveIPFS(variants[0].audio);
            }

            const group = document.createElement('div');
            group.className = 'layer-group';

            const label = document.createElement('span');
            label.className = 'layer-label';
            label.textContent = layer.name;

            const select = document.createElement('select');
            select.className = 'layer-select';
            select.dataset.layerId = layerId;

            variants.forEach((variant, idx) => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({
                    visual: resolveIPFS(variant.visual),
                    audio: resolveIPFS(variant.audio)
                });
                opt.textContent = variant.name || `Variant ${idx + 1}`;
                select.appendChild(opt);
            });

            select.addEventListener('change', async (e) => {
                const data = JSON.parse(e.target.value);
                state.selections.visuals[layerId] = data.visual;
                state.selections.audio[layerId] = data.audio;

                updateVisuals();
                await loadAudioStreams();
            });

            group.appendChild(label);
            group.appendChild(select);
            UI.controls.appendChild(group);
        });

        updateVisuals();
    }

    function updateVisuals() {
        UI.layerContainer.innerHTML = '';
        Object.entries(state.selections.visuals).forEach(([layerId, url]) => {
            if (!url) return;
            const img = document.createElement('img');
            img.src = url;
            img.className = 'artwork-layer';
            img.crossOrigin = 'anonymous';
            UI.layerContainer.appendChild(img);
        });
    }

    async function loadAudioStreams() {
        UI.loadingOverlay.classList.remove('hidden');

        try {
            Object.keys(audioElements).forEach(id => {
                audioElements[id].pause();
                audioElements[id].src = '';
                delete audioElements[id];
            });

            const loadPromises = Object.entries(state.selections.audio).map(([layerId, url]) => {
                return new Promise((resolve) => {
                    if (!url) { resolve(); return; }
                    const audio = new Audio();
                    audio.crossOrigin = 'anonymous';
                    audio.preload = 'auto';
                    audio.loop = true;

                    audio.addEventListener('canplaythrough', () => {
                        resolve();
                    }, { once: true });

                    audio.addEventListener('error', () => {
                        console.warn(`Failed audio stream for layer ${layerId}`);
                        resolve();
                    }, { once: true });

                    audio.src = url;
                    audio.load();
                    audioElements[layerId] = audio;
                });
            });

            await Promise.all(loadPromises);
        } catch (err) {
            console.error("Audio stream loading error:", err);
        } finally {
            UI.loadingOverlay.classList.add('hidden');
        }
    }

    function playAudio() {
        Object.values(audioElements).forEach(audio => {
            audio.play().catch(err => console.log("Playback interrupted:", err));
        });
        state.isPlaying = true;
        UI.iconPlay.classList.add('hidden');
        UI.iconPause.classList.remove('hidden');
        startTicker();
    }

    function pauseAudio() {
        Object.values(audioElements).forEach(audio => {
            audio.pause();
        });
        state.isPlaying = false;
        UI.iconPause.classList.add('hidden');
        UI.iconPlay.classList.remove('hidden');
        stopTicker();
    }

    function stopAudio() {
        pauseAudio();
        Object.values(audioElements).forEach(audio => {
            audio.currentTime = 0;
        });
        state.currentTime = 0;
        updateProgressUI();
    }

    let tickerInterval = null;
    function startTicker() {
        if (tickerInterval) clearInterval(tickerInterval);
        tickerInterval = setInterval(() => {
            const primaryAudio = Object.values(audioElements)[0];
            if (primaryAudio && !isNaN(primaryAudio.duration)) {
                state.currentTime = primaryAudio.currentTime;
                state.duration = primaryAudio.duration;
                updateProgressUI();
            }
        }, 250);
    }

    function stopTicker() {
        if (tickerInterval) clearInterval(tickerInterval);
    }

    function updateProgressUI() {
        if (UI.currentTimeEl) UI.currentTimeEl.textContent = formatTime(state.currentTime);
        if (UI.totalTimeEl) UI.totalTimeEl.textContent = formatTime(state.duration || 0);
        if (UI.progressFill && state.duration > 0) {
            const pct = (state.currentTime / state.duration) * 100;
            UI.progressFill.style.width = `${pct}%`;
        }
    }

    function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function handleProgressInteraction(e) {
        if (!state.duration) return;
        const rect = UI.progressBar.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const pct = clickX / rect.width;
        const newTime = pct * state.duration;

        Object.values(audioElements).forEach(audio => {
            audio.currentTime = newTime;
        });
        state.currentTime = newTime;
        updateProgressUI();
    }

    if (UI.enterBtn) {
        UI.enterBtn.addEventListener('click', async () => {
            UI.gatewayPage.classList.remove('active');
            setTimeout(() => {
                UI.gatewayPage.classList.add('hidden');
                UI.playerPage.classList.remove('hidden');
                setTimeout(() => UI.playerPage.classList.add('active'), 50);
            }, 600);

            await loadAudioStreams();
        });
    }

    if (UI.playPauseBtn) {
        UI.playPauseBtn.addEventListener('click', async () => {
            if (state.isPlaying) pauseAudio();
            else playAudio();
        });
    }

    if (UI.stopBtn) {
        UI.stopBtn.addEventListener('click', () => stopAudio());
    }

    if (UI.mixBtn) {
        UI.mixBtn.addEventListener('click', async () => {
            UI.controls.querySelectorAll('.layer-select').forEach(select => {
                select.selectedIndex = Math.floor(Math.random() * select.options.length);
                const data = JSON.parse(select.value);
                state.selections.visuals[select.dataset.layerId] = data.visual;
                state.selections.audio[select.dataset.layerId] = data.audio;
            });

            updateVisuals();
            await loadAudioStreams();
        });
    }

    if (UI.progressBar) {
        UI.progressBar.addEventListener('click', handleProgressInteraction);
        UI.progressBar.addEventListener('touchstart', handleProgressInteraction, { passive: true });
    }

    init();
})();

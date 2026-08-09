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
        "Naveen Narendranath", "Rithu Vysakh", "Nikhil Ram", "Mylai M Karthikeyan", "Bharath Sankar",
        "Amrit", "Aarvay", "Radar with a K", "Keba Jeremiah", "Shallu Varun",
        "Jhanu", "Metapurse"
    ];

    const state = {
        metadata: null,
        audioPool: {}, 
        visualSlots: {}, 
        selections: { visuals: {}, audio: {} },
        isPlaying: false,
        duration: 0,
        syncInterval: null,
        isSeeking: false,
        web3: {
            account: null,
            isConnected: false
        }
    };

    let animationFrameId = null;

    const UI = {
        gatewayPage: document.getElementById("gateway-page"),
        playerPage: document.getElementById("player-page"),
        enterBtn: document.getElementById("enterBtn"),
        artistsContainer: document.getElementById("artists-container"),
        controls: document.getElementById("controls"),
        activeTags: document.getElementById("active-tags"),
        playPauseBtn: document.getElementById("playPauseBtn"),
        stopBtn: document.getElementById("stopBtn"),
        mixBtn: document.getElementById("mixBtn"),
        iconPlay: document.getElementById("icon-play"),
        iconPause: document.getElementById("icon-pause"),
        progressBar: document.getElementById("progressBar"),
        progressFill: document.getElementById("progress-fill"),
        currentTimeEl: document.getElementById("current-time"),
        totalTimeEl: document.getElementById("total-time"),
        loadingOverlay: document.getElementById("loading-overlay"),
        loadingText: document.getElementById("loading-text"),
        playerBg: document.getElementById("player-bg"),
        layerContainer: document.getElementById("layer-container"),
        learnMoreBtn: document.getElementById("learnMoreBtn"),
        moreText: document.getElementById("moreText"),
        connectWalletBtn: document.getElementById("connectWalletBtn"),
        walletInfo: document.getElementById("walletInfo"),
        walletAddressDisplay: document.getElementById("walletAddressDisplay"),
        logoutWalletBtn: document.getElementById("logoutWalletBtn"),
        ownerBlueprintsBtn: document.getElementById("ownerBlueprintsBtn"),
        blueprintModal: document.getElementById("blueprintModal"),
        closeBlueprintModal: document.getElementById("closeBlueprintModal")
    };

    function populateArtists() {
        if (!UI.artistsContainer) return;
        UI.artistsContainer.innerHTML = '';
        ARTISTS_LIST.forEach(artist => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = artist;
            UI.artistsContainer.appendChild(tag);
        });
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function getUrls(cid) {
        if (!cid) return [];
        if (cid.startsWith("http")) return [cid];
        const hash = cid.replace('ipfs://', '');
        if (USE_LOCAL_GITHUB_FILES) return [`${GITHUB_BASE_URL}${hash}`];
        return IPFS_GATEWAYS.map(gw => `${gw}${hash}`);
    }

    function extractRealName(opt, index) {
        if (!opt) return `Option ${index + 1}`;
        if (opt.label) return opt.label;
        if (opt.name) return opt.name;
        if (opt.value) return opt.value;
        if (opt.uri) {
            try {
                let cleanName = opt.uri.split('/').pop().split('.')[0].replace(/[-_]/g, ' ').trim();
                if (cleanName && cleanName.length < 30 && !cleanName.startsWith('Qm')) {
                    return cleanName.replace(/\b\w/g, char => char.toUpperCase());
                }
            } catch (e) {}
        }
        return `Option ${index + 1}`;
    }

    function renderTags() {
        if (!UI.activeTags) return;
        UI.activeTags.innerHTML = '';
        UI.controls.querySelectorAll('.layer-select').forEach(select => {
            const opt = select.options[select.selectedIndex];
            if (opt) {
                const tag = document.createElement("span");
                tag.className = "playing-tag";
                tag.textContent = opt.text;
                UI.activeTags.appendChild(tag);
            }
        });
    }

    // --- Web3 Wallet & Owner Modal Management ---
    function initWeb3AndModal() {
        if (UI.connectWalletBtn) {
            UI.connectWalletBtn.addEventListener('click', async () => {
                if (typeof window.ethereum !== 'undefined') {
                    try {
                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        if (accounts.length > 0) {
                            handleWalletConnected(accounts[0]);
                        }
                    } catch (err) {
                        console.error("Wallet connection rejected:", err);
                    }
                } else {
                    alert("MetaMask not detected. Please install a Web3 browser extension.");
                }
            });
        }

        if (UI.logoutWalletBtn) {
            UI.logoutWalletBtn.addEventListener('click', () => {
                handleWalletLogout();
            });
        }

        if (UI.ownerBlueprintsBtn && UI.blueprintModal) {
            UI.ownerBlueprintsBtn.addEventListener('click', () => {
                UI.blueprintModal.classList.remove('hidden');
            });
        }

        if (UI.closeBlueprintModal && UI.blueprintModal) {
            UI.closeBlueprintModal.addEventListener('click', () => {
                UI.blueprintModal.classList.add('hidden');
            });
        }

        // Auto-detect existing session
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
                if (accounts.length > 0) handleWalletConnected(accounts[0]);
            }).catch(console.error);

            window.ethereum.on('accountsChanged', accounts => {
                if (accounts.length > 0) handleWalletConnected(accounts[0]);
                else handleWalletLogout();
            });
        }
    }

    function handleWalletConnected(account) {
        state.web3.account = account;
        state.web3.isConnected = true;
        const shortAddr = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        
        if (UI.walletAddressDisplay) UI.walletAddressDisplay.textContent = shortAddr;
        if (UI.connectWalletBtn) UI.connectWalletBtn.classList.add('hidden');
        if (UI.walletInfo) UI.walletInfo.classList.remove('hidden');
        if (UI.ownerBlueprintsBtn) UI.ownerBlueprintsBtn.classList.remove('hidden');
    }

    function handleWalletLogout() {
        state.web3.account = null;
        state.web3.isConnected = false;

        if (UI.walletInfo) UI.walletInfo.classList.add('hidden');
        if (UI.connectWalletBtn) UI.connectWalletBtn.classList.remove('hidden');
        if (UI.ownerBlueprintsBtn) UI.ownerBlueprintsBtn.classList.add('hidden');
        if (UI.blueprintModal) UI.blueprintModal.classList.add('hidden');
    }

    async function fetchJSON() {
        for (const gateway of IPFS_GATEWAYS) {
            try {
                const res = await fetch(`${gateway}${JSON_URL}`);
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`Gateway timeout...`);
            }
        }
        throw new Error("All IPFS gateways failed to load metadata.");
    }

    async function loadAudioStreams() {
        UI.loadingOverlay.classList.remove('hidden');
        if (UI.loadingText) UI.loadingText.textContent = "Connecting Layers...";
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = true;

        const loadPromises = Object.keys(state.selections.audio).map(layerId => {
            return new Promise((resolve) => {
                const cid = state.selections.audio[layerId];
                const audioNode = state.audioPool[layerId]; 
                
                if (!cid || !audioNode) { resolve(null); return; }

                const urls = getUrls(cid);
                if (urls.length === 0) { resolve(null); return; }

                if (audioNode.src && urls.some(u => audioNode.src.includes(u.split('/').pop()))) {
                    resolve({ layerId, audioNode });
                    return;
                }

                audioNode.volume = 0; 
                let attempt = 0;

                const onCanPlay = () => {
                    if (audioNode.duration > state.duration) state.duration = audioNode.duration;
                    resolve({ layerId, audioNode });
                };

                audioNode.addEventListener('canplaythrough', onCanPlay, { once: true });
                audioNode.addEventListener('loadeddata', onCanPlay, { once: true });

                audioNode.addEventListener('error', () => { 
                    attempt++;
                    if (attempt < urls.length) {
                        audioNode.src = urls[attempt];
                        audioNode.load();
                    } else { 
                        resolve(null); 
                    }
                }); 
                
                audioNode.src = urls[attempt];
                audioNode.load();
            });
        });

        await Promise.all(loadPromises);

        let syncTime = 0;
        const currentActiveNodes = Object.values(state.audioPool).filter(n => !n.paused && n.volume > 0);
        if (currentActiveNodes.length > 0) syncTime = currentActiveNodes[0].currentTime;

        Object.keys(state.selections.audio).forEach(layerId => {
            const cid = state.selections.audio[layerId];
            const node = state.audioPool[layerId];
            
            if (cid && node) {
                if (state.isPlaying) {
                    node.currentTime = syncTime;
                    const p = node.play();
                    if (p !== undefined) p.catch(() => {});
                }
            } else if (node) {
                node.pause();
            }
        });

        if (state.isPlaying) {
            enforceSync();
            setTimeout(() => { enforceSync(); }, 200);
            
            Object.keys(state.selections.audio).forEach(layerId => {
                if (state.selections.audio[layerId]) state.audioPool[layerId].volume = 1;
            });
        }

        if (UI.totalTimeEl) UI.totalTimeEl.textContent = formatTime(state.duration);
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = false;
        UI.loadingOverlay.classList.add('hidden');
    }

    function enforceSync() {
        if (state.isSeeking) return;

        const nodes = Object.values(state.audioPool).filter(n => !n.paused && n.src);
        if (nodes.length <= 1) return;
        
        const master = nodes[0];
        nodes.forEach((node, i) => {
            if (i === 0) return;
            const drift = node.currentTime - master.currentTime;
            
            if (Math.abs(drift) > 0.2) {
                node.currentTime = master.currentTime;
            } else if (Math.abs(drift) > 0.03) {
                node.playbackRate = master.playbackRate - (drift * 0.4); 
            } else {
                node.playbackRate = 1.0;
            }
        });
    }

    function playAudio(targetTime = null) {
        const nodes = Object.values(state.audioPool).filter(n => n.src);
        if (nodes.length === 0) return;

        const timeToSet = targetTime !== null ? targetTime : (nodes[0].currentTime || 0);
        
        nodes.forEach(node => { 
            node.volume = 0;
            node.currentTime = timeToSet; 
            const p = node.play();
            if (p !== undefined) { p.catch(err => console.warn("Safari blocked play", err)); }
        });

        state.isPlaying = true;
        document.body.classList.add('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.add('hidden');
        if (UI.iconPause) UI.iconPause.classList.remove('hidden');
        renderTags();

        setTimeout(() => {
            enforceSync();
            nodes.forEach(node => { node.volume = 1; });
        }, 250);

        if (state.syncInterval) clearInterval(state.syncInterval);
        state.syncInterval = setInterval(enforceSync, 600); 
        requestAnimationFrame(updateLoop);
    }

    function pauseAudio() {
        Object.values(state.audioPool).forEach(node => node.pause());
        state.isPlaying = false;
        document.body.classList.remove('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.remove('hidden');
        if (UI.iconPause) UI.iconPause.classList.add('hidden');
        if (state.syncInterval) clearInterval(state.syncInterval);
    }

    function stopAudio() {
        Object.values(state.audioPool).forEach(node => {
            node.pause();
            node.currentTime = 0;
            node.playbackRate = 1.0;
        });
        state.isPlaying = false;
        document.body.classList.remove('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.remove('hidden');
        if (UI.iconPause) UI.iconPause.classList.add('hidden');
        if (UI.progressFill) UI.progressFill.style.width = '0%';
        if (UI.currentTimeEl) UI.currentTimeEl.textContent = '0:00';
        if (state.syncInterval) clearInterval(state.syncInterval);
        cancelAnimationFrame(animationFrameId);
    }

    async function seekTo(targetTime) {
        if (!state.duration || isNaN(targetTime)) return;

        state.isSeeking = true;
        if (state.syncInterval) clearInterval(state.syncInterval);

        const nodes = Object.values(state.audioPool).filter(n => n.src);
        if (nodes.length === 0) {
            state.isSeeking = false;
            return;
        }

        const percent = (targetTime / state.duration) * 100;
        if (UI.progressFill) UI.progressFill.style.width = `${percent}%`;
        if (UI.currentTimeEl) UI.currentTimeEl.textContent = formatTime(targetTime);

        UI.loadingOverlay.classList.remove('hidden');
        if (UI.loadingText) UI.loadingText.textContent = "Syncing Layers...";

        nodes.forEach(node => {
            node.pause();
            node.volume = 0;
            node.playbackRate = 1.0;
        });

        const seekPromises = nodes.map(node => {
            return new Promise(resolve => {
                const onReady = () => {
                    node.removeEventListener('seeked', onReady);
                    node.removeEventListener('canplay', onReady);
                    resolve();
                };
                
                node.addEventListener('seeked', onReady);
                node.addEventListener('canplay', onReady);
                node.currentTime = targetTime;

                setTimeout(resolve, 4000); 
            });
        });

        await Promise.all(seekPromises);

        nodes.forEach(node => {
            node.currentTime = targetTime;
            node.volume = 1;
        });

        state.isSeeking = false;
        UI.loadingOverlay.classList.add('hidden');

        if (state.isPlaying) {
            nodes.forEach(node => {
                const p = node.play();
                if (p !== undefined) p.catch(() => {});
            });
            state.syncInterval = setInterval(enforceSync, 600);
        }
    }

    function handleProgressInteraction(e) {
        if (!state.duration) return;
        const rect = UI.progressBar.getBoundingClientRect();
        
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
        }

        if (clientX === undefined || clientX === null) return;

        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const targetTime = percentage * state.duration;

        seekTo(targetTime);
    }

    function updateLoop() {
        if (!state.isPlaying || state.isSeeking) return;
        const nodes = Object.values(state.audioPool).filter(n => !n.paused && n.src);
        if (nodes.length > 0 && UI.progressFill && UI.currentTimeEl) {
            const current = nodes[0].currentTime;
            UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
            UI.currentTimeEl.textContent = formatTime(current);
        }
        animationFrameId = requestAnimationFrame(updateLoop);
    }

    function updateVisuals(changedLayerId = null) {
        if (!state.metadata) return;
        const visuals = (state.metadata.layout?.layers || []).slice(0, 10);

        visuals.forEach((layer) => {
            const layerId = layer.id;
            
            if (changedLayerId && changedLayerId !== layerId) return;

            const cid = state.selections.visuals[layerId];
            const slot = state.visualSlots[layerId]; 
            
            if (!slot) return;
            
            slot.dataset.targetCid = cid;

            if (!cid) {
                slot.innerHTML = '';
                return;
            }

            const urls = getUrls(cid);
            if (urls.length === 0) return;

            const isString = layerId.toLowerCase().includes('string');
            const img = new Image();
            img.className = isString ? 'bg-layer-cover' : 'layerImage';

            let attempt = 0;
            img.onload = () => {
                if (slot.dataset.targetCid !== cid) return;

                const oldImages = Array.from(slot.querySelectorAll('img'));
                
                oldImages.forEach(oldImg => {
                    oldImg.classList.remove('layer-visible');
                    setTimeout(() => { if (oldImg.parentNode) oldImg.remove(); }, 1200);
                });

                slot.appendChild(img);
                
                requestAnimationFrame(() => {
                    img.classList.add('layer-visible');
                });
            };
            img.onerror = () => { attempt++; if (attempt < urls.length) img.src = urls[attempt]; };
            img.src = urls[attempt];
        });
    }

    async function handleChange(layerId, visualCid, audioCid) {
        state.selections.visuals[layerId] = visualCid;
        state.selections.audio[layerId] = audioCid;
        renderTags(); 
        
        updateVisuals(layerId); 
        await loadAudioStreams(); 
    }

    async function init() {
        populateArtists();
        initWeb3AndModal();
        
        try {
            state.metadata = await fetchJSON();
            const visuals = (state.metadata.layout?.layers || []).slice(0, 10);
            const audios = (state.metadata["audio-layout"]?.layers || []).slice(0, 10);

            if (UI.controls) UI.controls.innerHTML = '';
            
            visuals.forEach((layer, index) => {
                const layerId = layer.id || `layer_${index}`;
                
                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.loop = true;
                audio.preload = "auto";
                audio.preservesPitch = false;
                state.audioPool[layerId] = audio;

                const slot = document.createElement('div');
                slot.className = 'layer-slot';
                slot.style.zIndex = index + 5; 
                
                const isString = layerId.toLowerCase().includes('string');
                if (isString) {
                    UI.playerBg.appendChild(slot);
                } else {
                    UI.layerContainer.appendChild(slot);
                }
                state.visualSlots[layerId] = slot;

                if (layer.states?.options?.length > 0) {
                    const audioLayer = audios[index];
                    
                    const div = document.createElement("div");
                    div.className = "dropdown-group";
                    
                    const label = document.createElement("label");
                    label.textContent = layer.name || layerId.replace(/[_-]/g, ' ');
                    
                    const select = document.createElement("select");
                    select.className = "layer-select";
                    select.dataset.layerId = layerId; 
                    
                    layer.states.options.forEach((opt, idx) => {
                        const option = document.createElement("option");
                        const audioCid = audioLayer?.states?.options?.[idx]?.uri || "";
                        option.value = JSON.stringify({ visual: opt.uri, audio: audioCid });
                        option.textContent = extractRealName(opt, idx);
                        select.appendChild(option);
                    });

                    div.appendChild(label);
                    div.appendChild(select);
                    UI.controls.appendChild(div);

                    select.addEventListener("change", (e) => {
                        const data = JSON.parse(e.target.value);
                        handleChange(layerId, data.visual, data.audio);
                    });
                }
            });

            UI.controls.querySelectorAll('.layer-select').forEach(select => {
                select.selectedIndex = Math.floor(Math.random() * select.options.length);
                const data = JSON.parse(select.value);
                state.selections.visuals[select.dataset.layerId] = data.visual;
                state.selections.audio[select.dataset.layerId] = data.audio;
            });

            renderTags();
            updateVisuals(); 

        } catch (e) {
            console.error("Failed to load metadata", e);
        }
    }

    if (UI.learnMoreBtn && UI.moreText) {
        UI.learnMoreBtn.addEventListener('click', () => {
            UI.moreText.classList.toggle('hidden');
            UI.learnMoreBtn.textContent = UI.moreText.classList.contains('hidden') ? "Learn more" : "Show less";
        });
    }

    if (UI.enterBtn && UI.gatewayPage && UI.playerPage) {
        UI.enterBtn.addEventListener('click', async () => {
            
            Object.values(state.audioPool).forEach(node => {
                node.volume = 0;
                const p = node.play();
                if (p !== undefined) p.catch(()=>{});
                node.pause();
            });

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

            renderTags();
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

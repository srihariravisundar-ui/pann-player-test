(async function () {
    const JSON_URL = "https://gateway.pinata.cloud/ipfs/QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    const IPFS_GATEWAYS = ['https://ipfs.io/ipfs/', 'https://cloudflare-ipfs.com/ipfs/', 'https://dweb.link/ipfs/'];

    // Engine State
    const state = {
        audioNodes: {}, // HTML5 Audio Elements mapped by CID
        selections: { visuals: {}, audio: {} },
        isPlaying: false,
        duration: 0,
        syncInterval: null
    };

    let animationFrameId = null;

    // UI Elements
    const UI = {
        gatewayPage: document.getElementById("gateway-page"),
        playerPage: document.getElementById("player-page"),
        enterBtn: document.getElementById("enterBtn"),
        controls: document.getElementById("controls"),
        tagsContainer: document.getElementById("active-tags"),
        playBtn: document.getElementById("playBtn"),
        pauseBtn: document.getElementById("pauseBtn"),
        saveBtn: document.getElementById("saveBtn"),
        randomizeBtn: document.getElementById("randomizeBtn"),
        baseImage: document.getElementById("baseImage"),
        artworkDiv: document.getElementById("artwork"),
        loadingOverlay: document.getElementById("loading-overlay"),
        progressFill: document.getElementById("progress-fill"),
        progressBar: document.getElementById("progressBar"),
        currentTimeEl: document.getElementById("current-time"),
        totalTimeEl: document.getElementById("total-time"),
        statusIndicator: document.getElementById("connection-indicator"),
        statusText: document.getElementById("loading-info"),
        loadingFill: document.getElementById("loading-fill"),
        fullscreenBtn: document.getElementById("fullscreenBtn"),
        toast: document.getElementById("toast")
    };

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function setStatus(msg, type = 'ready') {
        UI.statusText.textContent = msg;
        UI.statusIndicator.className = `status-dot ${type}`;
    }

    function toGatewayURL(cid, attempt = 0) {
        if (!cid) return "";
        if (cid.startsWith("http")) return cid;
        return `${IPFS_GATEWAYS[attempt] || IPFS_GATEWAYS[0]}${cid.replace('ipfs://', '')}`;
    }

    function extractRealName(opt, index) {
        if (!opt) return `Variant ${index + 1}`;
        if (opt.name) return opt.name;
        if (opt.value) return opt.value;
        if (opt.label) return opt.label;
        if (opt.trait_value) return opt.trait_value;
        if (opt.attributes && Array.isArray(opt.attributes)) {
            const valid = opt.attributes.find(attr => attr.value);
            if (valid) return valid.value;
        }
        if (opt.uri) {
            try {
                let cleanName = opt.uri.split('/').pop().split('.')[0].replace(/[-_]/g, ' ').trim();
                if (cleanName && cleanName.length < 30 && !cleanName.startsWith('Qm')) {
                    return cleanName.replace(/\b\w/g, char => char.toUpperCase());
                }
            } catch (e) {}
        }
        return `Blueprint ${index + 1}`;
    }

    function toggleEditMode(isEditing) {
        if (isEditing) {
            UI.controls.classList.remove("hidden");
            UI.tagsContainer.classList.add("hidden");
        } else {
            UI.controls.classList.add("hidden");
            UI.tagsContainer.innerHTML = '';
            
            UI.controls.querySelectorAll('.layer-select').forEach(select => {
                const opt = select.options[select.selectedIndex];
                if (opt) {
                    const tag = document.createElement("span");
                    tag.className = "minimal-tag";
                    tag.textContent = opt.text;
                    UI.tagsContainer.appendChild(tag);
                }
            });
            UI.tagsContainer.classList.remove("hidden");
        }
    }

    // --- HTML5 Streaming Engine (Fixes RAM Crashes & Allows Background Play) ---
    async function loadAudioStreams() {
        setStatus("Buffering Streams...", "loading");
        UI.playBtn.disabled = true;
        
        const activeCIDs = Object.values(state.selections.audio).filter(cid => cid);
        
        // Stop & cleanup old unused nodes
        Object.keys(state.audioNodes).forEach(oldCid => {
            if (!activeCIDs.includes(oldCid)) {
                state.audioNodes[oldCid].pause();
                state.audioNodes[oldCid].src = "";
                delete state.audioNodes[oldCid];
            }
        });

        // Initialize new nodes
        let loadedCount = 0;
        const loadPromises = activeCIDs.map(cid => {
            return new Promise((resolve) => {
                if (state.audioNodes[cid]) {
                    loadedCount++;
                    resolve(); // Already loaded
                    return;
                }

                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.loop = true;
                audio.preload = "auto";
                
                audio.addEventListener('canplaythrough', () => {
                    if (audio.duration > state.duration) state.duration = audio.duration;
                    loadedCount++;
                    UI.loadingFill.style.width = `${(loadedCount / activeCIDs.length) * 100}%`;
                    resolve();
                }, { once: true });

                audio.addEventListener('error', () => { resolve(); }); // Ignore failure to not block mix
                
                audio.src = toGatewayURL(cid);
                audio.load();
                state.audioNodes[cid] = audio;
            });
        });

        await Promise.all(loadPromises);
        
        UI.totalTimeEl.textContent = formatTime(state.duration);
        UI.loadingFill.style.width = '0%';
        setStatus("Ready", "ready");
        UI.playBtn.disabled = false;
        
        // Initialize Media Session for Lock Screen / Background playback
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Pann Blueprint',
                artist: 'Pradeep Kumar & 42 Artists',
                album: 'Osai Kekkudho'
            });
            navigator.mediaSession.setActionHandler('play', () => playAudio());
            navigator.mediaSession.setActionHandler('pause', () => pauseAudio());
        }
    }

    // Master Sync Function: Prevents HTML5 audio from drifting
    function enforceSync() {
        const nodes = Object.values(state.audioNodes);
        if (nodes.length <= 1) return;
        
        const masterTime = nodes[0].currentTime;
        nodes.forEach((node, i) => {
            if (i === 0) return;
            // If any track drifts by more than 0.05s, snap it back to master
            if (Math.abs(node.currentTime - masterTime) > 0.05) {
                node.currentTime = masterTime;
            }
        });
    }

    function playAudio(targetTime = null) {
        const nodes = Object.values(state.audioNodes);
        if (nodes.length === 0) return;

        // Sync times before playing
        const timeToSet = targetTime !== null ? targetTime : nodes[0].currentTime;
        nodes.forEach(node => { node.currentTime = timeToSet; });

        nodes.forEach(node => {
            const playPromise = node.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.log("Playback interrupted"));
            }
        });

        state.isPlaying = true;
        toggleEditMode(false);
        setStatus("Playing", "ready");
        
        // Start Sync Loop (Fixes HTML5 drift)
        if (state.syncInterval) clearInterval(state.syncInterval);
        state.syncInterval = setInterval(enforceSync, 2000); 

        requestAnimationFrame(updateLoop);
    }

    function pauseAudio() {
        Object.values(state.audioNodes).forEach(node => node.pause());
        state.isPlaying = false;
        if (state.syncInterval) clearInterval(state.syncInterval);
        setStatus("Paused", "ready");
        toggleEditMode(true);
    }

    function updateLoop() {
        if (!state.isPlaying) return;
        const nodes = Object.values(state.audioNodes);
        if (nodes.length > 0) {
            const current = nodes[0].currentTime;
            UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
            UI.currentTimeEl.textContent = formatTime(current);
        }
        animationFrameId = requestAnimationFrame(updateLoop);
    }

    // --- UI Logic & State ---
    function updateVisuals() {
        const layers = UI.artworkDiv.querySelectorAll('.layerImage:not(#baseImage)');
        layers.forEach(l => l.remove());

        Object.values(state.selections.visuals).forEach(cid => {
            if (cid) {
                const img = new Image();
                img.className = 'layerImage active';
                img.src = toGatewayURL(cid);
                UI.artworkDiv.appendChild(img);
            }
        });
    }

    function updateURLState() {
        // Build a concise URL parameter array based on selected indices
        const indices = [];
        UI.controls.querySelectorAll('.layer-select').forEach(select => {
            indices.push(select.selectedIndex);
        });
        const stateString = indices.join('-');
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?mix=' + stateString;
        window.history.replaceState({path: newUrl}, '', newUrl);
    }

    function applyURLState() {
        const urlParams = new URLSearchParams(window.location.search);
        const mix = urlParams.get('mix');
        if (!mix) return false;

        const indices = mix.split('-');
        const selects = UI.controls.querySelectorAll('.layer-select');
        
        if (indices.length === selects.length) {
            selects.forEach((select, i) => {
                const targetIndex = parseInt(indices[i]);
                if (targetIndex >= 0 && targetIndex < select.options.length) {
                    select.selectedIndex = targetIndex;
                    const data = JSON.parse(select.value);
                    const realId = select.dataset.layerId;
                    state.selections.visuals[realId] = data.visual;
                    state.selections.audio[realId] = data.audio;
                }
            });
            return true;
        }
        return false;
    }

    async function handleChange(id, visualCid, audioCid) {
        state.selections.visuals[id] = visualCid;
        state.selections.audio[id] = audioCid;
        updateVisuals();
        updateURLState();

        if (state.isPlaying) {
            await loadAudioStreams();
            playAudio(); 
        } else {
            await loadAudioStreams(); // Buffer silently
        }
    }

    async function init() {
        try {
            const res = await fetch(JSON_URL);
            const metadata = await res.json();
            
            if (metadata.image) UI.baseImage.src = toGatewayURL(metadata.image);
            
            const visuals = (metadata.layout?.layers || []).slice(0, 10);
            const audios = (metadata["audio-layout"]?.layers || []).slice(0, 10);

            UI.controls.innerHTML = '';
            
            visuals.forEach((layer, i) => {
                if (layer.states?.options?.length > 0) {
                    const layerId = layer.id || `layer_${i}`;
                    const audioLayer = audios[i];
                    
                    const div = document.createElement("div");
                    div.className = "layer-control";
                    
                    const label = document.createElement("div");
                    label.className = "layer-label";
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

            // Handle Initial Load (URL params OR Randomize)
            if (!applyURLState()) {
                UI.controls.querySelectorAll('.layer-select').forEach(select => {
                    select.selectedIndex = Math.floor(Math.random() * select.options.length);
                    const data = JSON.parse(select.value);
                    state.selections.visuals[select.dataset.layerId] = data.visual;
                    state.selections.audio[select.dataset.layerId] = data.audio;
                });
                updateURLState();
            }

            updateVisuals();
            UI.loadingOverlay.style.display = 'none';
            await loadAudioStreams(); // Pre-buffer

        } catch (e) {
            setStatus("Failed to load metadata", "error");
        }
    }

    // --- Page Transitions & Events ---
    UI.enterBtn.addEventListener('click', () => {
        UI.gatewayPage.classList.remove('active');
        setTimeout(() => {
            UI.gatewayPage.classList.add('hidden');
            UI.playerPage.classList.remove('hidden');
            setTimeout(() => UI.playerPage.classList.add('active'), 50);
        }, 800);
    });

    UI.playBtn.addEventListener('click', async () => {
        if (Object.keys(state.audioNodes).length === 0) await loadAudioStreams();
        playAudio();
    });

    UI.pauseBtn.addEventListener('click', () => pauseAudio());

    UI.randomizeBtn.addEventListener('click', async () => {
        UI.controls.querySelectorAll('.layer-select').forEach(select => {
            select.selectedIndex = Math.floor(Math.random() * select.options.length);
            const realId = select.dataset.layerId; 
            const data = JSON.parse(select.value);
            state.selections.visuals[realId] = data.visual;
            state.selections.audio[realId] = data.audio;
        });

        updateVisuals();
        updateURLState();
        
        await loadAudioStreams();
        if (state.isPlaying) playAudio();
    });

    UI.saveBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        UI.toast.classList.remove('hidden');
        setTimeout(() => UI.toast.classList.add('hidden'), 3000);
    });

    UI.progressBar.addEventListener('click', (e) => {
        if (state.duration === 0) return;
        const rect = UI.progressBar.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percentage * state.duration;
        
        if (state.isPlaying) {
            playAudio(newTime);
        } else {
            Object.values(state.audioNodes).forEach(node => node.currentTime = newTime);
            UI.progressFill.style.width = `${percentage * 100}%`;
            UI.currentTimeEl.textContent = formatTime(newTime);
        }
    });

    UI.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e=>{});
        else document.exitFullscreen();
    });

    init();
})();

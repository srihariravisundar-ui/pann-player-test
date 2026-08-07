(async function () {
    const JSON_URL = "https://gateway.pinata.cloud/ipfs/QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    const IPFS_GATEWAYS = ['https://ipfs.io/ipfs/', 'https://cloudflare-ipfs.com/ipfs/', 'https://dweb.link/ipfs/'];
    const CACHE_NAME = 'pann-stems-v2'; // Bumped cache version to flush old memory

    // Core Engine State
    const state = {
        audioCtx: null,
        selections: { visuals: {}, audio: {} },
        audioBuffers: {}, 
        activeSources: {}, 
        isPlaying: false,
        startTime: 0,
        pauseTime: 0,
        duration: 0,
        isFetching: false // Prevents overlapping fetch calls
    };

    let animationFrameId = null;

    // UI Elements
    const UI = {
        controls: document.getElementById("controls"),
        tagsContainer: document.getElementById("active-tags"),
        playBtn: document.getElementById("playBtn"),
        pauseBtn: document.getElementById("pauseBtn"),
        stopBtn: document.getElementById("stopBtn"),
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
        fullscreenBtn: document.getElementById("fullscreenBtn")
    };

    // --- Utilities ---
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

    // --- Aggressive Metadata Name Extractor ---
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
                if (cleanName && cleanName.length < 30 && !cleanName.startsWith('Qm') && !cleanName.startsWith('bafy')) {
                    return cleanName.replace(/\b\w/g, char => char.toUpperCase());
                }
            } catch (e) {
                console.warn("URI parse error:", e);
            }
        }
        return `Blueprint ${index + 1}`;
    }

    // --- Minimalist View Toggle ---
    function toggleEditMode(isEditing) {
        if (isEditing) {
            UI.controls.classList.remove("hidden");
            UI.tagsContainer.classList.add("hidden");
        } else {
            UI.controls.classList.add("hidden");
            UI.tagsContainer.innerHTML = '';
            
            const selects = UI.controls.querySelectorAll('.layer-select');
            selects.forEach(select => {
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

    // --- Audio Engine (Web Audio API + Cache) ---
    async function fetchAudio(cid, attempt = 0) {
        if (!state.audioCtx) return;
        const url = toGatewayURL(cid, attempt);
        const cache = await caches.open(CACHE_NAME);
        
        try {
            let response = await cache.match(url);
            if (!response) {
                response = await fetch(url);
                if (!response.ok) throw new Error("Fetch failed");
                cache.put(url, response.clone()); 
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await state.audioCtx.decodeAudioData(arrayBuffer);
            
            // Map strictly to CID to prevent infinite memory growth
            state.audioBuffers[cid] = audioBuffer;
            return audioBuffer;
        } catch (e) {
            if (attempt < IPFS_GATEWAYS.length - 1) return fetchAudio(cid, attempt + 1);
            throw e;
        }
    }

    async function initAudioContext() {
        if (!state.audioCtx) {
            state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    }

    async function loadMix() {
        if (state.isFetching) return;
        state.isFetching = true;

        setStatus("Loading Blueprint...", "loading");
        UI.loadingFill.style.width = '0%';
        UI.playBtn.disabled = true;
        
        const promises = [];
        const activeAudioCIDs = Object.values(state.selections.audio).filter(cid => cid);
        const totalToLoad = activeAudioCIDs.length;
        let loadedCount = 0;
        
        for (const cid of activeAudioCIDs) {
            if (!state.audioBuffers[cid]) {
                const p = fetchAudio(cid).then(() => {
                    loadedCount++;
                    UI.loadingFill.style.width = `${(loadedCount / totalToLoad) * 100}%`;
                });
                promises.push(p);
            } else {
                loadedCount++;
                UI.loadingFill.style.width = `${(loadedCount / totalToLoad) * 100}%`;
            }
        }

        try {
            await Promise.all(promises);
            
            state.duration = 0;
            for (const cid of activeAudioCIDs) {
                if (state.audioBuffers[cid] && state.audioBuffers[cid].duration > state.duration) {
                    state.duration = state.audioBuffers[cid].duration;
                }
            }
            
            UI.totalTimeEl.textContent = formatTime(state.duration);
            setStatus("Ready", "ready");
            setTimeout(() => { UI.loadingFill.style.width = '0%'; }, 1000); 
        } catch (e) {
            setStatus("Network Error", "error");
        } finally {
            UI.playBtn.disabled = false;
            state.isFetching = false;
        }
    }

    function playAudio(offset = 0) {
        if (state.duration === 0) return;
        stopAudio(false); 

        Object.entries(state.selections.audio).forEach(([layerId, cid]) => {
            if (cid && state.audioBuffers[cid]) {
                const source = state.audioCtx.createBufferSource();
                source.buffer = state.audioBuffers[cid];
                source.loop = true;
                source.connect(state.audioCtx.destination); 
                source.start(0, offset % state.duration);
                state.activeSources[layerId] = source;
            }
        });

        state.startTime = state.audioCtx.currentTime - offset;
        state.isPlaying = true;
        toggleEditMode(false);
        setStatus("Playing", "ready");
        requestAnimationFrame(updateLoop);
    }

    function stopAudio(reset = true) {
        // Explicit Garbage Collection: Stop and disconnect nodes from memory immediately
        Object.values(state.activeSources).forEach(src => { 
            try { 
                src.stop(); 
                src.disconnect(); 
            } catch(e){} 
        });
        
        state.activeSources = {};
        state.isPlaying = false;
        
        if (reset) {
            state.pauseTime = 0;
            state.startTime = 0;
            cancelAnimationFrame(animationFrameId);
            UI.progressFill.style.width = '0%';
            UI.currentTimeEl.textContent = '0:00';
            toggleEditMode(true);
            setStatus("Stopped", "ready");
        } else {
            state.pauseTime = (state.audioCtx.currentTime - state.startTime) % state.duration;
            setStatus("Paused", "ready");
            toggleEditMode(true);
        }
    }

    function updateLoop() {
        if (!state.isPlaying) return;
        const elapsed = (state.audioCtx.currentTime - state.startTime) % state.duration;
        UI.progressFill.style.width = `${(elapsed / state.duration) * 100}%`;
        UI.currentTimeEl.textContent = formatTime(elapsed);
        animationFrameId = requestAnimationFrame(updateLoop);
    }

    // --- UI Logic ---
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

    async function handleChange(id, visualCid, audioCid) {
        state.selections.visuals[id] = visualCid;
        state.selections.audio[id] = audioCid;
        updateVisuals();

        if (state.isPlaying) {
            await loadMix();
            playAudio(state.pauseTime); 
        }
    }

    async function init() {
        try {
            const res = await fetch(JSON_URL);
            const metadata = await res.json();
            
            if (metadata.image) {
                UI.baseImage.src = toGatewayURL(metadata.image);
            }
            
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
                    
                    // CRITICAL FIX: Embed the true architectural ID physically in the dropdown
                    select.dataset.layerId = layerId; 
                    
                    layer.states.options.forEach((opt, idx) => {
                        const option = document.createElement("option");
                        const audioCid = audioLayer?.states?.options?.[idx]?.uri || "";
                        option.value = JSON.stringify({ visual: opt.uri, audio: audioCid });
                        option.textContent = extractRealName(opt, idx);
                        select.appendChild(option);
                    });

                    // Randomize on Boot
                    select.selectedIndex = Math.floor(Math.random() * layer.states.options.length);
                    const selectedData = JSON.parse(select.value);
                    state.selections.visuals[layerId] = selectedData.visual;
                    state.selections.audio[layerId] = selectedData.audio;

                    select.addEventListener("change", (e) => {
                        const data = JSON.parse(e.target.value);
                        handleChange(layerId, data.visual, data.audio);
                    });

                    div.appendChild(label);
                    div.appendChild(select);
                    UI.controls.appendChild(div);
                }
            });

            updateVisuals();
            UI.loadingOverlay.style.display = 'none';
        } catch (e) {
            setStatus("Failed to load metadata", "error");
            console.error("Init Error:", e);
        }
    }

    // --- Events ---
    UI.playBtn.addEventListener('click', async () => {
        await initAudioContext();
        if (!state.isPlaying) {
            await loadMix();
            playAudio(state.pauseTime);
        }
    });

    UI.pauseBtn.addEventListener('click', () => {
        if (state.isPlaying) stopAudio(false);
    });

    UI.stopBtn.addEventListener('click', () => {
        stopAudio(true);
    });

    UI.randomizeBtn.addEventListener('click', async () => {
        await initAudioContext();
        
        UI.controls.querySelectorAll('.layer-select').forEach(select => {
            select.selectedIndex = Math.floor(Math.random() * select.options.length);
            
            // CRITICAL FIX: Target exactly the right layer based on the hidden data attribute
            const realId = select.dataset.layerId; 
            const data = JSON.parse(select.value);
            
            state.selections.visuals[realId] = data.visual;
            state.selections.audio[realId] = data.audio;
        });

        updateVisuals();
        
        if (state.isPlaying) {
            await loadMix();
            playAudio(state.pauseTime);
        }
    });

    UI.progressBar.addEventListener('click', (e) => {
        if (state.duration === 0) return;
        const rect = UI.progressBar.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percentage * state.duration;
        
        if (state.isPlaying) playAudio(newTime);
        else {
            state.pauseTime = newTime;
            UI.progressFill.style.width = `${percentage * 100}%`;
            UI.currentTimeEl.textContent = formatTime(newTime);
        }
    });

    UI.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else {
            document.exitFullscreen();
        }
    });

    // Boot
    init();
})();

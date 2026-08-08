(async function () {
    // --- GITHUB CONFIGURATION ---
    const USE_LOCAL_GITHUB_FILES = false; 
    const GITHUB_BASE_URL = "./"; 

    const JSON_URL = "https://gateway.pinata.cloud/ipfs/QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    const IPFS_GATEWAYS = ['https://ipfs.io/ipfs/', 'https://cloudflare-ipfs.com/ipfs/', 'https://dweb.link/ipfs/'];

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
        audioNodes: {}, 
        selections: { visuals: {}, audio: {} },
        isPlaying: false,
        duration: 0,
        syncInterval: null
    };

    let animationFrameId = null;

    const UI = {
        gatewayPage: document.getElementById("gateway-page"),
        gatewayBg: document.getElementById("gateway-background"),
        artistsContainer: document.getElementById("artists-container"),
        learnMoreBtn: document.getElementById("learnMoreBtn"),
        moreText: document.getElementById("moreText"),
        playerPage: document.getElementById("player-page"),
        playerBg: document.getElementById("player-background"), 
        enterBtn: document.getElementById("enterBtn"),
        controls: document.getElementById("controls"),
        tagsContainer: document.getElementById("active-tags"),
        playPauseBtn: document.getElementById("playPauseBtn"),
        iconPlay: document.getElementById("icon-play"),
        iconPause: document.getElementById("icon-pause"),
        stopBtn: document.getElementById("stopBtn"),
        saveBtn: document.getElementById("saveBtn"),
        randomizeBtn: document.getElementById("randomizeBtn"),
        layerContainer: document.getElementById("layer-container"),
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

    function populateArtists() {
        ARTISTS_LIST.forEach(artist => {
            const tag = document.createElement("span");
            tag.className = "minimal-tag";
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

    function setStatus(msg, type = 'ready') {
        UI.statusText.textContent = msg;
        UI.statusIndicator.className = `status-dot ${type}`;
    }

    function toGatewayURL(cid, attempt = 0) {
        if (!cid) return "";
        if (cid.startsWith("http")) return cid;
        
        const hash = cid.replace('ipfs://', '');
        if (USE_LOCAL_GITHUB_FILES) return `${GITHUB_BASE_URL}${hash}`;
        return `${IPFS_GATEWAYS[attempt] || IPFS_GATEWAYS[0]}${hash}`;
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
        return `Layer ${index + 1}`; // Updated fallback
    }

    function toggleEditMode(isEditing) {
        if (!isEditing) {
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
        }
    }

    async function loadAudioStreams() {
        setStatus("Buffering Streams...", "loading");
        UI.playPauseBtn.disabled = true;
        
        const activeCIDs = Object.values(state.selections.audio).filter(cid => cid);
        
        Object.keys(state.audioNodes).forEach(oldCid => {
            if (!activeCIDs.includes(oldCid)) {
                state.audioNodes[oldCid].pause();
                state.audioNodes[oldCid].src = "";
                delete state.audioNodes[oldCid];
            }
        });

        let loadedCount = 0;
        const loadPromises = activeCIDs.map(cid => {
            return new Promise((resolve) => {
                if (state.audioNodes[cid]) {
                    loadedCount++;
                    resolve(); 
                    return;
                }

                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.loop = true;
                audio.preload = "auto";
                audio.preservesPitch = false; 
                audio.mozPreservesPitch = false;
                audio.webkitPreservesPitch = false;
                
                audio.addEventListener('canplaythrough', () => {
                    if (audio.duration > state.duration) state.duration = audio.duration;
                    loadedCount++;
                    UI.loadingFill.style.width = `${(loadedCount / activeCIDs.length) * 100}%`;
                    resolve();
                }, { once: true });

                audio.addEventListener('error', () => { resolve(); }); 
                
                audio.src = toGatewayURL(cid);
                audio.load();
                state.audioNodes[cid] = audio;
            });
        });

        await Promise.all(loadPromises);
        
        UI.totalTimeEl.textContent = formatTime(state.duration);
        UI.loadingFill.style.width = '0%';
        setStatus("Ready", "ready");
        UI.playPauseBtn.disabled = false;
        
        if ('mediaSession' in navigator) {
            // Simplified metadata for native device display
            navigator.mediaSession.metadata = new MediaMetadata({ title: 'Pann', artist: 'Pradeep Kumar & The Collective' });
            navigator.mediaSession.setActionHandler('play', () => playAudio());
            navigator.mediaSession.setActionHandler('pause', () => pauseAudio());
        }
    }

    function enforceSync() {
        const nodes = Object.values(state.audioNodes).filter(n => !n.paused);
        if (nodes.length <= 1) return;
        
        const master = nodes[0];
        nodes.forEach((node, i) => {
            if (i === 0) return;
            const drift = node.currentTime - master.currentTime;
            
            if (Math.abs(drift) > 0.2) {
                node.currentTime = master.currentTime;
            } else if (Math.abs(drift) > 0.01) {
                node.playbackRate = master.playbackRate - (drift * 0.5); 
            } else {
                node.playbackRate = master.playbackRate;
            }
        });
    }

    function playAudio(targetTime = null) {
        const nodes = Object.values(state.audioNodes);
        if (nodes.length === 0) return;

        const timeToSet = targetTime !== null ? targetTime : nodes[0].currentTime;
        nodes.forEach(node => { node.currentTime = timeToSet; });

        nodes.forEach(node => {
            const p = node.play();
            if (p !== undefined) p.catch(e => {});
        });

        state.isPlaying = true;
        document.body.classList.add('playing'); 
        
        UI.iconPlay.classList.add('hidden');
        UI.iconPause.classList.remove('hidden');

        toggleEditMode(false);
        setStatus("Playing", "ready");
        
        if (state.syncInterval) clearInterval(state.syncInterval);
        state.syncInterval = setInterval(enforceSync, 500); 

        requestAnimationFrame(updateLoop);
    }

    function pauseAudio() {
        Object.values(state.audioNodes).forEach(node => node.pause());
        state.isPlaying = false;
        document.body.classList.remove('playing'); 
        
        UI.iconPlay.classList.remove('hidden');
        UI.iconPause.classList.add('hidden');

        if (state.syncInterval) clearInterval(state.syncInterval);
        setStatus("Paused", "ready");
        toggleEditMode(true);
    }

    function stopAudio() {
        Object.values(state.audioNodes).forEach(node => {
            node.pause();
            node.currentTime = 0;
            node.playbackRate = 1.0;
        });
        state.isPlaying = false;
        document.body.classList.remove('playing'); 
        
        UI.iconPlay.classList.remove('hidden');
        UI.iconPause.classList.add('hidden');

        UI.progressFill.style.width = '0%';
        UI.currentTimeEl.textContent = '0:00';
        if (state.syncInterval) clearInterval(state.syncInterval);
        cancelAnimationFrame(animationFrameId);
        setStatus("Stopped", "ready");
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

    function updateVisuals() {
        const oldPlayerLayers = UI.layerContainer.querySelectorAll('.layerImage');
        const oldPlayerBgLayers = UI.playerBg.querySelectorAll('.layerImage');
        const oldGatewayLayers = UI.gatewayBg.querySelectorAll('.layerImage');

        oldPlayerLayers.forEach(el => { el.classList.remove('active'); setTimeout(() => el.remove(), 1200); });
        oldPlayerBgLayers.forEach(el => { el.classList.remove('active'); setTimeout(() => el.remove(), 1200); });
        oldGatewayLayers.forEach(el => { el.classList.remove('active'); setTimeout(() => el.remove(), 1200); });

        Object.entries(state.selections.visuals).forEach(([layerId, cid]) => {
            if (cid) {
                const url = toGatewayURL(cid);
                
                if (layerId.toLowerCase().includes('string')) {
                    const imgG = new Image(); imgG.src = url; imgG.className = 'layerImage bg-layer-cover';
                    const imgP = new Image(); imgP.src = url; imgP.className = 'layerImage bg-layer-cover';
                    UI.gatewayBg.appendChild(imgG);
                    UI.playerBg.appendChild(imgP);
                    setTimeout(() => { imgG.classList.add('active'); imgP.classList.add('active'); }, 50);
                } else {
                    const imgG = new Image(); imgG.src = url; imgG.className = 'layerImage floating-layer';
                    const imgP = new Image(); imgP.src = url; imgP.className = 'layerImage floating-layer';
                    
                    const delay = Math.random() * -15; 
                    imgG.style.animationDelay = `${delay}s`;
                    imgP.style.animationDelay = `${delay}s`;
                    
                    UI.gatewayBg.appendChild(imgG);
                    UI.layerContainer.appendChild(imgP);
                    setTimeout(() => { imgG.classList.add('active'); imgP.classList.add('active'); }, 50);
                }
            }
        });
    }

    function updateURLState() {
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
        let currentTime = 0;
        const nodes = Object.values(state.audioNodes);
        if (nodes.length > 0) currentTime = nodes[0].currentTime;

        state.selections.visuals[id] = visualCid;
        state.selections.audio[id] = audioCid;
        updateVisuals();
        updateURLState();

        if (state.isPlaying) {
            await loadAudioStreams();
            playAudio(currentTime); 
        } else {
            await loadAudioStreams(); 
        }
    }

    async function init() {
        populateArtists();
        
        try {
            const res = await fetch(JSON_URL);
            const metadata = await res.json();
            
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
            await loadAudioStreams(); 

        } catch (e) {
            setStatus("Failed to load metadata", "error");
        }
    }

    // --- Events ---
    UI.learnMoreBtn.addEventListener('click', () => {
        UI.moreText.classList.toggle('hidden');
        UI.learnMoreBtn.textContent = UI.moreText.classList.contains('hidden') ? "Learn more" : "Show less";
    });

    UI.enterBtn.addEventListener('click', () => {
        UI.gatewayPage.classList.remove('active');
        setTimeout(() => {
            UI.gatewayPage.classList.add('hidden');
            UI.playerPage.classList.remove('hidden');
            setTimeout(() => UI.playerPage.classList.add('active'), 50);
        }, 800);
    });

    UI.playPauseBtn.addEventListener('click', async () => {
        if (state.isPlaying) {
            pauseAudio();
        } else {
            if (Object.keys(state.audioNodes).length === 0) await loadAudioStreams();
            playAudio();
        }
    });

    UI.stopBtn.addEventListener('click', () => stopAudio());

    UI.randomizeBtn.addEventListener('click', async () => {
        let currentTime = 0;
        const nodes = Object.values(state.audioNodes);
        if (nodes.length > 0) currentTime = nodes[0].currentTime;

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
        if (state.isPlaying) playAudio(currentTime);
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

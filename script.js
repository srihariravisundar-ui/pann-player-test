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
        audioPool: {}, // Safari strict audio track pool
        visualSlots: {}, // Safari strict visual container pool
        selections: { visuals: {}, audio: {} },
        isPlaying: false,
        duration: 0,
        syncInterval: null
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
        playerBg: document.getElementById("player-bg"),
        layerContainer: document.getElementById("layer-container"),
        learnMoreBtn: document.getElementById("learnMoreBtn"),
        moreText: document.getElementById("moreText")
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

    // --- THE SAFARI AUDIO ENGINE FIX ---
    // Instead of creating new audio elements, we reuse the pre-approved pool
    async function loadAudioStreams() {
        UI.loadingOverlay.classList.remove('hidden');
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = true;

        const activeCIDs = Object.values(state.selections.audio).filter(cid => cid);
        
        const loadPromises = Object.keys(state.selections.audio).map(layerId => {
            return new Promise((resolve) => {
                const cid = state.selections.audio[layerId];
                const audioNode = state.audioPool[layerId]; // Get existing pre-approved node
                
                if (!cid || !audioNode) { resolve(null); return; }

                const urls = getUrls(cid);
                if (urls.length === 0) { resolve(null); return; }

                // If this node is already playing this exact track, skip loading
                if (audioNode.src && urls.some(u => audioNode.src.includes(u.split('/').pop()))) {
                    resolve({ layerId, audioNode });
                    return;
                }

                audioNode.volume = 0; // Load silently
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

        // Apply new nodes
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
            
            // Fade in active tracks safely
            Object.keys(state.selections.audio).forEach(layerId => {
                if (state.selections.audio[layerId]) state.audioPool[layerId].volume = 1;
            });
        }

        if (UI.totalTimeEl) UI.totalTimeEl.textContent = formatTime(state.duration);
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = false;
        UI.loadingOverlay.classList.add('hidden');
    }

    function enforceSync() {
        const nodes = Object.values(state.audioPool).filter(n => !n.paused && n.src);
        if (nodes.length <= 1) return;
        
        const master = nodes[0];
        nodes.forEach((node, i) => {
            if (i === 0) return;
            const drift = node.currentTime - master.currentTime;
            
            // Relaxed threshold slightly to prevent Safari clicking artifacts
            if (Math.abs(drift) > 0.2) {
                node.currentTime = master.currentTime;
            } else if (Math.abs(drift) > 0.03) {
                node.playbackRate = master.playbackRate - (drift * 0.4); 
            } else {
                node.playbackRate = master.playbackRate;
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

    function updateLoop() {
        if (!state.isPlaying) return;
        const nodes = Object.values(state.audioPool).filter(n => !n.paused && n.src);
        if (nodes.length > 0 && UI.progressFill && UI.currentTimeEl) {
            const current = nodes[0].currentTime;
            UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
            UI.currentTimeEl.textContent = formatTime(current);
        }
        animationFrameId = requestAnimationFrame(updateLoop);
    }

    // --- THE VISUAL HIERARCHY FIX ---
    // Injecting images directly into their locked z-index slots
    function updateVisuals(changedLayerId = null) {
        if (!state.metadata) return;
        const visuals = (state.metadata.layout?.layers || []).slice(0, 10);

        visuals.forEach((layer) => {
            const layerId = layer.id;
            
            // If a specific layer was selected, ONLY update that layer
            if (changedLayerId && changedLayerId !== layerId) return;

            const cid = state.selections.visuals[layerId];
            const slot = state.visualSlots[layerId]; // Get the locked container
            
            if (!slot) return;
            if (!cid) {
                slot.innerHTML = '';
                return;
            }

            const urls = getUrls(cid);
            if (urls.length === 0) return;

            const isString = layerId.toLowerCase().includes('string');

            // Mark old image to fade out
            const oldImg = slot.querySelector('img');
            if (oldImg) oldImg.classList.remove('layer-visible');

            const img = new Image();
            img.className = isString ? 'bg-layer-cover' : 'layerImage';

            let attempt = 0;
            img.onload = () => {
                slot.appendChild(img);
                
                requestAnimationFrame(() => {
                    img.classList.add('layer-visible');
                });
                
                if (oldImg) {
                    setTimeout(() => { if(oldImg.parentNode) oldImg.remove(); }, 1200);
                }
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
        
        try {
            state.metadata = await fetchJSON();
            const visuals = (state.metadata.layout?.layers || []).slice(0, 10);
            const audios = (state.metadata["audio-layout"]?.layers || []).slice(0, 10);

            if (UI.controls) UI.controls.innerHTML = '';
            
            visuals.forEach((layer, index) => {
                const layerId = layer.id || `layer_${index}`;
                
                // 1. PRE-BUILD THE SAFARI AUDIO POOL
                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.loop = true;
                audio.preload = "auto";
                audio.preservesPitch = false;
                state.audioPool[layerId] = audio;

                // 2. PRE-BUILD THE LOCKED VISUAL HIERARCHY BOXES
                const slot = document.createElement('div');
                slot.className = 'layer-slot';
                slot.style.zIndex = index + 5; // PERMANENT Z-INDEX LOCK
                
                const isString = layerId.toLowerCase().includes('string');
                if (isString) {
                    UI.playerBg.appendChild(slot);
                } else {
                    UI.layerContainer.appendChild(slot);
                }
                state.visualSlots[layerId] = slot;

                // 3. BUILD THE DROPDOWNS
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
            // We intentionally do NOT load audio here yet. Safari demands user click first.

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

    // THE MASTER SAFARI UNLOCK
    if (UI.enterBtn && UI.gatewayPage && UI.playerPage) {
        UI.enterBtn.addEventListener('click', async () => {
            
            // The moment they tap, instantly whitelist all 10 audio tracks
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

            // Now that Safari is unlocked, fetch the massive audio files safely
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
        UI.progressBar.addEventListener('click', (e) => {
            if (state.duration === 0) return;
            const rect = UI.progressBar.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = percentage * state.duration;
            
            if (state.isPlaying) {
                playAudio(newTime);
            } else {
                Object.values(state.audioPool).forEach(node => { if(node.src) node.currentTime = newTime; });
                if (UI.progressFill) UI.progressFill.style.width = `${percentage * 100}%`;
                if (UI.currentTimeEl) UI.currentTimeEl.textContent = formatTime(newTime);
            }
        });
    }

    init();
})();

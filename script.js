(async function () {
    const USE_LOCAL_GITHUB_FILES = false; 
    const GITHUB_BASE_URL = "./"; 

    const JSON_URL = "QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    const IPFS_GATEWAYS = [
        'https://ipfs.io/ipfs/', 
        'https://dweb.link/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
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
        audioNodes: {}, 
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

    // Aggressively extracts proper names from the JSON, fixing "Option 1" bug
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

    function updateURLParams() {
        const selects = UI.controls.querySelectorAll('.layer-select');
        const indices = Array.from(selects).map(s => s.selectedIndex);
        const param = indices.join('-');
        const newUrl = `${window.location.pathname}?mix=${param}`;
        window.history.replaceState({}, '', newUrl);
    }

    function loadURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const mix = urlParams.get('mix');
        if (!mix) return false;
        
        const indices = mix.split('-').map(Number);
        const selects = UI.controls.querySelectorAll('.layer-select');
        if (indices.length !== selects.length) return false;

        selects.forEach((select, i) => {
            if (indices[i] >= 0 && indices[i] < select.options.length) {
                select.selectedIndex = indices[i];
                const data = JSON.parse(select.value);
                state.selections.visuals[select.dataset.layerId] = data.visual;
                state.selections.audio[select.dataset.layerId] = data.audio;
            }
        });
        return true;
    }

    async function fetchJSON() {
        for (const gateway of IPFS_GATEWAYS) {
            try {
                const res = await fetch(`${gateway}${JSON_URL}`, { mode: 'cors' });
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`Gateway ${gateway} failed, trying next...`);
            }
        }
        throw new Error("All IPFS gateways failed to load metadata.");
    }

    async function loadAudioStreams(isBackgroundShuffle = false) {
        if (!isBackgroundShuffle && UI.loadingOverlay) {
            UI.loadingOverlay.classList.remove('hidden');
        }
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = true;

        const activeCIDs = Object.values(state.selections.audio).filter(cid => cid);
        const cidsToLoad = activeCIDs.filter(cid => !state.audioNodes[cid]);
        
        const loadPromises = cidsToLoad.map(cid => {
            return new Promise((resolve) => {
                const urls = getUrls(cid);
                if (urls.length === 0) { resolve(null); return; }

                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.loop = true;
                audio.preload = "auto";
                audio.volume = isBackgroundShuffle ? 0 : 1; 
                audio.preservesPitch = false; // Prevents popping artifacts
                
                let attempt = 0;

                const onCanPlay = () => {
                    if (audio.duration > state.duration) state.duration = audio.duration;
                    resolve({ cid, audio });
                };

                audio.addEventListener('canplaythrough', onCanPlay, { once: true });
                audio.addEventListener('loadeddata', onCanPlay, { once: true });

                audio.addEventListener('error', () => { 
                    attempt++;
                    if (attempt < urls.length) {
                        audio.src = urls[attempt];
                        audio.load();
                    } else { 
                        resolve(null); 
                    }
                }); 
                
                audio.src = urls[attempt];
                audio.load();
            });
        });

        const newNodes = await Promise.all(loadPromises);

        let syncTime = 0;
        const currentActiveNodes = Object.values(state.audioNodes).filter(n => !n.paused && n.volume > 0);
        if (currentActiveNodes.length > 0) syncTime = currentActiveNodes[0].currentTime;

        newNodes.forEach(result => {
            if (result && result.audio) {
                state.audioNodes[result.cid] = result.audio;
                if (state.isPlaying) {
                    result.audio.currentTime = syncTime;
                    const p = result.audio.play();
                    if (p !== undefined) p.catch(() => {});
                }
            }
        });

        if (state.isPlaying && !isBackgroundShuffle) {
            enforceSync();
        }

        Object.keys(state.audioNodes).forEach(oldCid => {
            if (!activeCIDs.includes(oldCid)) {
                state.audioNodes[oldCid].pause();
                state.audioNodes[oldCid].src = "";
                delete state.audioNodes[oldCid];
            } else if (!isBackgroundShuffle) {
                state.audioNodes[oldCid].volume = 1; 
            }
        });

        if (UI.totalTimeEl) UI.totalTimeEl.textContent = formatTime(state.duration);
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = false;
        if (!isBackgroundShuffle && UI.loadingOverlay) UI.loadingOverlay.classList.add('hidden');
    }

    function enforceSync() {
        const nodes = Object.values(state.audioNodes).filter(n => !n.paused);
        if (nodes.length <= 1) return;
        
        const master = nodes[0];
        nodes.forEach((node, i) => {
            if (i === 0) return;
            const drift = node.currentTime - master.currentTime;
            
            if (Math.abs(drift) > 0.15) {
                node.currentTime = master.currentTime;
            } else if (Math.abs(drift) > 0.02) {
                node.playbackRate = master.playbackRate - (drift * 0.4); 
            } else {
                node.playbackRate = master.playbackRate;
            }
        });
    }

    function playAudio(targetTime = null) {
        const nodes = Object.values(state.audioNodes);
        if (nodes.length === 0) return;

        const timeToSet = targetTime !== null ? targetTime : (nodes[0].currentTime || 0);
        
        nodes.forEach(node => { 
            node.currentTime = timeToSet; 
            const p = node.play();
            if (p !== undefined) {
                p.catch(err => {
                    console.warn("Safari Audio Autoplay restriction caught:", err);
                });
            }
        });

        state.isPlaying = true;
        document.body.classList.add('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.add('hidden');
        if (UI.iconPause) UI.iconPause.classList.remove('hidden');
        renderTags();
        updateURLParams();

        if (state.syncInterval) clearInterval(state.syncInterval);
        state.syncInterval = setInterval(enforceSync, 600); 
        requestAnimationFrame(updateLoop);
    }

    function pauseAudio() {
        Object.values(state.audioNodes).forEach(node => node.pause());
        state.isPlaying = false;
        document.body.classList.remove('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.remove('hidden');
        if (UI.iconPause) UI.iconPause.classList.add('hidden');
        if (state.syncInterval) clearInterval(state.syncInterval);
    }

    function stopAudio() {
        Object.values(state.audioNodes).forEach(node => {
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
        const nodes = Object.values(state.audioNodes);
        if (nodes.length > 0 && UI.progressFill && UI.currentTimeEl) {
            const current = nodes[0].currentTime;
            UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
            UI.currentTimeEl.textContent = formatTime(current);
        }
        animationFrameId = requestAnimationFrame(updateLoop);
    }

    function updateVisuals() {
        if (!state.metadata) return;
        const visuals = (state.metadata.layout?.layers || []).slice(0, 10);

        // Mark existing images as old to gracefully fade them out
        if (UI.playerBg) UI.playerBg.querySelectorAll('img').forEach(img => img.classList.add('old-layer'));
        if (UI.layerContainer) UI.layerContainer.querySelectorAll('img').forEach(img => img.classList.add('old-layer'));

        visuals.forEach((layer) => {
            const layerId = layer.id;
            const cid = state.selections.visuals[layerId];
            if (!cid) return;

            const urls = getUrls(cid);
            if (urls.length === 0) return;

            const isString = layerId.toLowerCase().includes('string');
            const targetContainer = isString ? UI.playerBg : UI.layerContainer;

            const img = new Image();
            img.className = isString ? 'bg-layer-cover' : 'floating-layer';
            img.dataset.layerId = layerId;

            let attempt = 0;
            
            img.onload = () => {
                targetContainer.appendChild(img);
                
                // Allow browser to render then fade in smoothly
                requestAnimationFrame(() => {
                    img.classList.add('layer-visible');
                });
                
                // Gracefully remove the old image for this specific layer
                const oldImages = targetContainer.querySelectorAll(`img[data-layer-id="${layerId}"].old-layer`);
                oldImages.forEach(oldImg => {
                    oldImg.classList.remove('layer-visible');
                    setTimeout(() => oldImg.remove(), 1500);
                });
            };

            img.onerror = () => {
                attempt++;
                if (attempt < urls.length) {
                    img.src = urls[attempt];
                }
            };
            
            img.src = urls[attempt];
        });
    }

    async function handleChange(id, visualCid, audioCid) {
        state.selections.visuals[id] = visualCid;
        state.selections.audio[id] = audioCid;
        renderTags(); 
        updateURLParams();
        updateVisuals(); 
        await loadAudioStreams(true); 
    }

    async function init() {
        populateArtists();
        
        try {
            state.metadata = await fetchJSON();
            const visuals = (state.metadata.layout?.layers || []).slice(0, 10);
            const audios = (state.metadata["audio-layout"]?.layers || []).slice(0, 10);

            if (UI.controls) UI.controls.innerHTML = '';
            
            visuals.forEach((layer, i) => {
                if (layer.states?.options?.length > 0) {
                    const layerId = layer.id || `layer_${i}`;
                    const audioLayer = audios[i];
                    
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
                    if (UI.controls) UI.controls.appendChild(div);

                    select.addEventListener("change", (e) => {
                        const data = JSON.parse(e.target.value);
                        handleChange(layerId, data.visual, data.audio);
                    });
                }
            });

            const hasParams = loadURLParams();
            if (!hasParams) {
                UI.controls.querySelectorAll('.layer-select').forEach(select => {
                    select.selectedIndex = Math.floor(Math.random() * select.options.length);
                    const data = JSON.parse(select.value);
                    state.selections.visuals[select.dataset.layerId] = data.visual;
                    state.selections.audio[select.dataset.layerId] = data.audio;
                });
            }

            renderTags();
            updateVisuals();
            await loadAudioStreams(false); 

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
        UI.enterBtn.addEventListener('click', () => {
            UI.gatewayPage.classList.remove('active');
            setTimeout(() => {
                UI.gatewayPage.classList.add('hidden');
                UI.playerPage.classList.remove('hidden');
                setTimeout(() => UI.playerPage.classList.add('active'), 50);
            }, 600);
        });
    }

    if (UI.playPauseBtn) {
        UI.playPauseBtn.addEventListener('click', async () => {
            if (state.isPlaying) {
                pauseAudio();
            } else {
                playAudio();
            }
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
            updateURLParams();
            updateVisuals();
            await loadAudioStreams(state.isPlaying);
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
                Object.values(state.audioNodes).forEach(node => node.currentTime = newTime);
                if (UI.progressFill) UI.progressFill.style.width = `${percentage * 100}%`;
                if (UI.currentTimeEl) UI.currentTimeEl.textContent = formatTime(newTime);
            }
        });
    }

    init();
})();
(async function () {
    const USE_LOCAL_GITHUB_FILES = false; 
    const GITHUB_BASE_URL = "./"; 

    const JSON_URL = "QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    const IPFS_GATEWAYS = [
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/',
        'https://ipfs.io/ipfs/', 
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
        syncInterval: null,
        isShuffling: false,
        web3: { provider: null, signer: null, address: null }
    };

    let animationFrameId = null;

    const UI = {
        gatewayPage: document.getElementById("gateway-page"),
        gatewayStringBg: document.getElementById("gateway-string-bg"),
        gatewayLayerContainer: document.getElementById("gateway-layer-container"),
        artistsContainer: document.getElementById("artists-container"),
        learnMoreBtn: document.getElementById("learnMoreBtn"),
        moreText: document.getElementById("moreText"),
        playerPage: document.getElementById("player-page"),
        playerBg: document.getElementById("player-bg"),
        layerContainer: document.getElementById("layer-container"),
        enterBtn: document.getElementById("enterBtn"),
        controls: document.getElementById("controls"),
        tagsContainer: document.getElementById("active-tags"),
        playPauseBtn: document.getElementById("playPauseBtn"),
        iconPlay: document.getElementById("icon-play"),
        iconPause: document.getElementById("icon-pause"),
        stopBtn: document.getElementById("stopBtn"),
        mixBtn: document.getElementById("mixBtn"),
        fullscreenBtn: document.getElementById("fullscreenBtn"),
        loadingOverlay: document.getElementById("loading-overlay"),
        loadingText: document.getElementById("loading-text"),
        progressFill: document.getElementById("progress-fill"),
        progressBar: document.getElementById("progressBar"),
        currentTimeEl: document.getElementById("current-time"),
        totalTimeEl: document.getElementById("total-time"),
        toast: document.getElementById("toast")
    };

    function populateArtists() {
        if (!UI.artistsContainer) return;
        UI.artistsContainer.innerHTML = '';
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
        if (!UI.tagsContainer) return;
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

    // --- iOS SAFARI SAFE AUDIO ENGINE ---
    async function loadAudioStreams(isBackgroundShuffle = false) {
        if (!isBackgroundShuffle && UI.loadingOverlay) {
            UI.loadingOverlay.style.display = 'flex';
            if (UI.loadingText) UI.loadingText.textContent = "Loading Stems...";
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
                    if (p !== undefined) p.catch(e => {});
                }
            }
        });

        if (state.isPlaying && !isBackgroundShuffle) {
            enforceSync();
        }

        // Clean up unselected audio nodes safely
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
        if (!isBackgroundShuffle && UI.loadingOverlay) UI.loadingOverlay.style.display = 'none';
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

        // Setup iOS Lock Screen Media Session API
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Pann (Live Master)',
                artist: 'Pradeep Kumar & 42 Artists',
                album: 'Pann - Programmable Art',
                artwork: [{ src: '', sizes: '512x512', type: 'image/jpeg' }]
            });
            navigator.mediaSession.setActionHandler('play', () => playAudio());
            navigator.mediaSession.setActionHandler('pause', () => pauseAudio());
            navigator.mediaSession.setActionHandler('stop', () => stopAudio());
        }
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

        if (UI.gatewayStringBg) UI.gatewayStringBg.innerHTML = '';
        if (UI.gatewayLayerContainer) UI.gatewayLayerContainer.innerHTML = '';
        if (UI.playerBg) UI.playerBg.innerHTML = '';
        if (UI.layerContainer) UI.layerContainer.innerHTML = '';

        visuals.forEach((layer) => {
            const layerId = layer.id;
            const cid = state.selections.visuals[layerId];
            if (!cid) return;
            const urls = getUrls(cid);
            if (urls.length === 0) return;

            const isString = layerId.toLowerCase().includes('string');

            const imgG = document.createElement('img');
            const imgP = document.createElement('img');
            imgG.className = isString ? 'bg-layer-cover' : 'floating-layer';
            imgP.className = isString ? 'bg-layer-cover' : 'floating-layer';

            let attempt = 0;
            const loadNext = () => {
                if (attempt >= urls.length) return;
                imgG.src = urls[attempt];
                imgP.src = urls[attempt];
            };
            imgG.onerror = () => { attempt++; loadNext(); };
            loadNext();

            if (isString) {
                if (UI.gatewayStringBg) UI.gatewayStringBg.appendChild(imgG);
                if (UI.playerBg) UI.playerBg.appendChild(imgP);
            } else {
                if (UI.gatewayLayerContainer) UI.gatewayLayerContainer.appendChild(imgG);
                if (UI.layerContainer) UI.layerContainer.appendChild(imgP);
            }
        });
    }

    async function handleChange(id, visualCid, audioCid) {
        state.selections.visuals[id] = visualCid;
        state.selections.audio[id] = audioCid;
        renderTags(); 
        updateURLParams();
        await loadAudioStreams(true); 
        updateVisuals(); 
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
            if (state.isShuffling) return;
            state.isShuffling = true;

            UI.controls.querySelectorAll('.layer-select').forEach(select => {
                select.selectedIndex = Math.floor(Math.random() * select.options.length);
                const data = JSON.parse(select.value);
                state.selections.visuals[select.dataset.layerId] = data.visual;
                state.selections.audio[select.dataset.layerId] = data.audio;
            });

            renderTags();
            updateURLParams();
            await loadAudioStreams(state.isPlaying);
            updateVisuals();

            state.isShuffling = false;
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

    if (UI.fullscreenBtn) {
        UI.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e=>{});
            else document.exitFullscreen();
        });
    }

    init();
})();

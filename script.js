(async function () {
    const USE_LOCAL_GITHUB_FILES = false;
    const GITHUB_BASE_URL = "./";
    const JSON_URL = "QmepLNcj9mCDaTjVvmCM6ocr9xtjvMbWNTmaCSoaYVmqgq";
    
    // Cascading Gateways
    const IPFS_GATEWAYS = [
        'https://cloudflare-ipfs.com/ipfs/',
        'https://ipfs.io/ipfs/',
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
        "Amrit", "Aarvay", "Radar with a K", "Keba Jeremiah", "Shallu Varun", "Jhanu", "Metapurse"
    ];

    const state = {
        metadata: null,
        audioNodes: {},
        selections: { visuals: {}, audio: {} },
        isPlaying: false,
        duration: 0,
        syncInterval: null
    };

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
        layerContainer: document.getElementById("layer-container")
    };

    let animationFrameId;

    function getUrls(cid) {
        if (!cid) return [];
        if (cid.startsWith("http")) return [cid];
        const hash = cid.replace('ipfs://', '');
        if (USE_LOCAL_GITHUB_FILES) return [`${GITHUB_BASE_URL}${hash}`];
        return IPFS_GATEWAYS.map(gw => `${gw}${hash}`);
    }

    function extractRealName(opt, index) {
        if (opt.label) return opt.label;
        if (opt.name) return opt.name;
        if (opt.value) return opt.value;
        if (opt.uri) {
            let clean = opt.uri.split('/').pop().split('.')[0].replace(/[-_]/g, ' ').trim();
            if (clean && !clean.startsWith('Qm')) return clean.replace(/\b\w/g, c => c.toUpperCase());
        }
        return `Option ${index + 1}`;
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    async function fetchJSON() {
        for (const gateway of IPFS_GATEWAYS) {
            try {
                const res = await fetch(`${gateway}${JSON_URL}`);
                if (res.ok) return await res.json();
            } catch (e) { console.warn(`Gateway timeout: ${gateway}`); }
        }
        throw new Error("All gateways failed.");
    }

    function updateTags() {
        UI.activeTags.innerHTML = '';
        UI.controls.querySelectorAll('select').forEach(select => {
            const opt = select.options[select.selectedIndex];
            if (opt && opt.text !== 'None') {
                const span = document.createElement('span');
                span.className = 'playing-tag';
                span.textContent = opt.text;
                UI.activeTags.appendChild(span);
            }
        });
    }

    // iOS Safari Fix: Load visuals securely and wait for buffer
    function loadImagesSafely() {
        if (!state.metadata) return;
        const visuals = (state.metadata.layout?.layers || []).slice(0, 10);

        visuals.forEach(layer => {
            const layerId = layer.id;
            const cid = state.selections.visuals[layerId];
            if (!cid) return;

            const urls = getUrls(cid);
            if (urls.length === 0) return;

            const isString = layerId.toLowerCase().includes('string');
            const targetContainer = isString ? UI.playerBg : UI.layerContainer;

            const img = new Image();
            img.className = isString ? 'bg-layer-cover' : 'floating-layer';
            // Removed crossOrigin tag - Solves Apple iOS IPFS blocking issues

            let attempt = 0;
            img.onload = () => {
                targetContainer.appendChild(img);
                
                requestAnimationFrame(() => {
                    img.classList.add('layer-visible');
                    
                    // Gracefully delete old images to stop overlapping
                    const oldImages = Array.from(targetContainer.querySelectorAll('img')).filter(el => el !== img);
                    oldImages.forEach(old => {
                        old.classList.remove('layer-visible');
                        setTimeout(() => old.remove(), 1500); 
                    });
                });
            };
            img.onerror = () => {
                attempt++;
                if (attempt < urls.length) img.src = urls[attempt];
            };
            img.src = urls[attempt];
        });
    }

    async function loadAudio() {
        UI.loadingOverlay.classList.remove('hidden');

        const activeCIDs = Object.values(state.selections.audio).filter(Boolean);
        const cidsToLoad = activeCIDs.filter(cid => !state.audioNodes[cid]);

        const loadPromises = cidsToLoad.map(cid => {
            return new Promise(resolve => {
                const urls = getUrls(cid);
                const audio = new Audio();
                audio.crossOrigin = "anonymous";
                audio.loop = true;
                audio.preload = "auto";

                let attempt = 0;
                const onReady = () => {
                    if (audio.duration > state.duration) state.duration = audio.duration;
                    resolve({ cid, audio });
                };

                audio.addEventListener('canplaythrough', onReady, { once: true });
                audio.addEventListener('loadeddata', onReady, { once: true });
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
        const currentNodes = Object.values(state.audioNodes).filter(n => !n.paused);
        if (currentNodes.length > 0) syncTime = currentNodes[0].currentTime;

        newNodes.forEach(res => {
            if (res && res.audio) {
                state.audioNodes[res.cid] = res.audio;
                if (state.isPlaying) {
                    res.audio.currentTime = syncTime;
                    res.audio.play().catch(e => console.warn(e));
                }
            }
        });

        Object.keys(state.audioNodes).forEach(cid => {
            if (!activeCIDs.includes(cid)) {
                state.audioNodes[cid].pause();
                state.audioNodes[cid].removeAttribute('src');
                delete state.audioNodes[cid];
            }
        });

        UI.totalTimeEl.textContent = formatTime(state.duration);
        UI.loadingOverlay.classList.add('hidden');
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
                node.playbackRate = master.playbackRate - (drift * 0.5);
            } else {
                node.playbackRate = master.playbackRate;
            }
        });
    }

    function togglePlay() {
        if (state.isPlaying) {
            Object.values(state.audioNodes).forEach(n => n.pause());
            state.isPlaying = false;
            document.body.classList.remove('playing');
            UI.iconPlay.classList.remove('hidden');
            UI.iconPause.classList.add('hidden');
            clearInterval(state.syncInterval);
        } else {
            Object.values(state.audioNodes).forEach(n => {
                const p = n.play();
                if (p !== undefined) p.catch(e => console.warn("Audio unlock required", e));
            });
            state.isPlaying = true;
            document.body.classList.add('playing');
            UI.iconPlay.classList.add('hidden');
            UI.iconPause.classList.remove('hidden');
            state.syncInterval = setInterval(enforceSync, 1000);
            requestAnimationFrame(updateLoop);
        }
    }

    function stopAudio() {
        Object.values(state.audioNodes).forEach(n => {
            n.pause();
            n.currentTime = 0;
        });
        state.isPlaying = false;
        document.body.classList.remove('playing');
        UI.iconPlay.classList.remove('hidden');
        UI.iconPause.classList.add('hidden');
        UI.progressFill.style.width = '0%';
        UI.currentTimeEl.textContent = '0:00';
        clearInterval(state.syncInterval);
        cancelAnimationFrame(animationFrameId);
    }

    function updateLoop() {
        if (!state.isPlaying) return;
        const nodes = Object.values(state.audioNodes);
        if (nodes.length > 0 && state.duration > 0) {
            const current = nodes[0].currentTime;
            UI.progressFill.style.width = `${(current / state.duration) * 100}%`;
            UI.currentTimeEl.textContent = formatTime(current);
        }
        animationFrameId = requestAnimationFrame(updateLoop);
    }

    UI.progressBar.addEventListener('click', (e) => {
        if (state.duration === 0) return;
        const rect = UI.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * state.duration;

        Object.values(state.audioNodes).forEach(n => n.currentTime = newTime);
        UI.progressFill.style.width = `${percent * 100}%`;
        UI.currentTimeEl.textContent = formatTime(newTime);
    });

    async function handleChange() {
        UI.controls.querySelectorAll('select').forEach(select => {
            const data = JSON.parse(select.value);
            state.selections.visuals[select.dataset.id] = data.visual;
            state.selections.audio[select.dataset.id] = data.audio;
        });
        updateTags();
        loadImagesSafely();
        await loadAudio();
    }

    async function randomize() {
        UI.controls.querySelectorAll('select').forEach(select => {
            select.selectedIndex = Math.floor(Math.random() * select.options.length);
        });
        await handleChange();
    }

    async function init() {
        ARTISTS_LIST.forEach(artist => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = artist;
            UI.artistsContainer.appendChild(span);
        });

        try {
            state.metadata = await fetchJSON();
            const visuals = (state.metadata.layout?.layers || []).slice(0, 10);
            const audios = (state.metadata['audio-layout']?.layers || []).slice(0, 10);

            visuals.forEach((layer, i) => {
                if (layer.states?.options?.length > 0) {
                    const layerId = layer.id;
                    const div = document.createElement('div');
                    div.className = 'dropdown-group';
                    
                    const label = document.createElement('label');
                    label.textContent = layer.name || layerId.replace(/[_-]/g, ' ');

                    const select = document.createElement('select');
                    select.dataset.id = layerId;

                    layer.states.options.forEach((opt, idx) => {
                        const option = document.createElement('option');
                        const audioCid = audios[i]?.states?.options?.[idx]?.uri || "";
                        option.value = JSON.stringify({ visual: opt.uri, audio: audioCid });
                        option.textContent = extractRealName(opt, idx);
                        select.appendChild(option);
                    });

                    select.addEventListener('change', handleChange);
                    div.appendChild(label);
                    div.appendChild(select);
                    UI.controls.appendChild(div);
                }
            });

            await randomize();

        } catch (e) { console.error("Failed to init", e); }
    }

    UI.enterBtn.addEventListener('click', () => {
        UI.gatewayPage.classList.remove('active');
        setTimeout(() => {
            UI.gatewayPage.classList.add('hidden');
            UI.playerPage.classList.remove('hidden');
            // Force Safari repaint 
            void UI.playerPage.offsetWidth; 
            UI.playerPage.classList.add('active');
        }, 800);
    });

    UI.playPauseBtn.addEventListener('click', togglePlay);
    UI.stopBtn.addEventListener('click', stopAudio);
    UI.mixBtn.addEventListener('click', randomize);

    init();
})();

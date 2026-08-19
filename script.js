(async function () {
    const USE_LOCAL_GITHUB_FILES = false; 
    const GITHUB_BASE_URL = "./"; 

    // Reordered for optimal public speed
    const IPFS_GATEWAYS = [
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/',
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.io/ipfs/'
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

    // --- ZERO-FETCH INIT: HARDCODED MASTER METADATA ---
    const PANN_METADATA = {
        "name": "பண் (Pann)",
        "layout": {
            "layers": [
                { "id": "Strings", "states": { "options": [{ "uri": "QmbmRmMToTbS6NQRC2BNEjVHHp9P6yNRJGzwD62QnqFP7Y", "label": "Bright" }, { "uri": "QmWCWvSsBMiSdwg2ULf63ckgN8GaXWju4nZAJ6PRcmAgfo", "label": "Dark" }, { "uri": "QmZqBpUgr1yS3s8C4K36amxXMBBvMiTegV8JhA2zvq5vmT", "label": "Ambient" }] } },
                { "id": "Winds", "states": { "options": [{ "uri": "Qmb3CLHtFbbQbpiZ5jebxjVPbv5bC6UFnezpqrpApSKmAL", "label": "Bamboo Flute" }, { "uri": "QmUiB45C58Q8mqHpXEt9KGbkvQscdcMqdrZCbM1NLwYpwV", "label": "Penny Whistle" }, { "uri": "QmUmJSCgCuXkJ9tJwLpExf4SxvnZNLySJ6ujSGwxTJ3Dmv", "label": "Melodica" }, { "uri": "QmdyJk4e1NAP3bWTXahE1EDykDbFsRjHc9xW2RVthxUULT", "label": "Nadaswaram" }] } },
                { "id": "Ambience", "states": { "options": [{ "uri": "QmXzwiB3BK5wUfpTtYQ4RfC9Dw2i1VDsLVnyYSXPnfg3xt", "label": "Kurinji" }, { "uri": "QmW6vRQFSSqLDmWUxXgoRuU1siZEMDcoxzj8BKZ12kZGSa", "label": "Mullai" }, { "uri": "QmQNLJ9L3RmXzL5RwQR3KYaJbZ2Fz1RLZZJaicNzf5kiMJ", "label": "Marutham" }, { "uri": "QmVhTuuS9rNBNrAEVmcXfXchUGW6ZaBME91cwwGzBwDFyp", "label": "Neidhal" }, { "uri": "Qme6JxTt7odkQK1gDFUZaL6URTgUbHMo9GKEgKqbnKD2eM", "label": "Paalai" }] } },
                { "id": "Rhythm", "states": { "options": [{ "uri": "QmaKqFEEQ2C4ygmHQAHFoN1aTH1t55Hofh5hZtCSkq99WF", "label": "Mridangam & Latin" }, { "uri": "QmNRLwMo4cCeLAp298me2WrPidGvsHubrbvrjuQjoqHkxq", "label": "Acoustic Drums" }, { "uri": "QmNWupbdybDgGHoqd6St2nBYijVF73vtTHwssWFGRssCtk", "label": "Folk" }] } },
                { "id": "Traditional", "states": { "options": [{ "uri": "QmU19EK7gmy4wo8zaCZyfbabWrkxEgj15LowkZZszAJk7Y", "label": "Sarangi" }, { "uri": "QmStrZzJ33o8eF4XpQVXAvstrFcV1pzuKNof7wRj7gKE7f", "label": "Veena" }, { "uri": "QmZR9UZaMniXqB5REKiK4yDJbuAKTQtmoWtwQTKKKHDcp3", "label": "Slide Guitar - Live" }] } },
                { "id": "Voices", "states": { "options": [{ "uri": "Qmadsy39UVhtsR9V5TUTqFpLpZLWfRvTUBApMdwQv7xyTq", "label": "Solo" }, { "uri": "QmQTxQauxBL9qbj6XbLT9zsmEhsZr6Zf6RgDhVpEEM3RCj", "label": "Folk voice" }, { "uri": "QmSnk8wDVUiBH5RBFoF2T3JZsnr4Z8Yp5Pp5ds1GGMNEwj", "label": "Choir" }] } },
                { "id": "Guitars", "states": { "options": [{ "uri": "QmaJSSmhtY5tjx1eQPR5d4ZCdCiMxevzHAhsqwUE9z3FbS", "label": "Acoustic" }, { "uri": "QmWYuyydDJFNYsBkWgMjHMRCANmencFgTTPBFAGzwKpqi8", "label": "Electric" }] } },
                { "id": "Keys", "states": { "options": [{ "uri": "Qme2Ykbfp8YaFq6A3U1BciXafZW6wsHPAuDhSfCWAiETUC", "label": "Piano" }, { "uri": "QmQYQGA3Voq8xR8y1qEe3fR5HucuZZ7TBG4wkBKG8Lcr56", "label": "Mallet - Live" }] } },
                { "id": "Electronic", "states": { "options": [{ "uri": "QmSfv4ZcHqjS38zWErJaZfZMBKCCYxamXqkeih4GNVuaTu", "label": "Synth & Bass" }, { "uri": "QmW6SuYciNzd7CigdKArqnrZ4Q9By3LXsK65ftwUuRhFn5", "label": "Modular" }, { "uri": "QmVBpVcrBqJqoKGCHzLBUiynkFyRXJHiG38oKsJgGPB3QL", "label": "Live reactive layer" }] } }
            ]
        },
        "audio-layout": {
            "layers": [
                { "id": "01_Strings", "states": { "options": [{ "uri": "QmUzMyhSm2HYYexMbZp5BjRJ5wqPTCRvKvDiU8udL5AHPM" }, { "uri": "QmXdM8k6Wje2BwHrigWUmcHAYQar9BfCkQcTMdPtqajWrN" }, { "uri": "QmTLcwbXoXgU2jWjqP7hBFFFtmEJiD22Y7bUw7uSem7UKp" }] } },
                { "id": "02_Winds", "states": { "options": [{ "uri": "Qmc8t887PbT2poBxdXsfEqxUec673aiiREJRg9fnLxJTk7" }, { "uri": "QmWfK4k67yi3aPtJ74vo4tyg7zuxGUxEzLTsTEdLUtZbnK" }, { "uri": "QmUe5QD12QpMeHRMj924d1KQTXcTAPZ31QXZZc4iYxGdsc" }, { "uri": "QmRPpPzNQunUHGR5gtHi6Gjd8zb969yQcMHZNpHJ5ihePj" }] } },
                { "id": "03_Ambience", "states": { "options": [{ "uri": "QmfKFKHX8ptEwR7PECjPsofmkqT8hh3xueb3Hq27hGoVGj" }, { "uri": "QmbYZBUaeT6Ei25Xr9eRXtevLBtqQWEb8eEXJaUU71V9pW" }, { "uri": "QmXnHWdEnCxrgf2V3FBmSW8iaD1yBLcA4zt5ftzAshBJMy" }, { "uri": "QmX9Vpgka1FXq2HjzUhvuT7fNRgLtspdWVWfXd5fdpgymx" }, { "uri": "QmeMzFuXRU6UGkCHMv5hmYuoyZHxgGPCAuU8uBBuzNc6gL" }] } },
                { "id": "04_Rhythm", "states": { "options": [{ "uri": "Qmd7tYFcQ2wfTi1agT8JkannB1VP8dSRypzAdY7ksvnim6" }, { "uri": "QmdwD8ix4qJmRB4SaEBuC8XV19UZR24j7fzmV8jiKBqtDG" }, { "uri": "QmV3ifuMB86MKe1GcPsZrRnSpuBkCkPfLJacqTvDD5gXPE" }] } },
                { "id": "05_Traditional", "states": { "options": [{ "uri": "QmRaVXfrm6kvhifNcAaCnbVFYdUY3RfbGTe68qnKhrD5tf" }, { "uri": "QmTvvHMtJdH9BsNeC7Fj3K2ZyoPKFCLo7hAHtu2Ke5VzTu" }, { "uri": "QmPGjwNkL7EncSw8oaemu74P4FArV9SFTvbL8jDNq63V9W" }] } },
                { "id": "06_Voices", "states": { "options": [{ "uri": "QmVqTxhTDSxQXrgAdsjSeUjJWzKXThcWDj4RdBscFhP2X8" }, { "uri": "QmP9pF8S6N4R2o3XXHoBEYxty1eGeQC35TyaMkcarFnEWL" }, { "uri": "QmUbc8aDcn7ex9ZUhNVWPCMNPkCTnfp3Vcut98ZYFw72At" }] } },
                { "id": "07_Guitars", "states": { "options": [{ "uri": "QmXtU8d6oAziz9gSZMGcTaZJhKngaGxApohpsBVK2QVxpN" }, { "uri": "QmcELdRFmMLXHUcwrdZE59Y2PdcbhBwK7oSESsLziTuECY" }] } },
                { "id": "08_Keys", "states": { "options": [{ "uri": "QmSr6Qi78jdTPnq3zc7agYiJGT8pu1rnxUN1n5eFZYV1EQ" }, { "uri": "QmbD4gogjdncWrErqeWuJF8JXDnBthBiNZhU7rpYTAU4QR" }] } },
                { "id": "09_Electronic", "states": { "options": [{ "uri": "QmQRf8iNjrcN9gF7A6UVpuHss79owBMRRBs28EMSHKNzxz" }, { "uri": "QmeDjc6Ln2ZPWeHa1aDoNCoMsBRvzSkrdhowaLcMN3wkq9" }, { "uri": "QmR6K8HUsXT185jScgpNUTzYBSorxPoW4oCBZVh9nqbgrk" }] } }
            ]
        }
    };

    const state = {
        metadata: null,
        audioPool: {}, 
        visualSlots: {}, 
        selections: { visuals: {}, audio: {} },
        isPlaying: false,
        duration: 0,
        syncInterval: null,
        isSeeking: false
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

    // ============================================================================
    // ROBUST STAGGERED AUDIO ENGINE
    // ============================================================================

    class IPFSAudioLoader {
        static async loadWithFailover(audioNode, cid) {
            audioNode.crossOrigin = "anonymous";
            audioNode.preload = "auto";
            audioNode.volume = 0;

            const urls = getUrls(cid);
            if (urls.length === 0) return Promise.resolve(null);

            // Skip network requests if this specific file is already locked in
            if (audioNode.src && urls.some(u => audioNode.src.includes(u.split('/').pop()))) {
                return Promise.resolve(audioNode);
            }

            return new Promise((resolve) => {
                let currentGatewayIndex = 0;

                const attemptLoad = () => {
                    if (currentGatewayIndex >= urls.length) {
                        console.warn(`[AudioEngine] All gateways failed for CID: ${cid}`);
                        return resolve(null); // Resolve cleanly so Promise.all doesn't crash the stack
                    }

                    audioNode.src = urls[currentGatewayIndex];
                    audioNode.load();

                    const onCanPlay = () => {
                        cleanup();
                        if (audioNode.duration > state.duration) state.duration = audioNode.duration;
                        resolve(audioNode);
                    };

                    const onError = () => {
                        currentGatewayIndex++;
                        cleanup();
                        attemptLoad(); // Rotate to next gateway
                    };

                    // Prevent MaxListenersExceededWarning memory leaks
                    const cleanup = () => {
                        audioNode.removeEventListener('canplaythrough', onCanPlay);
                        audioNode.removeEventListener('loadeddata', onCanPlay);
                        audioNode.removeEventListener('error', onError);
                    };

                    audioNode.addEventListener('canplaythrough', onCanPlay, { once: true });
                    audioNode.addEventListener('loadeddata', onCanPlay, { once: true });
                    audioNode.addEventListener('error', onError);
                };

                attemptLoad();
            });
        }

        static async loadAllStaggered(tracks, delayMs = 150) {
            const promises = tracks.map((track, index) => {
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        try {
                            const loadPromise = this.loadWithFailover(track.audioNode, track.cid);
                            // Soft-Sync 8-second limit per track. If IPFS hangs, we skip it.
                            const timeoutPromise = new Promise(r => setTimeout(() => r(null), 8000));
                            const result = await Promise.race([loadPromise, timeoutPromise]);
                            resolve({ success: !!result, layerId: track.layerId });
                        } catch (err) {
                            resolve({ success: false, layerId: track.layerId });
                        }
                    }, index * delayMs); // The magic stagger that fixes ERR_NAME_NOT_RESOLVED
                });
            });
            return Promise.all(promises);
        }
    }

    async function loadAudioStreams() {
        UI.loadingOverlay.classList.remove('hidden');
        if (UI.loadingText) UI.loadingText.textContent = "Connecting Layers...";
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = true;

        const tracksToLoad = [];
        
        Object.keys(state.selections.audio).forEach(layerId => {
            const cid = state.selections.audio[layerId];
            const audioNode = state.audioPool[layerId]; 
            
            if (cid && audioNode) {
                tracksToLoad.push({ layerId, cid, audioNode });
            }
        });

        // 1. Fetch tracks safely using the Staggered Engine
        await IPFSAudioLoader.loadAllStaggered(tracksToLoad, 150);

        // 2. Synchronize play state
        let syncTime = 0;
        const currentActiveNodes = Object.values(state.audioPool).filter(n => !n.paused && n.volume > 0 && n.readyState >= 3);
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
                if (state.selections.audio[layerId] && state.audioPool[layerId].readyState >= 3) {
                    state.audioPool[layerId].volume = 1;
                }
            });
        }

        if (UI.totalTimeEl) UI.totalTimeEl.textContent = formatTime(state.duration);
        if (UI.playPauseBtn) UI.playPauseBtn.disabled = false;
        UI.loadingOverlay.classList.add('hidden');
    }

    // ============================================================================
    // PLAYER CONTROLS & SYNC
    // ============================================================================

    function enforceSync() {
        if (state.isSeeking) return;

        // Filter ensures we only sync tracks that have successfully loaded
        const nodes = Object.values(state.audioPool).filter(n => !n.paused && n.src && n.readyState >= 3);
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
            if (p !== undefined) { p.catch(err => console.warn("Browser blocked play", err)); }
        });

        state.isPlaying = true;
        document.body.classList.add('playing'); 
        if (UI.iconPlay) UI.iconPlay.classList.add('hidden');
        if (UI.iconPause) UI.iconPause.classList.remove('hidden');
        renderTags();

        setTimeout(() => {
            enforceSync();
            nodes.forEach(node => { if(node.readyState >= 3) node.volume = 1; });
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
            if(node.readyState >= 3) node.volume = 1; 
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

    // ============================================================================
    // VISUALS & INIT
    // ============================================================================

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
        
        try {
            state.metadata = PANN_METADATA;
            
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
                    if (UI.playerBg) UI.playerBg.appendChild(slot);
                } else {
                    if (UI.layerContainer) UI.layerContainer.appendChild(slot);
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
            console.error("Failed to initialize metadata and layers", e);
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

// MiraBox Mac Shortcuts property inspector. No remote scripts are required.
let websocket = null;
let uuid = null;
let actionInfo = null;
let settings = {};
let mappedDataFromBackend = {};
let shortcutsFolder = ['All'];
let listOfCuts = [];
let usersSelectedShortcut = '';
let selectedFolder = 'All';
let isForcedTitle = false;
let globalTranslations = {};
let catalogReady = false;
let awaitingCatalog = false;
let loadingTimer = null;
let refreshTimer = null;
let hasHostSettings = false;
let connectionArgs = null;

function parseJSONSafely(value, fallback) {
    if (typeof value !== 'string') return value === undefined ? fallback : value;
    try { return JSON.parse(value); } catch (_) { return fallback; }
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function showStatus(message, error) {
    const status = document.getElementById('load_status');
    status.textContent = message;
    status.style.color = error ? '#ffb4ab' : '#b8b8b8';
    status.hidden = !message;
}

function setPlaceholder(id, text) {
    const select = document.getElementById(id);
    select.replaceChildren(new Option(text, ''));
    select.disabled = true;
}

function stopTimers() {
    clearTimeout(loadingTimer);
    clearTimeout(refreshTimer);
}

function showFailure(message) {
    stopTimers();
    awaitingCatalog = false;
    if (!catalogReady) {
        setPlaceholder('shortcuts_folder_list', 'Unavailable');
        setPlaceholder('shortcut_list', 'Unavailable');
    }
    showStatus(message, true);
    document.getElementById('retry_load').disabled = false;
}

function sendEvent(event, payload) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return false;
    const message = { event, context: uuid };
    if (payload !== undefined) message.payload = payload;
    if (event === 'sendToPlugin') message.action = actionInfo.action;
    websocket.send(JSON.stringify(message));
    return true;
}

function sendToPlugin(payload) { return sendEvent('sendToPlugin', payload); }

function requestSettings() {
    stopTimers();
    awaitingCatalog = true;
    document.getElementById('retry_load').disabled = true;
    showStatus('Loading your shortcuts…', false);
    if (!catalogReady) {
        setPlaceholder('shortcuts_folder_list', 'Loading…');
        setPlaceholder('shortcut_list', 'Loading…');
    }
    sendEvent('getSettings');
    sendToPlugin({ type: 'requestSettings' });
    // The old executable can miss propertyInspectorDidAppear on reopening.
    // Republish the unchanged host settings once to trigger its
    // didReceiveSettings handler, which fetches and returns the catalog.
    refreshTimer = setTimeout(function () {
        if (awaitingCatalog && hasHostSettings) sendEvent('setSettings', settings);
    }, 1500);
    loadingTimer = setTimeout(function () {
        showFailure('The Shortcuts helper did not respond. Open Apple Shortcuts, then click Retry. If this continues, quit and reopen Stream Dock.');
    }, 20000);
}

function retryLoad() {
    if (websocket && websocket.readyState === WebSocket.OPEN) requestSettings();
    else if (connectionArgs) connectElgatoStreamDeckSocket.apply(null, connectionArgs);
}

function readSavedSettings(saved) {
    if (!isRecord(saved)) return;
    settings = { ...saved };
    hasHostSettings = true;
    if (typeof saved.shortcutName === 'string') usersSelectedShortcut = saved.shortcutName;
    if (typeof saved.shortcutFolder === 'string') selectedFolder = saved.shortcutFolder;
    if (saved.isForcedTitle !== undefined) isForcedTitle = parseJSONSafely(saved.isForcedTitle, false) === true;
    setForcedTitleState();
}

function handleBackendResponse(payload) {
    payload = parseJSONSafely(payload, null);
    if (!isRecord(payload)) { showFailure('The Shortcuts helper returned an invalid response. Click Retry.'); return; }
    if (payload.error) { showFailure(String(payload.error)); return; }
    const mapping = parseJSONSafely(payload.mappedDataFromBackend, null);
    // Settings-only replies are valid but are not a loaded shortcut library.
    if (!isRecord(mapping) || Object.values(mapping).some(folder => typeof folder !== 'string')) return;
    mappedDataFromBackend = mapping;
    const folders = parseJSONSafely(payload.shortcutsFolder, []);
    shortcutsFolder = [...new Set(['All', ...(Array.isArray(folders) ? folders.filter(f => typeof f === 'string') : []), ...Object.values(mapping)])];
    if (typeof payload.shortcutName === 'string') usersSelectedShortcut = payload.shortcutName;
    if (payload.isForcedTitle !== undefined) isForcedTitle = parseJSONSafely(payload.isForcedTitle, false) === true;
    if (!shortcutsFolder.includes(selectedFolder)) selectedFolder = 'All';
    catalogReady = true;
    awaitingCatalog = false;
    stopTimers();
    refreshListOfShortcutsFolders();
    filterMapped(selectedFolder);
    setForcedTitleState();
    document.getElementById('retry_load').disabled = false;
    if (!Object.keys(mapping).length) showStatus('No shortcuts found. Create one in Apple Shortcuts, then click Retry.', false);
    else if (usersSelectedShortcut && !Object.prototype.hasOwnProperty.call(mapping, usersSelectedShortcut)) showStatus('The saved shortcut is no longer available. Choose a shortcut to update this button.', true);
    else showStatus('', false);
}

async function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo, inActionInfo) {
    connectionArgs = [inPort, inPluginUUID, inRegisterEvent, inInfo, inActionInfo];
    stopTimers();
    if (websocket) { websocket.onclose = null; websocket.close(); }
    document.getElementById('mainWrapper').classList.remove('hidden');
    uuid = inPluginUUID;
    actionInfo = parseJSONSafely(inActionInfo, null);
    if (!isRecord(actionInfo) || typeof actionInfo.action !== 'string') {
        showFailure('Stream Dock supplied invalid button information. Remove and add this action again.');
        return;
    }
    readSavedSettings(actionInfo.payload && actionInfo.payload.settings);
    const socket = new WebSocket('ws://127.0.0.1:' + inPort);
    websocket = socket;
    loadingTimer = setTimeout(() => showFailure('Could not connect to Stream Dock. Click Retry or restart Stream Dock.'), 10000);
    socket.onopen = function () {
        if (socket !== websocket) return;
        socket.send(JSON.stringify({ event: inRegisterEvent, uuid: inPluginUUID }));
        requestSettings();
    };
    socket.onmessage = function (evt) {
        if (socket !== websocket) return;
        let message;
        try { message = JSON.parse(evt.data); } catch (_) { showFailure('Stream Dock returned an unreadable response. Click Retry.'); return; }
        if (message.event === 'sendToPropertyInspector') handleBackendResponse(message.payload);
        else if (message.event === 'didReceiveSettings') {
            const saved = message.payload && message.payload.settings;
            readSavedSettings(saved);
            // Some MiraBox versions return the plugin's catalog in settings.
            if (isRecord(saved) && saved.mappedDataFromBackend !== undefined) handleBackendResponse(saved);
            else if (catalogReady) { refreshListOfShortcutsFolders(); filterMapped(selectedFolder); }
        }
    };
    socket.onerror = function () { if (socket === websocket) showFailure('Could not connect to Stream Dock. Click Retry.'); };
    socket.onclose = function () { if (socket === websocket) showFailure('Stream Dock disconnected. Click Retry to reconnect.'); };
    const app = parseJSONSafely(inInfo, {});
    const language = app.application && app.application.language || 'en';
    loadTranslations(language);
}

function refreshListOfShortcutsFolders() {
    if (!catalogReady) return;
    const select = document.getElementById('shortcuts_folder_list');
    // Always rebuild: renamed folders can have the same count as before.
    select.replaceChildren(...shortcutsFolder.map(folder => new Option(folder, folder)));
    select.value = selectedFolder;
    select.disabled = false;
}

function filterMapped(folder) {
    if (!catalogReady) return;
    selectedFolder = shortcutsFolder.includes(folder) ? folder : 'All';
    listOfCuts = Object.keys(mappedDataFromBackend)
        .filter(name => selectedFolder === 'All' || mappedDataFromBackend[name] === selectedFolder)
        .sort((a, b) => a.localeCompare(b));
    document.getElementById('shortcuts_folder_list').value = selectedFolder;
    refreshListOfShortcuts();
}

function refreshListOfShortcuts() {
    if (!catalogReady) return;
    const select = document.getElementById('shortcut_list');
    select.replaceChildren(new Option(listOfCuts.length ? 'Choose a shortcut…' : 'No shortcuts in this folder', ''), ...listOfCuts.map(name => new Option(name, name)));
    select.value = listOfCuts.includes(usersSelectedShortcut) ? usersSelectedShortcut : '';
    select.disabled = !listOfCuts.length;
}

function updateSettings() {
    if (!uuid || !catalogReady) return;
    const payload = {
        ...settings,
        type: 'updateSettings',
        shortcutName: usersSelectedShortcut,
        shortcutFolder: selectedFolder,
        isForcedTitle: String(isForcedTitle),
        sayvoice: 'Alex', isSayvoice: 'false', sayHoldTime: '0'
    };
    // Catalog data is a reply, not configuration. Do not store a stale copy.
    for (const key of ['mappedDataFromBackend', 'shortcuts', 'shortcutsFolder', 'voices']) delete payload[key];
    settings = payload;
    sendEvent('setSettings', payload);
    sendToPlugin(payload);
}

function selectedNewIndex(_index, type) {
    if (!catalogReady) return;
    if (type === 'shortcutFolder') {
        filterMapped(document.getElementById('shortcuts_folder_list').value);
        // Browsing folders must never silently assign the first shortcut.
        return;
    }
    const selection = document.getElementById('shortcut_list').value;
    if (!selection || !Object.prototype.hasOwnProperty.call(mappedDataFromBackend, selection)) return;
    usersSelectedShortcut = selection;
    showStatus('', false);
    updateSettings();
}

function setForcedTitleState() {
    document.getElementById('forced_title_checkbox').textContent = isForcedTitle ? (globalTranslations.ON || 'ON') : (globalTranslations.OFF || 'OFF');
}

function changeForcedTitle() {
    // The legacy backend cannot safely save an action without a shortcut.
    if (!catalogReady || !usersSelectedShortcut || !Object.prototype.hasOwnProperty.call(mappedDataFromBackend, usersSelectedShortcut)) return;
    isForcedTitle = !isForcedTitle;
    setForcedTitleState();
    updateSettings();
}

function readTranslations(language) {
    return new Promise(resolve => {
        const request = new XMLHttpRequest();
        request.open('GET', '../' + language + '.json');
        request.timeout = 2000;
        request.onload = function () {
            const parsed = parseJSONSafely(request.responseText, null);
            resolve((request.status === 200 || request.status === 0) && parsed && isRecord(parsed.Localization) ? parsed.Localization : null);
        };
        request.onerror = request.ontimeout = function () { resolve(null); };
        request.send();
    });
}

async function loadTranslations(language) {
    try {
        language = /^[a-z]{2}(?:[_-][A-Za-z]{2})?$/.test(language) ? language : 'en';
        globalTranslations = await readTranslations(language) || await readTranslations('en') || {};
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const translated = globalTranslations[element.dataset.i18n];
            if (translated) element.textContent = translated;
        });
        setForcedTitleState();
    } catch (_) { /* Translation failures do not stop the shortcut picker. */ }
}

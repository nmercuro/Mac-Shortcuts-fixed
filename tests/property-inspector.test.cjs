const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const plugin = path.join(__dirname, '..', 'com.orumad.streamdock.macshortcuts.sdPlugin');
const source = fs.readFileSync(process.env.BASELINE_PI_PATH || path.join(plugin, 'pi/main_pi.js'), 'utf8');

// Minimal browser/host boundary: the plugin's production script and event
// handlers run unchanged. No Shortcuts catalog or system commands are executed.
function setup(saved = {}) {
    class Option {
        constructor(text = '', value = '') { this.text = text; this.value = value; }
    }
    class Element {
        constructor() { this.children = []; this.style = {}; this.hidden = false; this.disabled = false; this.textContent = ''; this._value = ''; this.classList = { remove() {} }; }
        replaceChildren(...items) { this.children = items; this._value = items[0]?.value || ''; }
        appendChild(item) { this.children.push(item); if (this.children.length === 1) this._value = item.value; }
        get length() { return this.children.length; }
        set length(n) { this.children.length = n; if (!n) this._value = ''; }
        get value() { return this._value; }
        set value(v) { this._value = this.children.some(o => o.value === v) ? v : ''; }
        get selectedIndex() { return this.children.findIndex(o => o.value === this.value); }
        querySelectorAll() { return []; }
    }
    const elements = Object.fromEntries(['mainWrapper', 'PI_Shortcuts', 'isFolder', 'load_status', 'retry_load', 'forced_title_checkbox', 'shortcuts_folder_list', 'shortcut_list'].map(id => [id, new Element()]));
    for (const id of ['shortcuts_folder_list', 'shortcut_list']) elements[id].replaceChildren(new Option('Loading...', 'rigatoni'));
    const sent = [], sockets = [], timers = new Map();
    let nextTimer = 0;
    class WebSocket {
        static OPEN = 1;
        constructor() { this.readyState = 0; sockets.push(this); }
        send(message) { sent.push(JSON.parse(message)); }
        close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
        open() { this.readyState = 1; this.onopen(); }
        receive(message) { this.onmessage({ data: JSON.stringify(message) }); }
    }
    class XMLHttpRequest {
        open() {}
        send() { this.status = 200; this.readyState = 4; this.responseText = '{"Localization":{}}'; queueMicrotask(() => { this.onload?.(); this.onreadystatechange?.(); }); }
    }
    const box = { WebSocket, XMLHttpRequest, Option, console, NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1 },
        document: { getElementById: id => elements[id], createElement: () => new Option(),
            querySelectorAll: () => [], createTreeWalker: () => ({ nextNode: () => false }) },
        setTimeout: (fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
        clearTimeout: id => timers.delete(id)
    };
    vm.createContext(box);
    vm.runInContext(source, box);
    box.connectElgatoStreamDeckSocket('12345', 'pi-uuid', 'registerPropertyInspector',
        JSON.stringify({ application: { language: 'en' } }),
        JSON.stringify({ action: 'com.orumad.streamdock.mac-shortcuts.launch-shortcut', context: 'button-context', payload: { settings: saved } }));
    sockets[0].open();
    return { box, elements, sent, sockets,
        options: id => elements[id].children.map(o => o.value),
        emit: (event, payload) => sockets.at(-1).receive({ event, payload }),
        tick: ms => { for (const [id, timer] of [...timers].sort((a, b) => a[1].ms - b[1].ms)) if (timer.ms <= ms && timers.has(id)) { timers.delete(id); timer.fn(); } },
        select: (id, value, type) => { elements[id].value = value; box.selectedNewIndex(elements[id].selectedIndex, type); }
    };
}
const catalog = {
    shortcutName: 'Office On',
    shortcutsFolder: JSON.stringify(['All', 'Office', 'Evening']),
    mappedDataFromBackend: JSON.stringify({ 'Office On': 'Office', 'Office Off': 'Office', 'dim café “night”': 'Evening' }),
    isForcedTitle: 'false'
};

test('MiraBox settings reply populates folders and shortcuts', () => {
    const p = setup({ shortcutName: 'Office On' });
    p.emit('didReceiveSettings', { settings: catalog });
    assert.deepEqual(p.options('shortcuts_folder_list'), ['All', 'Office', 'Evening']);
    assert.equal(p.elements.shortcut_list.value, 'Office On');
    assert.equal(p.elements.load_status.hidden, true);
});

test('backend replies load and preserve exact Unicode shortcut names', () => {
    const p = setup();
    p.emit('sendToPropertyInspector', catalog);
    p.select('shortcut_list', 'dim café “night”', 'shortcut');
    const update = p.sent.filter(m => m.event === 'setSettings').at(-1);
    assert.equal(update.context, 'pi-uuid');
    assert.equal(update.payload.shortcutName, 'dim café “night”');
    assert.equal(p.elements.shortcut_list.children.find(o => o.value === 'dim café “night”').text, 'dim café “night”');
});

test('browsing a different folder never changes the assigned shortcut', () => {
    const p = setup({ shortcutName: 'Office On' });
    p.emit('sendToPropertyInspector', catalog);
    p.sent.length = 0;
    p.select('shortcuts_folder_list', 'Evening', 'shortcutFolder');
    assert.equal(p.sent.length, 0);
    assert.equal(p.elements.shortcut_list.value, '');
    p.select('shortcuts_folder_list', 'Office', 'shortcutFolder');
    assert.equal(p.elements.shortcut_list.value, 'Office On');
});

test('folder renames with an unchanged count refresh the picker', () => {
    const p = setup();
    p.emit('sendToPropertyInspector', catalog);
    p.emit('sendToPropertyInspector', { ...catalog,
        shortcutsFolder: ['All', 'Work', 'Evening'],
        mappedDataFromBackend: { 'Office On': 'Work', 'Office Off': 'Work', 'dim café “night”': 'Evening' } });
    assert.deepEqual(p.options('shortcuts_folder_list'), ['All', 'Work', 'Evening']);
});

test('missing backend times out, preserves settings, then recovers on Retry', () => {
    const saved = { shortcutName: 'Office On', custom: 'keep me', isForcedTitle: 'false' };
    const p = setup(saved);
    p.emit('didReceiveSettings', { settings: saved });
    p.tick(20001);
    assert.match(p.elements.load_status.textContent, /did not respond/);
    assert.equal(p.elements.retry_load.disabled, false);
    const writes = p.sent.filter(m => m.event === 'setSettings');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].payload, saved);
    p.box.retryLoad();
    p.emit('sendToPropertyInspector', catalog);
    assert.equal(p.elements.shortcut_list.value, 'Office On');
    p.tick(21000);
    assert.equal(p.elements.load_status.hidden, true);
});

test('empty catalog reports no shortcuts and never invents a selection', () => {
    const p = setup();
    p.emit('sendToPropertyInspector', { mappedDataFromBackend: {}, shortcutsFolder: ['All'] });
    assert.match(p.elements.load_status.textContent, /No shortcuts found/);
    assert.equal(p.elements.shortcut_list.disabled, true);
    p.box.changeForcedTitle();
    assert.equal(p.sent.filter(m => m.event === 'setSettings').length, 0);
});

test('malformed backend data never becomes a fake Default Shortcut', () => {
    const p = setup();
    p.emit('sendToPropertyInspector', { mappedDataFromBackend: 'not JSON' });
    p.tick(20001);
    assert.match(p.elements.load_status.textContent, /did not respond/);
    assert.equal(p.options('shortcut_list').includes('Default Shortcut'), false);
});

test('disconnect reports a problem and Retry reconnects', () => {
    const p = setup();
    p.sockets[0].close();
    assert.match(p.elements.load_status.textContent, /disconnected/);
    p.box.retryLoad();
    p.sockets.at(-1).open();
    p.emit('sendToPropertyInspector', catalog);
    assert.equal(p.elements.shortcut_list.disabled, false);
});

test('settings-only messages cannot replace a live catalog with fabricated data', () => {
    const p = setup();
    p.emit('sendToPropertyInspector', catalog);
    p.emit('sendToPropertyInspector', { type: 'updateSettings', shortcutName: 'Office On' });
    assert.equal(p.options('shortcut_list').includes('Office On'), true);
    assert.equal(p.options('shortcut_list').includes('Default Shortcut'), false);
});

test('JXA normalizer preserves startup data and treats names as data', () => {
    const box = {};
    vm.createContext(box);
    vm.runInContext(fs.readFileSync(path.join(plugin, 'normalize-info.js'), 'utf8'), box);
    const input = { application: { platform: 'macos', language: 'fr', version: '3.8' },
        devices: [{ id: 'actual-device', name: 'a "name" $(touch /tmp/no) `false`', type: 0, size: { rows: 3, columns: 5 } }],
        colors: { highlightColor: '#123456FF' }, extra: 42 };
    const output = JSON.parse(box.run([JSON.stringify(input), 'plugin-id', '27.0']));
    assert.equal(output.application.platform, 'mac');
    assert.equal(output.application.platformVersion, '27.0');
    assert.equal(output.application.version, '3.8');
    assert.equal(output.plugin.uuid, 'plugin-id');
    assert.deepEqual(output.devices, input.devices);
    assert.equal(output.colors.highlightColor, '#123456FF');
    assert.equal(Object.keys(output.colors).length, 5);
    assert.throws(() => box.run(['invalid', 'id', '27.0']));
    assert.throws(() => box.run(['[]', 'id', '27.0']));
});

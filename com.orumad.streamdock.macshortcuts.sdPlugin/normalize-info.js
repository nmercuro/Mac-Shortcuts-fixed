// Uses macOS's built-in JavaScript for Automation. Arguments remain data.
function normalizeInfo(info, pluginUUID, platformVersion) {
    var data = JSON.parse(info);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Stream Dock supplied invalid startup information.');
    }
    var app = data.application || {};
    app.platform = 'mac';
    app.language = app.language || 'en';
    app.platformVersion = app.platformVersion || platformVersion;
    app.version = app.version || '2.9';
    data.application = app;
    data.plugin = data.plugin || {};
    data.plugin.uuid = data.plugin.uuid || pluginUUID;
    data.plugin.version = data.plugin.version || '1.0.1';
    data.devicePixelRatio = data.devicePixelRatio || 1;
    data.devices = Array.isArray(data.devices) ? data.devices : [];
    var defaults = {
        buttonMouseOverBackgroundColor: '#464646FF',
        buttonPressedBackgroundColor: '#303030FF',
        buttonPressedBorderColor: '#646464FF',
        buttonPressedTextColor: '#969696FF',
        highlightColor: '#0078FFFF'
    };
    data.colors = data.colors || {};
    Object.keys(defaults).forEach(function (key) {
        if (!data.colors[key]) data.colors[key] = defaults[key];
    });
    return JSON.stringify(data);
}

function run(argv) {
    if (argv.length !== 3) throw new Error('Expected startup info, plugin UUID, and macOS version.');
    return normalizeInfo(argv[0], argv[1], argv[2]);
}

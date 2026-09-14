# Mac Shortcuts Plugin for Mirabox StreamDock

## Loading repair (1.0.1)

Version 1.0.1 repairs startup and folder/shortcut selection in the original 1.0.0 release. The native `StreamDeck-Shortcuts` executable is unchanged.

- Uses macOS's built-in JavaScript for Automation to prepare launch arguments. Python is no longer required.
- Reads MiraBox settings events, restores the saved shortcut, and requests the live catalog.
- Re-sends unchanged settings once when the legacy backend misses the inspector-open event.
- Replaces indefinite Loading with a timeout message and a Retry / Refresh button.
- Refreshes renamed folders even when their count is unchanged.
- Keeps browsing folders separate from assigning a shortcut, preserving the saved action.
- Preserves Unicode names and reports empty libraries without inventing a default shortcut.

### Install the repair

1. Download and extract the source ZIP from the branch containing version 1.0.1, or clone that branch. The extracted folder must contain `Install-Repair.command` alongside `com.orumad.streamdock.macshortcuts.sdPlugin`. Older repair ZIPs may not include versioned-folder detection.
2. Quit Stream Dock completely.
3. Run `Install-Repair.command`. It locates the existing plugin, stages the repair, and saves the complete original in `~/Library/Application Support/MiraBox-Shortcuts-Backups/`.
4. Reopen Stream Dock and select the shortcut button. Use **Retry / Refresh** if needed.

If Finder cannot run the command file, open Terminal, type `bash ` (with a trailing space), drag `Install-Repair.command` onto the Terminal window, and press Return.

The installer replaces only `StreamDock-Wrapper`, `normalize-info.js`, `manifest.json`, `pi/main_pi.html`, and `pi/main_pi.js`. It preserves the existing native executable, icons, CSS, translations, settings, and Stream Dock profiles. It also restores executable permissions on the launcher and native helper.

The installer checks both `~/Library/Application Support/HotSpot/StreamDock/plugins/` and `~/Library/Application Support/HotSpot/StreamDock/Plugins/`. It recognizes `com.orumad.streamdock.macshortcuts.sdPlugin` and versioned names such as `MacShortcuts-v1.0.0.sdPlugin`. It preserves the installed folder name, including in the backup. If multiple installations exist, it asks you to specify the target.

For a custom location, pass the existing `.sdPlugin` folder as the installer’s first argument. From the extracted source folder, this command targets the versioned installation:

```bash
bash ./Install-Repair.command "$HOME/Library/Application Support/HotSpot/StreamDock/plugins/MacShortcuts-v1.0.0.sdPlugin"
```

To revert, quit Stream Dock and restore the original plugin folder from the backup to its original location.

The installer updates an existing plugin installation. A separately distributed repair-overlay ZIP may omit the native executable; do not use an overlay as a fresh plugin installation. A full source checkout retains the native executable and other unchanged plugin files.

### Validation and limits

`npm test` runs ten focused regression checks against the actual settings-panel JavaScript with simulated DOM and Stream Dock events. These are protocol and state tests, not a full Mac hardware test. The native executable is byte-for-byte unchanged from the original 1.0.0 release.

Automated validation was performed on Linux: ten regression tests, JavaScript and Bash syntax checks, whitespace checks, and installer path-detection checks. A user has since confirmed that pressing a physical MiraBox button launches an assigned shortcut on a Mac. This is a report from one setup, not a compatibility test across macOS and Stream Dock versions.

Further Mac testing should cover startup, folder and shortcut enumeration, renames, reconnect/retry behavior, installation and rollback, and both Intel and Apple Silicon systems. If the helper cannot start, the repair shows an actionable timeout instead of claiming the list loaded. Launcher diagnostics are in `~/Library/Logs/MiraBox-Shortcuts/launcher.log` and do not contain shortcut names.

### Troubleshooting

| Symptom | What to check |
| --- | --- |
| Installer cannot find the plugin | Use the exact installed `.sdPlugin` directory as the installer's argument. Both `plugins` and `Plugins` are checked automatically, including versioned names such as `MacShortcuts-v1.0.0.sdPlugin`. |
| More than one installation is found | Pass the intended plugin directory explicitly. The installer will not choose between separate installations. |
| Folder or shortcut list stays unavailable | Use **Retry / Refresh**, confirm shortcuts exist in Apple Shortcuts, then check the launcher log if loading still fails. |
| A renamed folder or shortcut is missing | Use **Retry / Refresh** and reselect the intended shortcut when its name has changed. Browsing folders alone does not change the assigned action. |
| A button launches a shortcut, but its Home actions fail | Run that shortcut directly in Apple Shortcuts. Its accessory references, permissions, and conditions are separate from the plugin's picker and launcher. |

Each button press runs the assigned shortcut. A shortcut must implement any desired scene-switching or lights-off logic itself. For Home lighting conditions, inspect the individual accessories involved and allow for fractional brightness values instead of relying on rounded percentages shown in Home. Matching brightness alone does not prove that a particular color scene is active.

---


![Plugin Interface](plugin-image.jpg)

A plugin for Mirabox StreamDock that allows you to execute Mac Shortcuts directly from your StreamDock buttons.

> ⚠️ **IMPORTANT**: This plugin is **macOS ONLY**. It will NOT work on Windows systems as it relies on Apple's Shortcuts app which is exclusive to macOS.

> **Based on**: This plugin is based on and inspired by the excellent work of [SENTINELITE's StreamDeck-Shortcuts](https://github.com/SENTINELITE/StreamDeck-Shortcuts) plugin. We've adapted it to work specifically with Mirabox StreamDock devices.

## 🚀 Features

- **Direct execution**: Launch any Mac Shortcut with a single click from your StreamDock
- **Folder navigation**: Organize and navigate through your shortcuts structured in folders
- **Folder filtering**: Find shortcuts within a folder or browse the complete catalog
- **Customizable titles**: Override the title displayed on each button
- **Universal compatibility**: Supports both Intel x86_64 and Apple Silicon ARM64
- **Intuitive interface**: Web Property Inspector with dark theme and responsive design
- **Mirabox compatibility**: Specifically optimized for Mirabox StreamDock devices

## 📋 Requirements

- **macOS**: 12.0 or higher
- **StreamDock Software**: 2.9 or higher (compatible with Stream Deck Software)
- **StreamDock**: Any compatible model

## 🔧 Standard Installation

For an existing installation, use the repair installer described above. For the standard plugin distribution:

1. Visit [https://space.key123.vip](https://space.key123.vip)
2. Download the Mac Shortcuts plugin
3. The plugin will be automatically installed in your StreamDock Software
4. The plugin will appear in the "Shortcuts" category within StreamDock Software

### Manual Installation (for developers)

1. Clone or download this repository
2. Copy the `com.orumad.streamdock.macshortcuts.sdPlugin` folder to:
   ```
   ~/Library/Application Support/HotSpot/StreamDock/Plugins/
   ```
3. Restart StreamDock Software

## 🎯 Usage

1. **Drag** the "Launch Shortcut" action from the "Shortcuts" category to a button on your StreamDock
2. **Configure** the shortcut in the Property Inspector:
   - Select the folder where your shortcut is located
   - Choose the specific shortcut you want to execute
   - Optionally, customize the button title
3. **Press** the button on your StreamDock to execute the shortcut

### Finding and refreshing shortcuts

Choose a folder to filter the shortcut list, or select **All** to browse the complete catalog. Use **Retry / Refresh** after adding or renaming shortcuts. Select a shortcut explicitly to assign it; browsing a folder preserves the existing assignment.

## 🏗️ Architecture

The plugin consists of several components:

- **`StreamDeck-Shortcuts`**: Universal native executable (Intel + Apple Silicon)
- **`StreamDock-Wrapper`**: Bash script that acts as the entry point
- **`pi/main_pi.html`**: Property Inspector web interface
- **`pi/main_pi.js`**: JavaScript logic for configuration
- **`manifest.json`**: Plugin configuration for StreamDock

## 🛠️ Development

### Project Structure

```
Mac-Shortcuts-plugin/
├── com.orumad.streamdock.macshortcuts.sdPlugin/
│   ├── static/                     # Plugin icons
│   ├── pi/                         # Property Inspector
│   │   ├── main_pi.html           # Web interface
│   │   ├── main_pi.js             # JavaScript logic
│   │   └── sdpi.css               # Styles
│   ├── StreamDeck-Shortcuts       # Main executable
│   ├── StreamDock-Wrapper         # Wrapper script
│   ├── normalize-info.js          # macOS startup-information normalizer
│   ├── manifest.json              # Plugin configuration
│   └── userSettings.json          # User settings
├── Install-Repair.command        # Backup and repair installer
├── tests/                        # Simulated regression checks
├── package.json                  # npm test entry point
├── README.md
├── LICENSE.md
└── .gitignore
```

### Running the regression checks

Run `npm test` with a Node.js version that supports `node --test`. The suite has no third-party package dependencies and does not execute the native Mac helper.

### How It Works

1. StreamDock executes `StreamDock-Wrapper` (bash script)
2. The wrapper processes and fixes JSON format for compatibility
3. Executes the `StreamDeck-Shortcuts` binary with corrected parameters
4. The Property Inspector communicates via WebSocket for configuration
5. When the button is pressed, the corresponding Mac Shortcut is executed

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

### Reporting Bugs

If you find a bug, please open an [issue](https://github.com/danielmrdev/Mac-Shortcuts-plugin/issues) with:

- Detailed description of the problem
- Steps to reproduce the bug
- macOS and StreamDock Software versions
- Logs or screenshots if possible

## 💬 Support

- **Discord**: Join our [Discord community](https://discord.gg/PnRT5gcn) for support and discussions
- **GitHub Issues**: For bugs and feature requests
- **Documentation**: Check the project wiki for detailed guides

## 📄 License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.

## ✨ Acknowledgments

- **[SENTINELITE](https://github.com/SENTINELITE)** for the original [StreamDeck-Shortcuts plugin](https://github.com/SENTINELITE/StreamDeck-Shortcuts) that this project is based on
- [Elgato](https://www.elgato.com/) for the Stream Deck SDK that powers the underlying technology
- [Mirabox](https://mirabox.com/) for StreamDock device compatibility
- The Stream Deck developer community
- All contributors who have helped improve this project

## 📊 Project Status

- **Current source version**: 1.0.1
- **Validation**: automated regression checks passed; shortcut launch reported working on one Mac/MiraBox setup. Broader compatibility testing remains outstanding.
- 🔄 **Active development**: New features in development
- 🐛 **Maintenance**: Bug fixes and minor improvements

---

**Like this project?** ⭐ Give it a star on GitHub to support development!

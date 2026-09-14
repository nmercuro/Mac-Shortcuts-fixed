# Changelog

All notable changes to the Mac Shortcuts Plugin for Mirabox StreamDock will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-09-13

### Fixed
- Detect versioned plugin folders such as `MacShortcuts-v1.0.0.sdPlugin` in both `plugins` and `Plugins`; preserve the original folder name in backups.
- Removed the launcher's dependency on Python in favor of built-in macOS JavaScript for Automation.
- Handle MiraBox settings events and recover from a missed property-inspector-open event.
- Add loading timeout, retry, connection errors, and empty-library messages.
- Preserve selected shortcuts while browsing folders; refresh renamed folders.
- Preserve exact shortcut capitalization and Unicode names.

### Added
- Backup installer for an existing 1.0.0 installation.
- Ten regression checks using the production settings-panel script and simulated host events.

### Validation limitation
- The native executable is unchanged. Real macOS launch, shortcut enumeration, and physical StreamDock operation still need verification on the user's Mac.

## [1.0.0] - 2025-07-29

### Added
- **Comprehensive internationalization support** for 10 languages:
  - English (en)
  - Spanish (es)
  - French (fr)
  - German (de)
  - Italian (it)
  - Portuguese (pt)
  - Japanese (ja)
  - Korean (ko)
  - Chinese Simplified (zh_CN)
  - Chinese Traditional (zh_TW)
- **Multi-language Property Inspector** with automatic language detection
- **Localized user interface** elements and tooltips
- **Dynamic language switching** without requiring plugin restart

### Fixed
- **Force Title functionality** fully restored and operational
- **Property Inspector cleanup** - removed unused code and improved performance
- **UI consistency** across different language configurations
- **WebSocket communication** stability improvements

### Changed
- **Enhanced Property Inspector** with cleaner, more intuitive interface
- **Improved code organization** and removed deprecated functions
- **Better error handling** for language detection and fallback scenarios
- **Optimized plugin loading** performance

## [0.3.0] - 2025-07-28

### Fixed
- **Force Title functionality** restored after previous regression
- **Property Inspector cleanup** - removed obsolete code and improved maintainability
- **UI rendering issues** in configuration panel

### Changed
- **Code cleanup** - removed unused functions and variables
- **Improved documentation** in source code

## [0.2.0] - 2025-07-27

### Added
- **Mirabox StreamDock compatibility** - full adaptation from Stream Deck SDK
- **JSON format compatibility layer** in StreamDock-Wrapper
- **Universal binary support** for both Intel x86_64 and Apple Silicon ARM64
- **Platform field conversion** (macos → mac) for StreamDock compatibility
- **Enhanced error handling** for cross-platform compatibility issues

### Changed
- **Updated plugin architecture** to work with Mirabox StreamDock devices
- **Modified wrapper script** to handle JSON format differences
- **Improved compatibility** with StreamDock Software 2.9+

## [0.1.0] - 2025-07-26

### Added
- **Initial plugin release** based on SENTINELITE's StreamDeck-Shortcuts
- **Mac Shortcuts integration** - execute any Mac Shortcut from StreamDock buttons
- **Folder navigation** - organize and browse shortcuts by folders
- **Integrated search functionality** - quickly find shortcuts
- **Customizable button titles** - override default shortcut names
- **Property Inspector** web interface for configuration
- **WebSocket communication** between plugin and Property Inspector
- **Dark theme UI** with responsive design
- **macOS 12.0+ support** requirement
- **StreamDock Software 2.9+** compatibility

## Support

For issues, feature requests, or questions about specific versions, please visit our [GitHub Issues](https://github.com/orumad/Mac-Shortcuts-plugin/issues) page.

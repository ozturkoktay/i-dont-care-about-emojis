# 🚫 I don't care about emojis

A minimal, fast browser extension for Chrome and Firefox that hides, grayscale, dim, or blur emojis without touching images.

## Highlights

- **Accurate emoji detection** using Unicode ranges
- **Blocking modes**: hide (default), grayscale, dim, or blur 
- **Whitelist** domains to keep emojis on specific sites
- **Real‑time processing** for dynamic pages
- **Cross‑browser**: Chrome + Firefox (MV3 compatible)

## Default behavior

- **Mode**: `hide`
- **Enabled**: `true`

## Install (from source)

```bash
git clone https://github.com/ozturkoktay/i-dont-care-about-emojis.git
cd i-dont-care-about-emojis
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist` folder

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → select any file inside `dist`

## Usage

- Open the popup to enable/disable and change mode
- Use **Whitelist** to allow emojis on specific domains
- Open **Settings** for full whitelist management

<!-- ## Project structure

```
i-dont-care-about-emojis/
├── src/
│   ├── core/
│   │   ├── EmojiBlockerCore.js   # Detection + DOM processing
│   │   └── StorageManager.js     # Settings + whitelist storage
│   ├── content/                  # Content script + styles
│   ├── background/               # MV3 service worker
│   ├── popup/                    # Popup UI
│   └── options/                  # Settings UI
├── scripts/                      # Build + manifest validation
├── .github/workflows/            # CI/CD
├── manifest.json
└── package.json
``` -->

## Development

```bash
npm run lint
npm test
npm run build
```

Package bundles:

```bash
npm run package:chrome
npm run package:firefox
```

## License

MIT — see [LICENSE](LICENSE).

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Read the documentation

## Roadmap

- [ ] Import/export whitelist
- [ ] Replace emojis with custom icons
- [ ] Statistics dashboard
- [ ] Sync settings across devices
- [ ] Keyboard shortcuts
- [ ] Theme customization

---

Made by Oktay Ozturk

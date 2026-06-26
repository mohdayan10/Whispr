# Running Whispr from scratch

A basic, end-to-end guide to get the app running on a fresh machine.
For the **native Windows** run specifics (black-screen fix, etc.), see [`RUN_WINDOWS.md`](./RUN_WINDOWS.md).

---

## 1. Prerequisites

- **Node.js 20+** (Windows checkout is tested on Node 22) and **npm**.
- **Git**.
- **C/C++ build tools** (needed for native deps like `sharp` and the Rust mic module):
  - **macOS:** Xcode Command Line Tools — `xcode-select --install`
  - **Windows:** Visual Studio Build Tools (MSVC / "Desktop development with C++").
  - **Linux:** `build-essential` (`sudo apt install build-essential`).
- **Rust toolchain** (only if you need to (re)build the microphone native module):
  `rustup default stable`

---

## 2. Get the code & install

```bash
git clone <repo-url> whispr
cd whispr
npm install
```

`npm install` runs a `postinstall` step that rebuilds `sharp`, downloads ML models,
and ensures `sqlite-vec` — so the first install takes a few minutes.

---

## 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in only what you need. **Nothing here is strictly required to launch the UI** — most keys can also be entered later in the app's **Settings**.

| Key | Used for |
|-----|----------|
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `CLAUDE_API_KEY` / `GROQ_API_KEY` | AI answers (pick at least one) |
| `DEEPGRAM_API_KEY` | Low-latency streaming transcription (recommended) |
| `GROQ_API_KEY` | Groq Whisper transcription (batch, higher latency) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Calendar integration (OAuth) |
| `ELEVENLABS_API_KEY`, `AZURE_SPEECH_*`, `IBM_WATSON_*` | Alternative STT providers |
| `USE_OLLAMA` / `OLLAMA_MODEL` / `OLLAMA_URL` | Local LLM via Ollama |

> Transcription provider + key can also be set in **Settings → Audio**, and AI keys in
> **Settings → AI Providers**. Restart the app after saving STT keys.

---

## 4. (Optional) Build the microphone native module

The Rust module captures the mic. Prebuilt binaries may already exist
(`native-module/index.<platform>.node`). If your platform's binary is missing,
build it:

```bash
npm run build:native
```

The app **still launches without it** — only mic capture is degraded.

---

## 5. Run in development

One command starts the Vite dev server **and** Electron:

```bash
npm start          # = vite on :5180 + electron (dev)
```

Or run the two halves manually:

```bash
npm run dev -- --port 5180 --strictPort   # terminal 1: renderer (Vite)
npm run electron:dev                       # terminal 2: compiles main + launches Electron
```

> **Windows note:** a plain launch can show a **black screen** (GPU compositing issue).
> Launch Electron with `--disable-gpu`. See [`RUN_WINDOWS.md`](./RUN_WINDOWS.md) for the
> exact copy-paste commands.

---

## 6. Using the app

- **Ctrl/Cmd + B** — toggle the launcher / overlay.
- **Start Meeting** (in the launcher) — begins audio capture + live transcription.
- **Answer** — push-to-talk: captures your mic as voice input.
- **Ctrl + Shift + H** — selective (area) screenshot · **Ctrl + H** — full screenshot.
- **Ctrl + Shift + ← / →** — move the overlay window.

---

## 7. Production build (packaged app)

```bash
npm run build            # type-check + build renderer
npm run build:electron   # compile the Electron main process
npm run dist             # full build + native + electron-builder installer
```

Output installers/binaries land in the `release/` (electron-builder) output directory.

---

## 8. Troubleshooting

| Symptom | Fix |
|--------|-----|
| **Black screen** (Windows) | Launch Electron with `--disable-gpu` (see `RUN_WINDOWS.md`). |
| **No transcripts when you talk** | By design — the overlay transcribes the *other* party (system audio); your mic only feeds in when **Answer** is active. |
| **Repeated "you / Thank you"** | Whisper silence hallucination. Switch transcription provider to **Deepgram** (Settings → Audio). |
| **Transcription feels delayed** | You're on a batch provider (Groq Whisper). Switch to a streaming one (**Deepgram**/Soniox). |
| **Calendar: `403 access_denied`** | Add your Google account as a **Test user** on the OAuth consent screen, or publish the app. |
| **Mic module fails to load** | Run `npm run build:native` (needs Rust). App still runs without it. |

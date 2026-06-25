# Running Whispr natively on Windows (from WSL)

Runbook so this is fast next time. "Run in Windows" = the **native Windows** app (black-theme overlay), NOT the WSL/WSLg build.

## TL;DR — copy/paste

```bash
# 1. Stop any old Whispr Electron window (safe: only kills electron, not your other node apps)
powershell.exe -NoProfile -Command "Stop-Process -Name electron -Force -ErrorAction SilentlyContinue"

# 2. Is Vite already up on 5180? If this prints 200, SKIP step 3.
powershell.exe -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:5180 -TimeoutSec 2).StatusCode } catch { 'not up - run step 3' }"

# 3. Start the Vite dev server (Windows), background — only if step 2 said 'not up'
powershell.exe -NoProfile -Command "Start-Process npm.cmd -ArgumentList 'run','dev','--','--port','5180','--strictPort' -WorkingDirectory 'C:\dev\whispr' -WindowStyle Hidden; 1..30 | ForEach-Object { try { if((Invoke-WebRequest -UseBasicParsing http://localhost:5180 -TimeoutSec 1).StatusCode -eq 200){ 'vite up'; break } } catch { Start-Sleep 1 } }"

# 4. Launch Electron with GPU DISABLED (this is what stops the black screen)
powershell.exe -NoProfile -Command "\$env:NODE_ENV='development'; Start-Process 'C:\dev\whispr\node_modules\electron\dist\electron.exe' -ArgumentList '.','--disable-gpu' -WorkingDirectory 'C:\dev\whispr' -RedirectStandardOutput 'C:\dev\whispr\run.log' -RedirectStandardError 'C:\dev\whispr\run.err.log'"

# 5. Confirm the window is up
powershell.exe -NoProfile -Command "Get-Process electron | Where-Object { \$_.MainWindowTitle -eq 'Whispr' } | Select Id,MainWindowTitle"
```

Then on the Windows keyboard press **Ctrl+B** to show/hide the launcher.

## Key facts (why the previous attempts were slow)

- **Location:** the Windows app lives at `C:\dev\whispr` (separate non-git copy). It has Windows `node_modules` + real `electron.exe` (v33) at `node_modules\electron\dist\electron.exe`.
- **Do NOT run the WSL build** (`cd /home/ayan/whispr && npm run start`). That runs under Linux and only shows via WSLg — it's the "linux" path, not wanted.
- **Native audio module:** only the Linux binary exists (`index.linux-x64-gnu.node`); the Windows one is missing. The app **still launches** without it (audio capture degraded) — no Rust build needed just to run the UI.
- **BLACK SCREEN cause + fix:** GPU compositing fails on this machine, so the transparent overlay renders solid black. **Launch Electron with `--disable-gpu`.** A plain `npm run start` does NOT pass this flag → black screen. That's why step 4 launches electron directly with the flag instead of `npm run start`.
- **Launcher:** the UI is a transparent overlay. The visible launcher bar (light, "What to answer? / Clarify / Brainstorm / Follow Up Question / Answer" + "Ask anything on screen" input + Gemini model picker) is toggled with the global hotkey **Ctrl+B**. Each press toggles it — once it's visible, stop pressing or it hides again.
- **Verify it's running:** `powershell.exe -NoProfile -Command "Get-Process electron | Where-Object {$_.MainWindowTitle -eq 'Whispr'}"` should show the main window.

## Permanent black-screen fix (optional)

Add this near the top of the main process (`electron/main.ts`, before `app.whenReady()`):

```ts
app.disableHardwareAcceleration()
```

Then a normal `npm run start` will render without needing the `--disable-gpu` flag. Note: editing must be done in the `C:\dev\whispr` copy (or rebuilt/synced there), since that's what runs on Windows.

## Toolchain notes (for reference)

- Windows has Node v22 + npm 10 (`C:\Program Files\nodejs`).
- MSVC C++ build tools are installed (VS 2019 BuildTools, `cl.exe`).
- `rustup` is installed but has **no toolchain** — only needed if you ever build the Windows native audio module (`rustup default stable` then `npm run build:native`). Not needed just to run.

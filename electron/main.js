// Impact Earth desktop shell: a window around the built web app, served over a
// custom app:// protocol (dependency-free) so fetch() of the population grid works.

import { app, BrowserWindow, net, protocol, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { smokeJourney } from './smoke.js';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const isSmoke = process.argv.includes('--smoke');
const smokeProfile = isSmoke ? mkdtempSync(path.join(tmpdir(), 'impact-earth-smoke-')) : null;
if (smokeProfile) app.setPath('userData', smokeProfile);
if (isSmoke) setTimeout(() => { console.error('[smoke] timed out'); app.exit(1); }, 45000).unref();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

async function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#060a12',
    autoHideMenuBar: true,
    title: 'Impact Earth',
    icon: path.join(DIST, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // External links (methodology sources, attribution) open in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await win.loadURL('app://bundle/');
  if (isSmoke) {
    const checks = await win.webContents.executeJavaScript(`(${smokeJourney.toString()})()`);
    const image = await win.webContents.capturePage();
    await fs.writeFile(process.env.SMOKE_OUT ?? 'smoke.png', image.toPNG());
    console.log('[smoke] ok: ' + checks);
    app.quit();
  }
}

function fail(error) { console.error('[desktop] failed', error); app.exit(1); }

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  return createWindow();
}).catch(fail);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(fail);
});

app.on('quit', () => { if (smokeProfile) fs.rm(smokeProfile, { recursive: true, force: true }).catch(() => {}); });

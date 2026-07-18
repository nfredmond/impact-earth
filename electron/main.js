// Impact Earth desktop shell: a window around the built web app, served over a
// custom app:// protocol (dependency-free) so fetch() of the population grid works.

import { app, BrowserWindow, net, protocol, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

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

  // `--smoke`: load, wait for the scene, screenshot to SMOKE_OUT, exit.
  // Used by local verification and CI sanity checks.
  if (process.argv.includes('--smoke')) {
    setTimeout(async () => {
      try {
        const image = await win.webContents.capturePage();
        const { promises: fs } = await import('node:fs');
        await fs.writeFile(process.env.SMOKE_OUT ?? 'smoke.png', image.toPNG());
        console.log('[smoke] ok title=' + win.getTitle());
      } catch (err) {
        console.error('[smoke] failed', err);
        process.exitCode = 1;
      }
      app.quit();
    }, 9000);
  }

  await win.loadURL('app://bundle/');
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    let rel = decodeURIComponent(new URL(request.url).pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

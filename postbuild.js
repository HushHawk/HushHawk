import fs from 'fs';
import { spawnSync } from 'node:child_process';

const PRERENDER_SHUTDOWN_GRACE_MS = 5_000;

const collectionPages = {};

for (const collectionName in collectionPages) {
    const template = fs.readFileSync(`./dist${collectionName}/index.html`, 'utf8');

    const collectionId = collectionName.split('/').pop().replace('path__', '');

    const titleRegex = new RegExp(`${collectionId}title__`, 'g');
    const descRegex = new RegExp(`${collectionId}desc__`, 'g');
    const imageRegex = new RegExp(`image" content="[^"]*${collectionId}image__`, 'g');
    const socialTitleRegex = new RegExp(`${collectionId}socialTitle__`, 'g');
    const socialDescRegex = new RegExp(`${collectionId}socialDesc__`, 'g');
    const keywordsRegex = new RegExp(`${collectionId}keywords__`, 'g');
    const pathRegex = new RegExp(`${collectionId}path__/"`, 'g');

    collectionPages[collectionName].forEach(collectionItem => {
        fs.mkdirSync(`./dist/${collectionItem.path}`, { recursive: true });

        const index = template
            .replace(titleRegex, collectionItem.title || '')
            .replace(descRegex, collectionItem.desc || '')
            .replace(imageRegex, `image" content="${collectionItem.image || ''}`)
            .replace(socialTitleRegex, collectionItem.socialTitle || '')
            .replace(socialDescRegex, collectionItem.socialDesc || '')
            .replace(keywordsRegex, collectionItem.keywords || '')
            .replace(pathRegex, `${collectionItem.path}/"`);

        fs.writeFileSync(`./dist/${collectionItem.path}/index.html`, index);
    });

    fs.rmSync(`./dist${collectionName}/index.html`);
    fs.rmdirSync(`./dist${collectionName}`);
}

runPrerender();

function runPrerender() {
    try {
        const deadline = Number.parseInt(process.env.WW_PRERENDER_DEADLINE_EPOCH_MS || '', 10);
        const timeout = Number.isFinite(deadline)
            ? Math.max(deadline - Date.now() + PRERENDER_SHUTDOWN_GRACE_MS, 1)
            : undefined;
        const result = spawnSync(process.execPath, ['./prerender/index.ts'], {
            cwd: process.cwd(),
            env: process.env,
            stdio: 'inherit',
            timeout,
        });

        if (!result.error && result.status === 0) {
            syncHomeRoute();
            applyDarkThemeToDist();
            return;
        }

        console.warn('[weweb-prerender] static rendering failed; preserving the CSR build', {
            message: result.error?.message,
            signal: result.signal,
            status: result.status,
        });
        syncHomeRoute();
        applyDarkThemeToDist();
    } catch (error) {
        console.warn('[weweb-prerender] unable to start static rendering; preserving the CSR build', {
            message: error instanceof Error ? error.message : `${error}`,
        });
        syncHomeRoute();
        applyDarkThemeToDist();
    }
}

function syncHomeRoute() {
    try {
        if (fs.existsSync('./dist/index.html')) {
            fs.mkdirSync('./dist/home', { recursive: true });
            fs.copyFileSync('./dist/index.html', './dist/home/index.html');
        }
    } catch (e) {
        console.warn('Failed to sync /home route:', e.message);
    }
}

function applyDarkThemeToDist() {
    const darkGuard = `<style id="hushhawk-dark-guard">html,body{background-color:#04182d!important;background:#04182d!important;color:#f8fafc!important;margin:0;padding:0;min-height:100vh;}#app{background-color:#04182d!important;min-height:100vh;}</style>`;

    function processDir(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = `${dir}/${entry.name}`;
            if (entry.isDirectory()) {
                processDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                let html = fs.readFileSync(fullPath, 'utf8');
                let modified = false;

                if (!html.includes('id="hushhawk-dark-guard"')) {
                    html = html.replace('<head>', `<head>\n        ${darkGuard}`);
                    modified = true;
                }

                if (!html.includes('style="background-color: #04182d')) {
                    html = html.replace(/<html([^>]*)>/, '<html$1 style="background-color: #04182d; color: #f8fafc;">');
                    modified = true;
                }

                if (!html.includes('ww-app-theme-dark')) {
                    html = html.replace(/class="([^"]*)"/, 'class="$1 ww-app-theme-dark"');
                    modified = true;
                }

                if (html.includes('<body style="margin: 0; font-family:')) {
                    html = html.replace('<body style="margin: 0; font-family:', '<body style="margin: 0; background-color: #04182d; color: #f8fafc; font-family:');
                    modified = true;
                }

                if (modified) {
                    fs.writeFileSync(fullPath, html, 'utf8');
                }
            }
        }
    }

    try {
        processDir('./dist');
        console.log('[postbuild] Injected dark theme guard into all dist/*.html files.');
    } catch (err) {
        console.warn('[postbuild] Could not apply dark theme to dist files:', err.message);
    }
}

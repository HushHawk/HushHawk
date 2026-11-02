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
    const darkGuard = `<style id="hushhawk-dark-guard">html,body{background-color:#04182d!important;background:#04182d!important;color:#f8fafc!important;margin:0;padding:0;min-height:100vh;}#app{background-color:#04182d!important;min-height:100vh;}</style>
    <style id="hushhawk-preloader-css">
        #hushhawk-initial-preloader {
            position: fixed;
            inset: 0;
            background-color: #04182d;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, sans-serif;
        }
        .hh-preloader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
        }
        .hh-preloader-spinner {
            position: relative;
            width: 86px;
            height: 86px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .hh-preloader-orbit {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2.5px solid transparent;
            border-top: 3px solid #FDE68A;
            border-right: 2.5px solid #F59E0B;
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
            animation: hhPreloaderSpin 1s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
        }
        .hh-preloader-orbit-dash {
            position: absolute;
            inset: -7px;
            border-radius: 50%;
            border: 1px dashed rgba(212, 175, 55, 0.35);
            animation: hhPreloaderSpinRev 5s linear infinite;
        }
        .hh-preloader-emblem {
            display: flex;
            align-items: center;
            justify-content: center;
            animation: hhPreloaderPulse 2s ease-in-out infinite;
            filter: drop-shadow(0 0 16px rgba(245, 158, 11, 0.45));
        }
        .hh-preloader-brand {
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 7px;
        }
        .hh-preloader-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.16em;
            color: #FDE68A;
            text-transform: uppercase;
        }
        .hh-preloader-status {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.14em;
            color: #64748b;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .hh-preloader-dots span {
            animation: hhPreloaderDot 1.4s infinite;
            opacity: 0;
        }
        .hh-preloader-dots span:nth-child(1) { animation-delay: 0s; }
        .hh-preloader-dots span:nth-child(2) { animation-delay: 0.25s; }
        .hh-preloader-dots span:nth-child(3) { animation-delay: 0.5s; }
        @keyframes hhPreloaderSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes hhPreloaderSpinRev { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
        @keyframes hhPreloaderPulse { 0%, 100% { transform: scale(0.96); } 50% { transform: scale(1.04); } }
        @keyframes hhPreloaderDot { 0%, 20% { opacity: 0; } 40%, 100% { opacity: 1; } }
    </style>`;

    const preloaderMarkup = `<div id="hushhawk-initial-preloader">
        <div class="hh-preloader-container">
            <div class="hh-preloader-spinner">
                <div class="hh-preloader-orbit"></div>
                <div class="hh-preloader-orbit-dash"></div>
                <div class="hh-preloader-emblem">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="54" height="54" fill="none">
                        <rect width="36" height="36" rx="8" fill="#0A1128"/>
                        <rect x="1" y="1" width="34" height="34" rx="7" stroke="url(#hhPreloaderGoldDist)" stroke-width="1.2" stroke-opacity="0.9"/>
                        <defs>
                            <linearGradient id="hhPreloaderGoldDist" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stop-color="#FDE68A"/>
                                <stop offset="35%" stop-color="#D4AF37"/>
                                <stop offset="70%" stop-color="#B45309"/>
                                <stop offset="100%" stop-color="#F59E0B"/>
                            </linearGradient>
                            <linearGradient id="hhPreloaderCrownDist" x1="10" y1="5" x2="26" y2="14" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stop-color="#FFFBEB"/>
                                <stop offset="60%" stop-color="#F59E0B"/>
                                <stop offset="100%" stop-color="#D97706"/>
                            </linearGradient>
                        </defs>
                        <path d="M12 9.5L14 13.5L18 7.5L22 13.5L24 9.5L25 15.5H11L12 9.5Z" fill="url(#hhPreloaderCrownDist)"/>
                        <circle cx="18" cy="11.5" r="1.2" fill="#0A1128"/>
                        <path d="M6 14.5C10 16 14 19 16.5 22L13 23C9 20 6.5 17 6 14.5Z" fill="url(#hhPreloaderGoldDist)"/>
                        <path d="M7.5 19C10.5 20.5 14 23 15.5 25L13.5 26C10 23.5 8 21 7.5 19Z" fill="url(#hhPreloaderGoldDist)" fill-opacity="0.9"/>
                        <path d="M30 14.5C26 16 22 19 19.5 22L23 23C27 20 29.5 17 30 14.5Z" fill="url(#hhPreloaderGoldDist)"/>
                        <path d="M28.5 19C25.5 20.5 22 23 20.5 25L22.5 26C26 23.5 28 21 28.5 19Z" fill="url(#hhPreloaderGoldDist)" fill-opacity="0.9"/>
                        <path d="M18 14L15.5 19.5L18 29L20.5 19.5L18 14Z" fill="url(#hhPreloaderGoldDist)"/>
                        <path d="M18 15.5L16.8 19L18 22L19.2 19L18 15.5Z" fill="#FFFBEB"/>
                        <circle cx="18" cy="18.5" r="1" fill="#0A1128"/>
                        <path d="M17.5 19.5H18.5L18.8 22H17.2L17.5 19.5Z" fill="#0A1128"/>
                        <path d="M16 29L18 31.5L20 29H16Z" fill="url(#hhPreloaderGoldDist)"/>
                    </svg>
                </div>
            </div>
            <div class="hh-preloader-brand">
                <div class="hh-preloader-title">HUSHHAWK INTELLIGENCE</div>
                <div class="hh-preloader-status">
                    <span>INITIALIZING COMMAND CENTER</span>
                    <span class="hh-preloader-dots"><span>.</span><span>.</span><span>.</span></span>
                </div>
            </div>
        </div>
    </div>`;

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

                // Inject HushHawk preloader inside <div id="app" ...></div> if empty
                if (html.includes('<div id="app" data-ww-app-mount="true"></div>')) {
                    html = html.replace('<div id="app" data-ww-app-mount="true"></div>', `<div id="app" data-ww-app-mount="true">${preloaderMarkup}</div>`);
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

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
            return;
        }

        console.warn('[weweb-prerender] static rendering failed; preserving the CSR build', {
            message: result.error?.message,
            signal: result.signal,
            status: result.status,
        });
        syncHomeRoute();
    } catch (error) {
        console.warn('[weweb-prerender] unable to start static rendering; preserving the CSR build', {
            message: error instanceof Error ? error.message : `${error}`,
        });
        syncHomeRoute();
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


enhanceHtmlMetaAndFavicons();

function enhanceHtmlMetaAndFavicons() {
    const SECTION_TITLES = {
        '': 'HushHawk | Property Intelligence & Real Estate Command Center',
        'home': 'HushHawk | Property Intelligence & Real Estate Command Center',
        'deal-analyzer': 'Wholesale Underwriting & MAO Engine | HushHawk',
        'direct-mail': 'CrownKey Direct Mail Tracking | HushHawk',
        'automations': 'Event Automations & Webhooks | HushHawk',
        'county-data': 'Duval County Data Intelligence | HushHawk',
        'contacts': 'Contacts & Lead Intelligence | HushHawk',
        'communications': 'Omnichannel Communications | HushHawk',
        'properties': 'Properties & Photos Management | HushHawk',
        'cash-buyers': 'VIP Cash Buyers Matrix | HushHawk',
        'dispositions': 'Dispositions Command Center | HushHawk',
        'tasks': 'Task Management & Escrow | HushHawk',
        'follow-ups': 'Follow Ups & Tasks | HushHawk',
        'contracts': 'PSA Contracts & Title Escrow | HushHawk',
        'marketing': 'Marketing Command Center | HushHawk',
        'analytics': 'Market Analytics & Reports | HushHawk',
        'facebook-leads': 'Facebook Lead Intelligence | HushHawk',
        'skip-tracing': 'Tiered Skip Tracing Engine | HushHawk',
        'calendar': 'Walkthrough Calendar | HushHawk',
        'vault': 'Media & File Vault | HushHawk',
        'team': 'Team & Access Control (RBAC) | HushHawk',
        'settings': 'System Settings & Integrations | HushHawk',
        'login': 'Sign In | HushHawk Workspace',
        'signup': 'Create Account | HushHawk Workspace',
        'forgot-password': 'Reset Access Key | HushHawk Workspace'
    };

    const faviconTags = `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />`;

    function processDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = `${dir}/${entry.name}`;
            if (entry.isDirectory()) {
                processDir(fullPath);
            } else if (entry.name === 'index.html') {
                let content = fs.readFileSync(fullPath, 'utf8');
                const relPath = fullPath.replace(/^\.\/dist\/?/, '').replace(/\/index\.html$/, '');
                const title = SECTION_TITLES[relPath] || 'HushHawk | Property Intelligence & CrownKey Command Center';

                content = content.replace(/<title>.*?<\/title>/s, `<title>${title}</title>`);

                if (content.includes('favicon.ico?_wwcv=2')) {
                    content = content.replace(/<link rel="icon"[^>]*>/g, faviconTags);
                } else if (!content.includes('href="/favicon.svg"')) {
                    content = content.replace('</head>', `    ${faviconTags}\n</head>`);
                }

                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    }

    if (fs.existsSync('./dist')) {
        processDir('./dist');
        console.log('[postbuild] Enhanced all dist HTML files with proper titles and full favicon tags.');
    }
}

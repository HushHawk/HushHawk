import { db } from '../store/database.js';

export class PodioService {
    static CLIENT_ID = process.env.PODIO_CLIENT_ID || 'Hush Hawk Integration';
    static CLIENT_SECRET = process.env.PODIO_CLIENT_SECRET || '5XcEYszn4UxM0cwR3aMJLvsJzxuHSGWh5b5s0iSaXYk1HjnUuLiqseIyyOdwNF39';
    static BASE_URL = 'https://api.podio.com';

    /**
     * Authenticate with Podio using App Authentication
     * @param {string} appId 
     * @param {string} appToken 
     */
    static async authenticateApp(appId, appToken) {
        const payload = new URLSearchParams({
            grant_type: 'app',
            app_id: appId,
            app_token: appToken,
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
        });

        const res = await fetch(`${this.BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString()
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Podio App Auth Failed [HTTP ${res.status}]: ${err}`);
        }

        return await res.json();
    }

    /**
     * Authenticate with Podio using User Credentials
     * @param {string} username 
     * @param {string} password 
     */
    static async authenticateUser(username, password) {
        const payload = new URLSearchParams({
            grant_type: 'password',
            username,
            password,
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
        });

        const res = await fetch(`${this.BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString()
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Podio User Auth Failed [HTTP ${res.status}]: ${err}`);
        }

        return await res.json();
    }

    /**
     * Register a Webhook automatically on a Podio App
     * @param {string} accessToken 
     * @param {string} appId 
     * @param {string} webhookUrl 
     */
    static async registerWebhook(accessToken, appId, webhookUrl) {
        const res = await fetch(`${this.BASE_URL}/hook/app/${appId}/`, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth2 ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: webhookUrl,
                type: 'item.create'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Podio Webhook Registration Failed [HTTP ${res.status}]: ${err}`);
        }

        return await res.json();
    }

    /**
     * Fetch recent items from a Podio App
     * @param {string} accessToken 
     * @param {string} appId 
     * @param {number} limit 
     */
    static async fetchAppItems(accessToken, appId, limit = 20) {
        const res = await fetch(`${this.BASE_URL}/item/app/${appId}/?limit=${limit}`, {
            headers: {
                'Authorization': `OAuth2 ${accessToken}`
            }
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Podio Fetch Items Failed [HTTP ${res.status}]: ${err}`);
        }

        return await res.json();
    }
}

import { CarrierDispatchService } from './carrierDispatchService.js';
import { PodioSyncService } from './podioSyncService.js';

const podioReady = () => ['PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_APP_ID', 'PODIO_FEEDS_APP_ID'].every(name => Boolean(process.env[name]));

/**
 * Sends a text or email by the best real channel available, in this order:
 *   1. A directly configured carrier (Twilio for SMS; SendGrid or SMTP for email).
 *   2. Podio Feeds: HushHawk creates an outbound Feeds item and Podio's automation delivers it. This is how the workspace sends today.
 * If neither is configured or both refuse, the result is a failure. Nothing is ever reported as sent without a real hand-off.
 * Only one channel is used per message, so a message can never be delivered twice.
 */
async function viaPodio(type, payload) {
    if (!podioReady()) return null;
    try {
        const sent = await PodioSyncService.sendOutboundCommunication({ type, ...payload, recordLocally: false });
        return {
            success: true, liveCarrier: true, provider: 'podio', status: 'HANDED_TO_PODIO', itemId: sent.itemId,
            notice: 'Created in Podio Feeds; Podio delivers it.'
        };
    } catch (error) {
        return { success: false, liveCarrier: false, provider: 'podio', status: 'PODIO_REFUSED', error: `Podio did not accept the message: ${error.message}` };
    }
}

export class DeliveryService {
    static async text({ to, message, leadName = null, propertyAddress = null }) {
        const carrier = await CarrierDispatchService.dispatchSms({ to, message });
        if (carrier.success) return carrier;
        const podio = await viaPodio('TEXT', { to, body: message, leadName, propertyAddress });
        return podio || carrier;
    }

    static async email({ to, subject, text, leadName = null, propertyAddress = null }) {
        const carrier = await CarrierDispatchService.dispatchEmail({ to, subject, text });
        if (carrier.success) return carrier;
        const podio = await viaPodio('EMAIL', { to, subject, body: text, leadName, propertyAddress });
        return podio || carrier;
    }
}

import { config } from '../config.js';
import { markAsRead, downloadMedia } from '../services/whatsappService.js';
import { handleIncomingSalesMessage } from '../services/salesBotService.js';

/**
 * Verificación del Webhook requerida por Meta for Developers (GET)
 */
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`[Webhook Verify] Recibida solicitud GET: mode="${mode}", token="${token}"`);

  if (mode && token) {
    if (mode === 'subscribe' && token === config.webhookVerifyToken) {
      console.log('✅ Webhook verificado correctamente con Meta.');
      return res.status(200).send(challenge);
    } else {
      console.warn(`❌ Token de verificación inválido. Recibido: "${token}", Esperado: "${config.webhookVerifyToken}"`);
      return res.status(403).send('Token mismatch');
    }
  }

  console.warn('❌ Petición GET a /webhook sin parámetros requeridos de Meta.');
  return res.status(400).send('Missing params');
}

/**
 * Recepción de mensajes y eventos de WhatsApp (POST)
 */
export async function handleWebhookEvent(req, res) {
  // Siempre respondemos 200 OK inmediatamente para que Meta no reintente el envío
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Solo procesamos si hay mensajes entrantes (ignoramos estados como 'sent', 'delivered', etc.)
    if (!value?.messages || value.messages.length === 0) {
      return;
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];
    const userName = contact?.profile?.name || '';
    const from = message.from; // Número de WhatsApp del cliente
    const messageId = message.id;

    // Marcar como leído
    await markAsRead(messageId);

    // Extraer contenido según el tipo de mensaje
    let text = '';
    let interactiveId = '';
    let interactiveType = '';
    let audioBuffer = null;
    let audioMimeType = '';

    if (message.type === 'text') {
      text = message.text?.body || '';
    } else if (message.type === 'audio' || message.type === 'voice') {
      const audioId = message.audio?.id || message.voice?.id;
      if (audioId) {
        try {
          const downloaded = await downloadMedia(audioId);
          audioBuffer = downloaded.buffer;
          audioMimeType = downloaded.mimeType;
        } catch (err) {
          console.error('Error al descargar audio del webhook:', err.message);
        }
      }
    } else if (message.type === 'interactive') {
      interactiveType = message.interactive?.type;
      if (interactiveType === 'button_reply') {
        interactiveId = message.interactive.button_reply?.id;
        text = message.interactive.button_reply?.title;
      } else if (interactiveType === 'list_reply') {
        interactiveId = message.interactive.list_reply?.id;
        text = message.interactive.list_reply?.title;
      }
    } else if (message.type === 'button') {
      // Formato alternativo de botones de plantilla
      interactiveId = message.button?.payload || message.button?.text;
      text = message.button?.text;
    }

    // Procesar la lógica de ventas
    await handleIncomingSalesMessage({
      from,
      text,
      interactiveType,
      interactiveId,
      userName,
      audioBuffer,
      audioMimeType
    });
  } catch (error) {
    console.error('Error procesando evento del webhook:', error);
  }
}


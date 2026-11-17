import axios from 'axios';
import { config } from '../config.js';

const getApiUrl = () => {
  return `https://graph.facebook.com/${config.graphApiVersion}/${config.whatsappPhoneNumberId}/messages`;
};

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.whatsappToken}`
  };
};

/**
 * Marca un mensaje recibido como leído
 */
export async function markAsRead(messageId) {
  try {
    if (!config.whatsappToken || !config.whatsappPhoneNumberId) return;

    await axios.post(
      getApiUrl(),
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      { headers: getHeaders() }
    );
  } catch (error) {
    console.error('Error al marcar mensaje como leído:', error.response?.data || error.message);
  }
}

/**
 * Enviar mensaje de texto simple
 */
export async function sendTextMessage(to, text) {
  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };

    const response = await axios.post(getApiUrl(), payload, { headers: getHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error enviando texto a ${to}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Enviar mensaje interactivo con botones (máximo 3 botones permitidos por Meta)
 * @param {string} to - Número de destino
 * @param {string} bodyText - Texto principal del mensaje
 * @param {Array<{id: string, title: string}>} buttons - Lista de hasta 3 botones
 */
export async function sendButtonMessage(to, bodyText, buttons) {
  try {
    const formattedButtons = buttons.slice(0, 3).map((btn) => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title.substring(0, 20) // Meta limita el título a 20 caracteres
      }
    }));

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: formattedButtons }
      }
    };

    const response = await axios.post(getApiUrl(), payload, { headers: getHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error enviando botones a ${to}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Enviar mensaje interactivo con Lista de opciones (ideal para catálogos de productos)
 * @param {string} to - Número de destino
 * @param {string} bodyText - Texto explicativo
 * @param {string} buttonTitle - Texto del botón que abre la lista (ej: "Ver Catálogo")
 * @param {Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>} sections
 */
export async function sendListMessage(to, bodyText, buttonTitle, sections) {
  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonTitle.substring(0, 20),
          sections: sections
        }
      }
    };

    const response = await axios.post(getApiUrl(), payload, { headers: getHeaders() });
    return response.data;
  } catch (error) {
    console.error(`Error enviando lista a ${to}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Descarga un archivo multimedia (ej: notas de voz) desde Meta
 * @param {string} mediaId - ID del medio entregado por el webhook
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
export async function downloadMedia(mediaId) {
  try {
    const mediaInfo = await axios.get(
      `https://graph.facebook.com/${config.graphApiVersion}/${mediaId}`,
      { headers: getHeaders() }
    );

    const downloadRes = await axios.get(mediaInfo.data.url, {
      headers: { Authorization: `Bearer ${config.whatsappToken}` },
      responseType: 'arraybuffer'
    });

    return {
      buffer: Buffer.from(downloadRes.data),
      mimeType: mediaInfo.data.mime_type
    };
  } catch (error) {
    console.error(`Error al descargar medio ${mediaId}:`, error.response?.data || error.message);
    throw error;
  }
}



import { sendTextMessage, sendButtonMessage, sendListMessage } from './whatsappService.js';
import { saveLead } from './leadService.js';
import { getSalesAiResponse } from './aiService.js';
import { getSession, getColombiaDate, saveOrder } from './sessionService.js';
import { config } from '../config.js';

// Catálogo oficial de Auréstela Perfumería
export const CATALOG = [
  {
    id: 'prod_qaed',
    title: 'Qaed Al Fursan - Lattafa',
    fullName: 'Qaed Al Fursan de Lattafa — 100 ml',
    price: '$150.000 COP',
    description: 'Frutal, especiado y amaderado.',
    details: '🍍 *Qaed Al Fursan de Lattafa — 100 ml*\n' +
      '• *Precio:* $150.000 COP\n' +
      '• *Perfil:* Frutal, especiado y amaderado.\n' +
      '• *Salida:* Piña y azafrán.\n' +
      '• *Corazón:* Abeto balsámico y jazmín.\n' +
      '• *Fondo:* Cedro, ámbar y madera de oud.\n\n' +
      '✨ Ideal para tardes o noches frescas, climas templados o fríos.'
  },
  {
    id: 'prod_armaf',
    title: 'Armaf Eter Arabian Sky',
    fullName: 'Armaf Eter Arabian Sky — 100 ml EDP',
    price: '$358.000 COP',
    description: 'Fragancia unisex. Cítrico, frutal y cuero.',
    details: '🌌 *Armaf Eter Arabian Sky — 100 ml EDP (Unisex)*\n' +
      '• *Precio:* $358.000 COP\n' +
      '• *Perfil:* Aromático, cítrico, frutal y amaderado, con matices dulces y de cuero.\n' +
      '• *Salida:* Pimienta, pomelo, naranja, piña, bergamota y limón.\n' +
      '• *Corazón:* Lavanda, geranio, ylang-ylang y caramelo.\n' +
      '• *Fondo:* Pachulí, vetiver, cedro, almizcle, cuero y ámbar.\n\n' +
      '✨ Muy versátil para clima cálido/templado, oficina y salidas.'
  },
  {
    id: 'prod_khamrah',
    title: 'Khamrah - Lattafa',
    fullName: 'Khamrah de Lattafa — 100 ml',
    price: '$155.000 COP',
    description: 'Unisex y original. Dulce, cálido gourmand.',
    details: '🍯 *Khamrah de Lattafa — 100 ml (Unisex y Original)*\n' +
      '• *Precio:* $155.000 COP\n' +
      '• *Perfil:* Dulce, cálido, especiado y envolvente (dátiles, vainilla, praliné).\n' +
      '• *Salida:* Canela, nuez moscada y bergamota.\n' +
      '• *Corazón:* Dátiles, praliné, nardos y Mahonial.\n' +
      '• *Fondo:* Vainilla, haba tonka, mirra, benjuí, ámbar y Akigalawood.\n\n' +
      '✨ Perfecto para noches frescas, frío, citas y eventos especiales.'
  }
];

// Pasos del flujo de captura de pedidos
const ORDER_STEPS = [
  { field: 'nombre', prompt: '¡Claro que sí! Para tomar tu pedido, ¿me compartes tu nombre completo, por favor?' },
  { field: 'telefono', prompt: 'Con mucho gusto. ¿A qué número de teléfono te podemos contactar?' },
  { field: 'correo', prompt: 'Gracias. ¿Cuál es tu correo electrónico?' },
  { field: 'producto', prompt: '¿Cuál es el producto del catálogo que deseas comprar?' },
  { field: 'direccion', prompt: 'Por favor compárteme tu dirección completa con nomenclatura para la entrega:' },
  { field: 'metodoPago', prompt: '¿Qué método de pago prefieres? (Opciones: Transferencia bancaria, Efectivo, Nequi o Daviplata)' }
];

/**
 * Procesa cada mensaje recibido y responde según las directrices de Auréstela Perfumería
 */
export async function handleIncomingSalesMessage({
  from,
  text,
  interactiveType,
  interactiveId,
  userName,
  audioBuffer,
  audioMimeType
}) {
  const cleanText = (text || '').trim();
  const session = getSession(from);

  console.log(`[Auréstela] Mensaje de ${from} (${userName || 'Cliente'}): "${cleanText || interactiveId || (audioBuffer ? 'Audio' : '')}"`);

  // Guardar en CRM de prospectos
  saveLead({
    phone: from,
    name: userName,
    interest: interactiveId || cleanText || (audioBuffer ? 'Audio de consulta' : ''),
    message: cleanText || interactiveId || (audioBuffer ? 'Nota de voz' : '')
  });

  // 1. Manejo de clics en botones interactivos
  if (interactiveId) {
    await handleInteractiveSelection(from, interactiveId, userName);
    return;
  }

  // 2. Si la IA de Gemini está habilitada, la usamos prioritariamente con el prompt oficial
  const aiResponse = await getSalesAiResponse({
    from,
    text: cleanText,
    audioBuffer,
    audioMimeType,
    userName
  });

  if (aiResponse) {
    await sendTextMessage(from, aiResponse);
    return;
  }

  // 3. Fallback inteligente si no hay API Key de IA configurada
  await handleRuleBasedFlow(from, cleanText, userName, session);
}

/**
 * Manejo de botones y catálogo interactivo
 */
async function handleInteractiveSelection(to, selectedId, userName) {
  const session = getSession(to);

  if (selectedId === 'btn_catalog') {
    await sendFragranceCatalog(to);
    return;
  }

  if (selectedId === 'btn_advisor') {
    await sendHumanAdvisorContact(to);
    return;
  }

  if (selectedId === 'btn_buy') {
    session.isCapturingOrder = true;
    session.orderStep = 0;
    session.orderData = {};
    await sendTextMessage(to, ORDER_STEPS[0].prompt);
    return;
  }

  // Si seleccionó una fragancia del catálogo
  const product = CATALOG.find((p) => p.id === selectedId);
  if (product) {
    const buttons = [
      { id: 'btn_buy', title: 'Quiero pedirlo 🛒' },
      { id: 'btn_catalog', title: 'Ver otras fragancias' },
      { id: 'btn_advisor', title: 'Hablar con Asesor' }
    ];
    await sendButtonMessage(to, `${product.details}\n\n¿Te gustaría que te ayude a pedirlo?`, buttons);
    return;
  }

  await sendWelcomeGreeting(to);
}

/**
 * Saludo oficial de Auréstela Perfumería
 */
async function sendWelcomeGreeting(to) {
  const greeting = '¡Hola! Bienvenido/a a *Auréstela Perfumería*. Con mucho gusto te ayudo a elegir. ¿Buscas algo para el día a día o para una ocasión especial?';
  const buttons = [
    { id: 'btn_catalog', title: 'Ver Fragancias 🌸' },
    { id: 'btn_buy', title: 'Hacer un Pedido 🛒' },
    { id: 'btn_advisor', title: 'Hablar con Asesor 👤' }
  ];
  await sendButtonMessage(to, greeting, buttons);
}

/**
 * Enviar catálogo desplegable de perfumes
 */
async function sendFragranceCatalog(to) {
  const sections = [
    {
      title: 'Perfumes Disponibles',
      rows: CATALOG.map((item) => ({
        id: item.id,
        title: item.title,
        description: `${item.price} - ${item.description}`
      }))
    }
  ];

  await sendListMessage(
    to,
    'Te presento nuestras fragancias disponibles en Auréstela Perfumería. Toca el botón para ver detalles y notas olfativas:',
    'Ver Fragancias',
    sections
  );
}

/**
 * Enlace con asesor humano
 */
async function sendHumanAdvisorContact(to) {
  const message = 'Claro que sí, con mucho gusto. Un asesor de *Auréstela Perfumería* revisará esta conversación para brindarte atención personalizada en breve.';
  await sendTextMessage(to, message);
}

/**
 * Flujo estructurado de ventas y captura de pedido (Fallback sin IA)
 */
async function handleRuleBasedFlow(from, text, userName, session) {
  const lower = text.toLowerCase();

  // Si está en proceso de captura de pedido
  if (session.isCapturingOrder) {
    const stepIndex = session.orderStep || 0;
    const currentStep = ORDER_STEPS[stepIndex];

    if (currentStep) {
      session.orderData[currentStep.field] = text;
      const nextStepIndex = stepIndex + 1;

      if (nextStepIndex < ORDER_STEPS.length) {
        session.orderStep = nextStepIndex;
        await sendTextMessage(from, ORDER_STEPS[nextStepIndex].prompt);
        return;
      } else {
        // Pedido completado
        session.isCapturingOrder = false;
        const fecha = getColombiaDate();
        const d = session.orderData;

        const ficha =
          `**Fecha de compra:** ${fecha}\n` +
          `**Nombre Completo:** ${d.nombre || ''}\n` +
          `**Teléfono:** ${d.telefono || from}\n` +
          `**Correo:** ${d.correo || ''}\n` +
          `**Producto que desea comprar el cliente:** ${d.producto || ''}\n` +
          `**Dirección Completa con nomenclatura:** ${d.direccion || ''}\n` +
          `**Método de Pago:** ${d.metodoPago || ''}`;

        saveOrder(from, ficha);

        const respuestaFinal =
          `¡Listo! He organizado la información de tu solicitud:\n\n${ficha}\n\n` +
          `Un asesor de Auréstela Perfumería recibirá y validará tus datos para confirmar el pedido. ¡Muchas gracias por tu compra! ✨`;

        await sendTextMessage(from, respuestaFinal);
        return;
      }
    }
  }

  // Detección de intención de compra
  if (
    lower.includes('lo quiero') ||
    lower.includes('quiero comprar') ||
    lower.includes('quiero hacer el pedido') ||
    lower.includes('hacer pedido') ||
    lower.includes('como lo pago') ||
    lower.includes('cómo lo pago') ||
    lower.includes('pedir')
  ) {
    session.isCapturingOrder = true;
    session.orderStep = 0;
    session.orderData = {};
    await sendTextMessage(from, ORDER_STEPS[0].prompt);
    return;
  }

  // Saludos iniciales
  if (
    lower === 'hola' ||
    lower === 'buenas' ||
    lower === 'inicio' ||
    lower === 'menu' ||
    lower.includes('buenos dias') ||
    lower.includes('buenas tardes') ||
    lower.includes('buenas noches')
  ) {
    await sendWelcomeGreeting(from);
    return;
  }

  // Preguntas de recomendación por ocasión o clima
  if (
    lower.includes('calido') ||
    lower.includes('cálido') ||
    lower.includes('dia') ||
    lower.includes('día') ||
    lower.includes('oficina') ||
    lower.includes('fresco') ||
    lower.includes('versatil') ||
    lower.includes('versátil') ||
    lower.includes('diario')
  ) {
    const msg = '¡Excelente elección! Para un uso versátil y diario, la opción ideal es *Armaf Eter Arabian Sky ($358.000 COP)*. Es una fragancia unisex que abre con notas cítricas y frutales muy frescas, con un fondo amaderado y toques de caramelo y cuero que le dan muchísima elegancia.\n\n¿Te gustaría que te ayude a coordinar tu pedido?';
    await sendTextMessage(from, msg);
    return;
  }

  if (lower.includes('noche') || lower.includes('frio') || lower.includes('frío') || lower.includes('dulce') || lower.includes('cita') || lower.includes('fiesta')) {
    const msg = 'Si te gustan los aromas dulces y envolventes para la noche, Khamrah puede ser una buena opción ($155.000 COP). Si prefieres algo frutal, especiado y amaderado para una noche fresca, miraría Qaed Al Fursan ($150.000 COP). ¿Cuál de esos perfiles se acerca más a lo que buscas?';
    await sendTextMessage(from, msg);
    return;
  }

  if (lower.includes('catalogo') || lower.includes('catálogo') || lower.includes('perfumes') || lower.includes('fragancias') || lower.includes('precios')) {
    await sendFragranceCatalog(from);
    return;
  }

  if (lower.includes('asesor') || lower.includes('humano') || lower.includes('persona')) {
    await sendHumanAdvisorContact(from);
    return;
  }

  // Respuesta por defecto con el tono cálido de Auréstela
  const defaultMsg = 'Con mucho gusto te oriento. ¿Buscas una fragancia fresca y versátil para el día, o prefieres algo más dulce e intenso para la noche?';
  await sendTextMessage(from, defaultMsg);
}

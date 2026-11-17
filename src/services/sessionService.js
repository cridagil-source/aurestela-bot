import fs from 'fs';
import path from 'path';

// Almacén en memoria de conversaciones por número de teléfono
const sessions = new Map();

/**
 * Obtener la sesión activa de un cliente
 * @param {string} phone 
 */
export function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, {
      history: [],
      orderData: {},
      isCapturingOrder: false,
      lastInteraction: Date.now()
    });
  }
  const session = sessions.get(phone);
  session.lastInteraction = Date.now();
  return session;
}

/**
 * Agregar un turno de conversación (usuario o modelo)
 */
export function addMessageToHistory(phone, role, text) {
  const session = getSession(phone);
  session.history.push({ role, text });
  // Mantener los últimos 20 mensajes para evitar saturar el contexto
  if (session.history.length > 20) {
    session.history.splice(0, session.history.length - 20);
  }
}

/**
 * Obtener la fecha actual en formato Colombia DD/MM/AAAA
 */
export function getColombiaDate() {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return formatter.format(new Date());
}

/**
 * Guardar una ficha de pedido confirmada
 */
export function saveOrder(phone, orderSummary) {
  try {
    const dataDir = path.resolve('data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const ordersFile = path.join(dataDir, 'pedidos.json');
    let orders = [];
    if (fs.existsSync(ordersFile)) {
      orders = JSON.parse(fs.readFileSync(ordersFile, 'utf-8') || '[]');
    }

    orders.push({
      phone,
      fechaRegistro: new Date().toISOString(),
      resumen: orderSummary
    });

    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), 'utf-8');
    console.log(`[Pedidos] Nuevo pedido registrado para ${phone}`);
  } catch (err) {
    console.error('Error guardando pedido:', err);
  }
}


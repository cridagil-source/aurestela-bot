import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { verifyWebhook, handleWebhookEvent } from './controllers/webhookController.js';
import { getLeads } from './services/leadService.js';

const app = express();

// Middleware para procesar cuerpos JSON
app.use(express.json());

// Servir la página web del negocio (Landing Page y Políticas)
app.use(express.static('public'));

// Registro de peticiones entrantes para diagnóstico
app.use((req, res, next) => {
  console.log(`[HTTP] ${new Date().toLocaleTimeString()} -> ${req.method} ${req.url}`);
  next();
});

// Endpoint de salud / prueba en navegador
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>WhatsApp Sales Bot</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
        <h1>🚀 WhatsApp Sales Bot Activo</h1>
        <p>Servidor Node.js / Express funcionando correctamente.</p>
        <p>App ID: <code>${config.metaAppId}</code></p>
        <p>Endpoint del Webhook: <code>/webhook</code></p>
        <p><a href="/leads">📊 Ver Leads Registrados</a></p>
      </body>
    </html>
  `);
});

// Endpoint para consultar prospectos (leads) con panel visual HTML o JSON
app.get('/leads', (req, res) => {
  const leads = getLeads();

  // Si pide JSON explícitamente o es petición de API
  if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
    return res.json({
      total: leads.length,
      leads
    });
  }

  // Dashboard visual HTML
  const rows = leads.map((l) => {
    const cleanPhone = (l.phone || '').replace(/\D/g, '');
    const dateFormatted = l.lastInteraction ? new Date(l.lastInteraction).toLocaleString('es-ES') : '-';
    return `
      <tr>
        <td><strong>${l.name || 'Sin nombre'}</strong></td>
        <td><code>${l.phone}</code></td>
        <td><span class="badge">${l.interest || 'General'}</span></td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${l.lastMessage || '-'}</td>
        <td>${dateFormatted}</td>
        <td>
          <a class="wa-btn" href="https://wa.me/${cleanPhone}" target="_blank">
            💬 Abrir WhatsApp
          </a>
        </td>
      </tr>
    `;
  }).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Panel de Leads - ${config.businessName}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; margin: 0; padding: 24px; color: #1c1e21; }
          .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e4e6eb; padding-bottom: 16px; margin-bottom: 20px; }
          h1 { margin: 0; font-size: 24px; color: #075e54; }
          .count-badge { background: #25d366; color: white; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f7f8fa; text-align: left; padding: 12px; font-size: 13px; text-transform: uppercase; color: #65676b; border-bottom: 2px solid #ddd; }
          td { padding: 12px; border-bottom: 1px solid #e4e6eb; font-size: 14px; }
          tr:hover { background: #f9fbfd; }
          .badge { background: #e7f3ff; color: #1877f2; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; }
          .wa-btn { background: #25d366; color: white; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
          .wa-btn:hover { background: #1ebc59; }
          .empty { text-align: center; padding: 40px; color: #8a8d91; }
          .nav-links { margin-top: 20px; text-align: right; font-size: 13px; }
          .nav-links a { color: #1877f2; text-decoration: none; margin-left: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1>📊 Prospectos Registrados (Leads)</h1>
              <p style="margin: 4px 0 0 0; color: #65676b; font-size: 14px;">Negocio: <strong>${config.businessName}</strong></p>
            </div>
            <span class="count-badge">${leads.length} Prospectos</span>
          </div>

          ${leads.length === 0 ? `
            <div class="empty">
              <h3>Aún no hay prospectos registrados</h3>
              <p>Cuando un cliente escriba a tu WhatsApp o seleccione un producto, aparecerá aquí automáticamente con botón directo para chatear con él.</p>
            </div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Interés</th>
                  <th>Último Mensaje</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          `}

          <div class="nav-links">
            <a href="/leads?format=json" target="_blank">📥 Exportar JSON</a>
            <a href="/">🏠 Estado del Servidor</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Endpoint para consultar pedidos capturados
app.get('/pedidos', (req, res) => {
  try {
    const ordersFile = path.resolve('data/pedidos.json');
    const orders = fs.existsSync(ordersFile) ? JSON.parse(fs.readFileSync(ordersFile, 'utf-8') || '[]') : [];
    res.json({
      total: orders.length,
      pedidos: orders
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al leer pedidos' });
  }
});

// Endpoint de diagnóstico para verificar el estado de la IA y variables en Render
app.get('/diag', async (req, res) => {
  const geminiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    geminiKeyDetected: !!geminiKey,
    geminiKeyLength: geminiKey.length,
    geminiKeyPreview: geminiKey ? `${geminiKey.substring(0, 7)}...${geminiKey.slice(-4)}` : 'NINGUNA_DETECTADA',
    lastAiError: global.lastAiError || 'Ningún error registrado',
    lastAiSuccess: global.lastAiSuccess || 'Ninguna respuesta exitosa aún'
  });
});

// Endpoint para probar directamente la IA desde el navegador
app.get('/test-ai', async (req, res) => {
  try {
    const { getSalesAiResponse } = await import('./services/aiService.js');
    const result = await getSalesAiResponse({
      from: 'test_web',
      text: 'Hola, recomiéndame un perfume versátil para uso diario',
      userName: 'Cristian'
    });
    res.json({
      success: !!result,
      result: result || 'IA devolvió null',
      lastAiError: global.lastAiError || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Rutas de Webhook para WhatsApp Cloud API
app.get(['/webhook', '/webhook/'], verifyWebhook);
app.post(['/webhook', '/webhook/'], handleWebhookEvent);

// Iniciar servidor escuchando en todas las interfaces de red (0.0.0.0)
app.listen(config.port, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`🤖 WhatsApp Sales Bot está listo en puerto ${config.port}`);
  console.log(`📡 URL local del webhook: http://localhost:${config.port}/webhook`);
  console.log(`🔑 Verify Token configurado: "${config.webhookVerifyToken}"`);
  console.log(`=================================================`);

  // Auto-ping para mantener el servidor despierto 24/7 en Render (evita el "spin down" del plan gratuito)
  const serviceUrl = process.env.RENDER_EXTERNAL_URL || 'https://aurestela-bot.onrender.com';
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    console.log(`[Keep-Alive] Iniciando rutina anti-suspensión cada 10 minutos para ${serviceUrl}`);
    setInterval(async () => {
      try {
        const res = await fetch(serviceUrl);
        console.log(`[Keep-Alive] Ping preventivo enviado con éxito (Status: ${res.status})`);
      } catch (err) {
        console.warn(`[Keep-Alive] Error enviando ping:`, err.message);
      }
    }, 10 * 60 * 1000);
  }
});


import { GoogleGenAI } from '@google/genai';
import { getSession, addMessageToHistory, getColombiaDate, saveOrder } from './sessionService.js';

let aiClient = null;

function getClient() {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  if (!apiKey) {
    global.lastAiError = {
      error: 'NO_KEY',
      message: 'GEMINI_API_KEY no encontrada en process.env. La IA está inactiva.',
      timestamp: new Date().toISOString()
    };
    console.warn('[AI Service] ⚠️ GEMINI_API_KEY no encontrada en process.env. La IA está inactiva.');
    return null;
  }

  if (!aiClient) {
    console.log('[AI Service] 🚀 Inicializando cliente GoogleGenAI con v1beta...');
    aiClient = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: { apiVersion: 'v1beta' }
    });
  }
  return aiClient;
}

/**
 * Prompt del Asesor Virtual de AURÉSTELA PERFUMERÍA
 */
function buildSystemPrompt() {
  const fechaColombia = getColombiaDate();

  return `
# Prompt principal: bot de ventas de AURÉSTELA PERFUMERÍA

## Fecha actual en Colombia (America/Bogota)
Hoy es: ${fechaColombia}
Cuando generes una ficha de pedido, coloca en la primera línea exactamente:
**Fecha de compra:** ${fechaColombia}

## Rol y objetivo
Eres el asesor virtual de **AURÉSTELA PERFUMERÍA**, una tienda colombiana que distribuye y vende perfumes de distintas marcas. Atiendes por WhatsApp.

Tu objetivo es ayudar a cada persona a elegir una fragancia que encaje con sus gustos, el clima y la ocasión; responder con claridad y facilitar la compra. Eres cordial, atento y comercial, sin presionar ni inventar información.

Hablas en español colombiano natural. Puedes usar expresiones como “con mucho gusto”, “claro que sí”, “te cuento” y “de una” de vez en cuando. Mantén un tono cálido y elegante; evita exagerar el dialecto o usar “parce” y otros modismos en cada mensaje.

## Cómo conversar y vender con empatía humana
- Escribe mensajes breves, naturales y fáciles de leer en WhatsApp (máximo 2 a 3 oraciones por párrafo).
- Haz una sola pregunta a la vez. No abraces al cliente con un muro de texto.
- Si el cliente te responde con palabras cortas como "Versátil", "Para el día", "Dulce", "Noche" o "Fresco", NO vuelvas a preguntar lo mismo: toma su respuesta de inmediato y recomiéndale la fragancia ideal explicándole por qué le va a encantar y su precio en COP.
- Respeta el contexto previo: si ya sabes qué le gusta o para qué ocasión lo busca, no repitas preguntas innecesarias.
- Destaca la experiencia y sensación del aroma (por ejemplo: "es fresco y elegante para el día a día", o "es dulce y seductor para la noche").
- Termina siempre cada recomendación con una pregunta de cierre suave (soft close): "¿Te gustaría que te ayude a coordinar tu pedido?", "¿Te gustaría conocer las notas olfativas a fondo?", o "¿A qué ciudad te lo enviaríamos?".
- No asumas el género de la persona ni asignes género a una fragancia si el catálogo no lo especifica.
- Habla de Auréstela como tienda y distribuidora de perfumería fina. No digas que fabrica los perfumes ni que las fragancias son de marca propia.

## Catálogo disponible

### 1. Qaed Al Fursan de Lattafa — 100 ml
**Precio:** $150.000 COP
**Perfil olfativo:** frutal, especiado y amaderado.
- **Salida:** piña y azafrán.
- **Corazón:** abeto balsámico y jazmín.
- **Fondo:** cedro, ámbar y madera de oud.
**Cuándo recomendarlo:** tardes o noches frescas, y climas templados o fríos. En días muy cálidos, su piña y su fondo amaderado pueden sentirse intensos, así que conviene moderar las atomizaciones.
No afirmes que es unisex, original, de larga duración u otra característica que no esté indicada en la información disponible.

### 2. Armaf Eter Arabian Sky — 100 ml EDP
**Precio:** $358.000 COP
**Fragancia unisex.** Perfil aromático, cítrico, frutal y amaderado, con matices dulces y de cuero.
- **Salida:** pimienta, toronja o pomelo, aceite de naranja, piña, bergamota y limón.
- **Corazón:** lavanda, geranio, ylang-ylang y caramelo.
- **Fondo:** pachulí, vetiver, cedro, almizcle, cuero y ámbar.
**Cuándo recomendarlo:** para climas cálidos o templados; es una opción versátil para el día a día, la oficina, salidas casuales y planes al aire libre. El caramelo y el cuero también le dan un matiz apropiado para eventos nocturnos informales.
**Aplicación sugerida:** 2 a 3 atomizaciones durante el día; hasta 4 por la noche, según preferencia.

### 3. Khamrah de Lattafa — 100 ml
**Precio:** $155.000 COP
**Fragancia unisex y original.** Perfil dulce, cálido, especiado y envolvente, con un carácter gourmand que puede recordar a dátiles acaramelados, vainilla y praliné.
- **Salida:** canela, nuez moscada y bergamota.
- **Corazón:** dátiles, praliné, nardos o tuberosa y Mahonial.
- **Fondo:** vainilla, haba tonka, mirra, benjuí, madera de ámbar y Akigalawood.
**Cuándo recomendarlo:** noches frescas, climas fríos o templados, citas, eventos especiales, fiestas y reuniones formales. En calor o humedad alta puede sentirse demasiado dulce o pesado.

## Guía rápida para recomendar
- **Busca algo versátil para el día o clima cálido:** Armaf Eter Arabian Sky.
- **Le gustan la piña, las especias y las maderas para una tarde o noche fresca:** Qaed Al Fursan.
- **Prefiere aromas dulces, cálidos e intensos para la noche o el frío:** Khamrah.

Usa esta guía como orientación. Si la persona ya explicó qué le gusta y para qué ocasión busca el perfume, recomiéndale sin hacerle preguntas innecesarias.

## Reglas de precisión
- Respeta los nombres, tamaños, notas y precios del catálogo.
- Escribe los precios en pesos colombianos, por ejemplo: **$150.000 COP**.
- No inventes descuentos, existencias, duración exacta, envíos gratis, tiempos de entrega, medios de pago, cambios, garantías ni cobertura.
- Solo afirma que Khamrah es original, porque esa característica está indicada en el catálogo. No afirmes que los otros dos perfumes son originales si esa información no se ha confirmado.
- Presenta las notas y recomendaciones como una guía olfativa; los aromas pueden percibirse distinto en cada persona.
- Si preguntan algo que no aparece en el catálogo o depende de una política de la tienda, dilo con claridad y deriva la consulta a un asesor. No prometas una verificación o gestión si no puedes realizarla.

## Captura de pedidos
Inicia la captura de datos solo cuando la persona manifieste claramente que quiere comprar, por ejemplo: “lo quiero”, “quiero hacer el pedido” o “¿cómo lo pago?”. Una consulta de precio o una pregunta sobre el producto no significa por sí sola que quiera iniciar un pedido.

Solicita los datos **de uno en uno y en este orden**. Si el cliente ya proporcionó un dato, consérvalo y pregunta por el siguiente dato que falte:
1. **Nombre Completo**
2. **Teléfono**
3. **Correo**
4. **Producto que desea comprar el cliente**
5. **Dirección Completa con nomenclatura**
6. **Método de Pago**

Para el método de pago, ofrece estas opciones: **Transferencia bancaria, Efectivo, Nequi o Daviplata**.

No solicites la fecha al cliente. Añade automáticamente la fecha de compra al crear la ficha, en formato **DD/MM/AAAA** y según la fecha local de **Colombia (America/Bogota)**. Colócala en la primera línea, antes del nombre.

Al terminar la captura, organiza la ficha exactamente así:

**Fecha de compra:** ${fechaColombia}  
**Nombre Completo:**  
**Teléfono:**  
**Correo:**  
**Producto que desea comprar el cliente:**  
**Dirección Completa con nomenclatura:**  
**Método de Pago:**

No inventes datos ni dejes un dato faltante como si estuviera confirmado. Si el cliente no desea compartir un dato necesario para completar la solicitud, no lo presiones; explica que un asesor puede ayudarle con el proceso.

Informa al cliente que un asesor de Auréstela debe recibir y validar sus datos para confirmar el pedido.
No inventes existencias, costos o tiempos de envío, ni confirmes el pedido o el pago sin validación. No solicites datos de tarjetas ni información financiera sensible.
`;
}

/**
 * Procesa la conversación con IA de AURÉSTELA PERFUMERÍA
 */
export async function getSalesAiResponse({ from, text, audioBuffer, audioMimeType, userName }) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const session = getSession(from);

  try {
    // Construir el historial de mensajes formateado para Gemini
    const contents = [];

    // Agregar mensajes previos del historial
    for (const msg of session.history) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    // Agregar el mensaje actual del cliente
    const currentParts = [];
    if (audioBuffer && audioMimeType) {
      currentParts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: audioBuffer.toString('base64')
        }
      });
      currentParts.push({
        text: `[Nota de voz de ${userName || 'Cliente'}]`
      });
    } else if (text) {
      currentParts.push({ text });
    }

    // Asegurar que haya partes válidas
    if (currentParts.length === 0) {
      currentParts.push({ text: 'Hola' });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    // Sanitizar historial para asegurar que comience en 'user' y que los roles alternen siempre
    const sanitizedContents = [];
    for (const item of contents) {
      if (!item.parts || item.parts.length === 0) continue;
      if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === item.role) {
        sanitizedContents[sanitizedContents.length - 1].parts.push(...item.parts);
      } else {
        sanitizedContents.push({ role: item.role, parts: [...item.parts] });
      }
    }
    while (sanitizedContents.length > 0 && sanitizedContents[0].role !== 'user') {
      sanitizedContents.shift();
    }

    // Intentar con los modelos más estables y rápidos de Gemini en v1beta
    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro'
    ];
    let replyText = '';
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini AI] Intentando generar respuesta con modelo ${modelName}...`);
        const response = await client.models.generateContent({
          model: modelName,
          contents: sanitizedContents,
          config: {
            systemInstruction: buildSystemPrompt(),
            temperature: 0.65
          }
        });

        replyText = response.text?.trim() || '';
        if (replyText) {
          console.log(`[Gemini AI] Respuesta generada exitosamente con ${modelName}.`);
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini AI] Falló modelo ${modelName}:`, err.message);
      }
    }

    if (!replyText && lastError) {
      global.lastAiError = {
        error: 'GENERATE_FAILED',
        message: lastError.message,
        stack: lastError.stack,
        timestamp: new Date().toISOString()
      };
      console.error('[Gemini AI] No se pudo generar respuesta con ninguno de los modelos:', lastError.message);
      return null;
    }

    if (replyText) {
      global.lastAiSuccess = {
        replyPreview: replyText.substring(0, 100),
        timestamp: new Date().toISOString()
      };
      // Guardar en el historial de sesión
      addMessageToHistory(from, 'user', text || '[Nota de voz]');
      addMessageToHistory(from, 'model', replyText);

      // Si la respuesta contiene la ficha completa de compra, guardarla en pedidos.json
      if (replyText.includes('**Fecha de compra:**') && replyText.includes('**Método de Pago:**')) {
        saveOrder(from, replyText);
      }
    }

    return replyText;
  } catch (error) {
    global.lastAiError = {
      error: 'CRITICAL_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    console.error('Error generando respuesta con Gemini:', error.message);
    return null;
  }
}

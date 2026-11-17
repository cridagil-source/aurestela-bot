import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data');
const leadsFilePath = path.join(dataDir, 'leads.json');

// Asegurar que exista la carpeta data y el archivo leads.json
function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(leadsFilePath)) {
    fs.writeFileSync(leadsFilePath, JSON.stringify([], null, 2), 'utf-8');
  }
}

/**
 * Obtener la lista completa de prospectos (leads)
 */
export function getLeads() {
  try {
    ensureStorage();
    const data = fs.readFileSync(leadsFilePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error al leer leads:', error);
    return [];
  }
}

/**
 * Guardar o actualizar la información de un prospecto comercial
 */
export function saveLead({ phone, name, interest, message }) {
  try {
    ensureStorage();
    const leads = getLeads();
    const existingIndex = leads.findIndex((l) => l.phone === phone);

    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      // Actualizar lead existente
      leads[existingIndex].lastInteraction = now;
      leads[existingIndex].interactionCount = (leads[existingIndex].interactionCount || 1) + 1;
      if (name && name !== 'amigo(a)') leads[existingIndex].name = name;
      if (interest) leads[existingIndex].interest = interest;
      if (message) leads[existingIndex].lastMessage = message;
    } else {
      // Registrar nuevo lead
      leads.push({
        phone,
        name: name || 'Desconocido',
        interest: interest || 'Consulta General',
        lastMessage: message || '',
        status: 'NUEVO_PROSPECTO',
        createdAt: now,
        lastInteraction: now,
        interactionCount: 1
      });
    }

    fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');
    console.log(`[CRM] Lead registrado/actualizado: ${phone} (${name}) - Interés: ${interest || 'N/A'}`);
  } catch (error) {
    console.error('Error al guardar lead:', error);
  }
}


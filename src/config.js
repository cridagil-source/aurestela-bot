import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  metaAppId: process.env.META_APP_ID || '2378713672945922',
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'mi_token_secreto_ventas_123',
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '1331242046748065',
  businessName: process.env.BUSINESS_NAME || 'AURÉSTELA PERFUMERÍA',
  salesAdvisorPhone: process.env.SALES_ADVISOR_PHONE || '',
  graphApiVersion: 'v21.0'
};


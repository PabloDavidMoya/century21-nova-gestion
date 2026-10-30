/* Envío de emails transaccionales vía Brevo (mismo patrón que ya usa
   Pablo en otros proyectos: POST a /v3/smtp/email con la api-key). */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

async function enviarEmail({ to, nombre, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY no configurada: no se pudo enviar el email a', to);
    return false;
  }

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'Century 21 Nova',
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: to, name: nombre || to }],
    subject,
    htmlContent: html,
  };

  try {
    const r = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error('Brevo rechazó el email a', to, r.status, await r.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Falló la conexión con Brevo para', to, e.message);
    return false;
  }
}

module.exports = { enviarEmail };

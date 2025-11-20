const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) {
    console.warn('SMTP_HOST is not set. Email notifications are disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: false,
    auth:
      SMTP_USER && SMTP_PASS
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS
          }
        : undefined
  });

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || 'no-reply@example.com';
  const transporter = getTransporter();
  if (!transporter) return;

  const message = { from, to, subject, text, html };
  try {
    await transporter.sendMail(message);
  } catch (err) {
    console.error('Error sending mail:', err.message);
  }
}

function formatPoSummary(po) {
  const lines = [];
  lines.push(`PO Number: ${po.poNumber}`);
  lines.push(`Status: ${po.status}`);
  lines.push(
    `Requester: ${po.requesterName} (${po.requesterEmail || 'no email'})`
  );
  lines.push(`Division: ${po.division}`);
  lines.push(`Vendor: ${po.vendorName}`);
  lines.push(`Job Number: ${po.jobNumber || 'N/A'}`);
  lines.push(`Category: ${po.category || 'N/A'}`);
  lines.push(`Amount: ${po.amount}`);
  lines.push(`Description: ${po.description}`);
  if (po.attachmentOriginalName) {
    lines.push(`Attachment: ${po.attachmentOriginalName}`);
  }
  return lines.join('\n');
}

async function sendNewPoNotification(po) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  const subject = `[PO] New Request ${po.poNumber}`;
  const text = `A new PO request has been submitted.\n\n${formatPoSummary(po)}`;
  await sendMail({ to, subject, text });
}

async function sendStatusChangeNotification(po) {
  const recipients = [];
  if (process.env.NOTIFY_EMAIL) recipients.push(process.env.NOTIFY_EMAIL);
  if (po.requesterEmail) recipients.push(po.requesterEmail);

  if (recipients.length === 0) return;

  const subject = `[PO] ${po.status} - ${po.poNumber}`;
  const text = `The status of PO ${po.poNumber} has changed to ${po.status}.\n\n${formatPoSummary(
    po
  )}`;

  await sendMail({
    to: recipients.join(','),
    subject,
    text
  });
}

module.exports = {
  sendNewPoNotification,
  sendStatusChangeNotification
};

import nodemailer from 'nodemailer';

/**
 * Mail delivery. With SMTP configured, mail is sent for real. Without it:
 * - development/test: the message is printed to the server console (mode "console"),
 * - production: nothing is sent (mode "off") and callers report that honestly.
 */
export function createMailer(config, log = console) {
  const mode = config.mail.enabled ? 'smtp' : config.isProd ? 'off' : 'console';
  let transport;
  const outbox = []; // last messages in console mode (used by tests)

  async function send({ to, subject, text, html }) {
    if (mode === 'smtp') {
      transport ??= nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
      });
      await transport.sendMail({ from: config.mail.from, to, subject, text, html });
      return { delivered: true };
    }
    if (mode === 'console') {
      outbox.push({ to, subject, text });
      if (outbox.length > 50) outbox.shift();
      if (!config.isTest) log.info(`\n[mail:console] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
      return { delivered: false, logged: true };
    }
    return { delivered: false };
  }
  return { mode, send, outbox };
}

const shell = (title, body) => `<!doctype html><html><body style="margin:0;background:#090A0D;font-family:Inter,Segoe UI,Arial,sans-serif;color:#E7E9ED">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#17191F;border:1px solid #292C34;border-radius:16px"><tr><td style="padding:28px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#F07A82">Night Ops Scheduler</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#FFFFFF">${title}</h1>${body}
</td></tr></table></td></tr></table></body></html>`;

const button = (href, label) =>
  `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#A8323E;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${label}</a></p>`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const resetEmail = ({ name, link, minutes }) => ({
  subject: 'Reset your Night Ops Scheduler password',
  text: `Hi ${name},\n\nUse this link to choose a new password. It expires in ${minutes} minutes and works once:\n${link}\n\nIf you didn't ask for this, ignore this email — your password stays the same.`,
  html: shell('Reset your password', `<p style="color:#A8AEB8;line-height:1.6">Hi ${esc(name)}, use the button below to choose a new password. The link expires in ${minutes} minutes and works once.</p>${button(link, 'Choose a new password')}<p style="color:#8A909B;font-size:13px">If you didn't ask for this, ignore this email — your password stays the same.</p>`),
});

export const inviteEmail = ({ managerName, projectName, code, link }) => ({
  subject: `${managerName} invited you to "${projectName}" on Night Ops Scheduler`,
  text: `${managerName} invited you to join the project "${projectName}".\n\nOpen this link to join: ${link}\nOr enter the join code ${code} after signing in as a developer.`,
  html: shell(`Join “${esc(projectName)}”`, `<p style="color:#A8AEB8;line-height:1.6">${esc(managerName)} invited you to join this project as a developer.</p>${button(link, 'Join the project')}<p style="color:#8A909B;font-size:13px">Or sign in and enter the join code <strong style="font-family:monospace;letter-spacing:.2em;color:#fff">${code}</strong>.</p>`),
});

/** Provisioning notifications: admin welcome (Company ID + temp password) and
 *  per-employee invitations (set-password link). */
import { sendEmail } from "./send";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export async function sendAdminWelcome(args: {
  to: string;
  legalName: string;
  companyCode: string;
  adminEmail: string;
  tempPassword: string;
  loginUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2>Selamat datang di Abecca</h2>
      <p>Akun untuk <strong>${esc(args.legalName)}</strong> telah aktif. Bagikan <strong>Company ID</strong> berikut ke seluruh karyawan untuk login.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 12px;color:#666">Company ID</td><td style="padding:6px 12px;font-family:monospace;font-size:18px"><strong>${esc(args.companyCode)}</strong></td></tr>
        <tr><td style="padding:6px 12px;color:#666">Email admin</td><td style="padding:6px 12px">${esc(args.adminEmail)}</td></tr>
        <tr><td style="padding:6px 12px;color:#666">Password sementara</td><td style="padding:6px 12px;font-family:monospace"><strong>${esc(args.tempPassword)}</strong></td></tr>
      </table>
      <p>Masuk di <a href="${esc(args.loginUrl)}">${esc(args.loginUrl)}</a> lalu segera ganti password Anda.</p>
    </div>`;
  await sendEmail({
    to: args.to,
    subject: `Abecca — Company ID ${args.companyCode}`,
    html,
    text: `Company ID: ${args.companyCode}\nEmail admin: ${args.adminEmail}\nPassword sementara: ${args.tempPassword}\nMasuk: ${args.loginUrl}`,
  });
}

export async function sendEmployeeInvite(args: {
  to: string;
  fullName: string;
  legalName: string;
  companyCode: string;
  inviteUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2>Undangan akun Abecca</h2>
      <p>Halo ${esc(args.fullName)}, Anda diundang untuk mengakses <strong>${esc(args.legalName)}</strong> di Abecca.</p>
      <p>Company ID: <strong style="font-family:monospace">${esc(args.companyCode)}</strong></p>
      <p><a href="${esc(args.inviteUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Setel password Anda</a></p>
      <p style="color:#666;font-size:13px">Tautan berlaku 7 hari. Setelah menyetel password, login dengan Company ID + email + password Anda.</p>
    </div>`;
  await sendEmail({
    to: args.to,
    subject: `Undangan Abecca — ${args.legalName}`,
    html,
    text: `Setel password Anda: ${args.inviteUrl}\nCompany ID: ${args.companyCode}`,
  });
}

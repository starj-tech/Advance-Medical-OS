/**
 * Provision a tenant and send the resulting notifications (admin welcome +
 * employee invites). Used by both the mock-checkout path and the Stripe webhook
 * so provisioning behaves identically. Email failures never fail provisioning.
 */
import { registerCompany, type RegisterInput, type RegisterResult } from "../auth/store";
import { sendAdminWelcome, sendEmployeeInvite } from "../email/notify";

export async function provisionAndNotify(
  input: RegisterInput,
  origin: string,
): Promise<RegisterResult> {
  const result = await registerCompany(input);
  try {
    await sendAdminWelcome({
      to: input.admin.email,
      legalName: result.company.legalName,
      companyCode: result.company.companyCode,
      adminEmail: input.admin.email,
      tempPassword: result.adminTempPassword,
      loginUrl: `${origin}/login`,
    });
    for (const invite of result.invites) {
      await sendEmployeeInvite({
        to: invite.email,
        fullName: invite.fullName,
        legalName: result.company.legalName,
        companyCode: result.company.companyCode,
        inviteUrl: `${origin}/set-password?token=${invite.token}`,
      });
    }
  } catch (e) {
    console.error("[provision] notification failed (provisioning still succeeded)", e);
  }
  return result;
}

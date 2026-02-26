import { respData, respErr } from "@/shared/lib/resp";
import { getUserInfo } from "@/shared/models/user";
import { getEmailService } from "@/shared/services/email";
import { envConfigs } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, message } = await req.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return respErr("Message is required");
    }

    const user = await getUserInfo();
    const senderEmail = user?.email || email;

    if (!senderEmail) {
      return respErr("Email is required");
    }

    const supportEmail = envConfigs.refund_email;
    if (!supportEmail) {
      console.error("[Contact] No support email configured");
      return respErr("Contact service is not configured");
    }

    const emailService = await getEmailService();

    await emailService.sendEmail({
      to: supportEmail,
      subject: `Contact Form - ${senderEmail}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>From:</strong> ${senderEmail}</p>
        ${user ? `<p><strong>User:</strong> ${user.name || "N/A"} (${user.id})</p>` : "<p><strong>User:</strong> Anonymous</p>"}
        <hr />
        <p>${message.replace(/\n/g, "<br />")}</p>
      `,
      text: `From: ${senderEmail}\n\n${message}`,
      replyTo: senderEmail,
    });

    return respData({ message: "success" });
  } catch (error) {
    console.error("[Contact] Error:", error);
    return respErr("Failed to send message");
  }
}

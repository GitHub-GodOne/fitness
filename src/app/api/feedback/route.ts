import { generateId } from "ai";

import { respData, respErr } from "@/shared/lib/resp";
import { getUserInfo } from "@/shared/models/user";
import {
  createSupportChatMessage,
  SupportChatMessageStatus,
  SupportChatMessageType,
} from "@/shared/models/support_chat_message";
import { getEmailService } from "@/shared/services/email";
import { getAllConfigs } from "@/shared/models/config";

export async function POST(req: Request) {
  try {
    const { content, email } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return respErr("content is required");
    }

    // Try to get logged-in user (optional)
    let userId = "";
    let userEmail = "";
    try {
      const user = await getUserInfo();
      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    } catch {
      // Not logged in, that's fine
    }

    // Anonymous users must provide email
    if (!userId && (!email || typeof email !== "string" || !email.includes("@"))) {
      return respErr("email is required");
    }

    const feedbackEmail = userId ? userEmail : email.trim();
    const messageContent = `[Feedback] From: ${feedbackEmail}\n\n${content.trim()}`;

    const message = await createSupportChatMessage({
      id: generateId().toLowerCase(),
      userId: userId || "anonymous",
      content: messageContent,
      type: SupportChatMessageType.USER,
      status: SupportChatMessageStatus.ACTIVE,
      read: false,
    });

    // Send feedback email notification
    try {
      const configs = await getAllConfigs();
      const recipientEmail = configs.resend_sender_email;
      if (recipientEmail) {
        const emailService = await getEmailService(configs);
        await emailService.sendEmail({
          to: recipientEmail,
          subject: `[Feedback] From ${feedbackEmail}`,
          text: content.trim(),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">New Feedback</h2>
              <p><strong>From:</strong> ${feedbackEmail}</p>
              <p><strong>User ID:</strong> ${userId || "anonymous"}</p>
              <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-top: 12px;">
                <p style="white-space: pre-wrap;">${content.trim()}</p>
              </div>
            </div>
          `,
          replyTo: feedbackEmail,
        });
      }
    } catch (emailError) {
      console.error("[Feedback] Failed to send email notification:", emailError);
    }

    return respData({ id: message.id });
  } catch (error: any) {
    console.error("Failed to submit feedback:", error);
    return respErr(error.message || "Failed to submit feedback");
  }
}

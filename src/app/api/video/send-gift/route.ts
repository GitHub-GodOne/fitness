import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuth } from "@/core/auth";
import { db } from "@/core/db";
import { aiTask, user } from "@/config/db/schema";
import { getEmailService } from "@/shared/services/email";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/video/send-gift
 * 
 * Send a video as a gift to a recipient via email
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { taskId, recipientEmail, message, videoUrl } = body;

    // Validate required fields
    if (!taskId || !recipientEmail || !videoUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Verify the task belongs to the current user
    const [task] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, taskId));

    if (!task || task.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // Get user info for the sender name
    const [userData] = await db()
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, session.user.id));

    const senderName = userData?.name || userData?.email || "Someone";

    // Get email service
    const emailService = await getEmailService();
    if (!emailService) {
      console.error('[Gift] Email service not available');
      return NextResponse.json(
        { error: "Email service is not available. Please try again later." },
        { status: 500 }
      );
    }

    // Prepare email content
    const emailSubject = `${senderName} sent you a blessing from Fear Not 🕊️`;
    const previewText = task.prompt?.slice(0, 100) || "A personalized Bible verse video";

    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${emailSubject}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
      .header .dove { font-size: 48px; margin-bottom: 10px; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; color: #1a1a2e; margin-bottom: 20px; }
      .message-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .message-box p { margin: 0; color: #92400e; font-style: italic; }
      .video-section { text-align: center; margin: 30px 0; }
      .video-link { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; }
      .video-link:hover { opacity: 0.9; }
      .verse { background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; }
      .verse p { margin: 0; color: #4b5563; font-size: 14px; }
      .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
      .footer p { margin: 0; color: #6b7280; font-size: 12px; }
      .sender-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      .sender-info p { color: #6b7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="dove">🕊️</div>
        <h1>A Blessing from Fear Not</h1>
      </div>
      <div class="content">
        <p class="greeting">Hello there,</p>
        <p><strong>${senderName}</strong> has thoughtfully sent you a personalized Bible verse video as a gift! 🎁</p>
        
        ${message ? `
        <div class="message-box">
          <p>"${message}"</p>
          <p style="text-align: right; margin-top: 10px; font-size: 12px;">— ${senderName}</p>
        </div>
        ` : ''}
        
        <div class="video-section">
          <a href="${videoUrl}" class="video-link" target="_blank">Watch Your Blessing 📺</a>
        </div>
        
        <div class="verse">
          <p>💝 "${previewText}"</p>
        </div>
        
        <div class="sender-info">
          <p>This beautiful video was created with 💜 by Fear Not - an AI-powered Bible comfort video generator that brings peace, warmth, and spiritual comfort to hearts around the world.</p>
        </div>
      </div>
      <div class="footer">
        <p>🙏 May God's peace be with you always</p>
        <p style="margin-top: 10px;"><a href="https://fearnotforiamwithyou.com" style="color: #667eea; text-decoration: none;">fearnotforiamwithyou.com</a></p>
      </div>
    </div>
  </body>
</html>
    `.trim();

    const emailText = `
A Blessing from Fear Not 🕊️

Hello there,

${senderName} has thoughtfully sent you a personalized Bible verse video as a gift!

${message ? `They also wanted to share this message with you:
"${message}"
` : ''}

Watch your blessing here:
${videoUrl}

💝 "${previewText}"

This beautiful video was created with 💜 by Fear Not - an AI-powered Bible comfort video generator.

🙏 May God's peace be with you always

fearnotforiamwithyou.com
    `.trim();

    // Send email
    const emailResult = await emailService.sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    if (!emailResult.success) {
      console.error('[Gift] Failed to send gift email:', emailResult.error);
      return NextResponse.json(
        { error: "Failed to send gift email. Please try again." },
        { status: 500 }
      );
    }

    // Log the gift sending for analytics
    console.log(`[Gift] Gift sent successfully: ${session.user.id} -> ${recipientEmail}, task: ${taskId}, messageId: ${emailResult.messageId}`);

    return NextResponse.json({
      success: true,
      message: "Gift sent successfully",
    });
  } catch (error) {
    console.error("Error sending gift:", error);
    return NextResponse.json(
      { error: "Failed to send gift" },
      { status: 500 }
    );
  }
}

import { NextRequest } from 'next/server';

import { envConfigs } from '@/config';
import { respData, respErr } from '@/shared/lib/resp';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { createRefundRequest } from '@/shared/models/refund-request';
import { RefundRequestStatus } from '@/shared/types/refund';
import { getEmailService } from '@/shared/services/email';

/**
 * Refund Request API
 * 
 * Handles refund requests by:
 * 1. Validating user authentication
 * 2. Checking user has more than 3 credits
 * 3. Sending refund request email to configured refund email
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const { reason, account, creditsAmount, description } = await req.json();

        // Validate required fields
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            return respErr('Refund reason is required', 400);
        }

        if (!account || typeof account !== 'string' || account.trim().length === 0) {
            return respErr('Account information is required', 400);
        }

        if (!creditsAmount || typeof creditsAmount !== 'number' || creditsAmount <= 0) {
            return respErr('Valid credits amount is required', 400);
        }

        // Check user has more than 3 credits
        const remainingCredits = await getRemainingCredits(user.id);
        if (remainingCredits <= 3) {
            return respErr('You must have more than 3 credits to request a refund', 400);
        }

        // Check refund email is configured
        const refundEmail = envConfigs.refund_email;
        console.log('refundEmail----------->', refundEmail);
        if (!refundEmail || refundEmail.trim().length === 0) {
            console.error('[Refund] Refund email not configured in REFUND_EMAIL environment variable');
            return respErr('Refund service is not configured. Please contact support.', 500);
        }

        // Get email service
        const emailService = await getEmailService();
        if (!emailService) {
            console.error('[Refund] Email service not available');
            return respErr('Email service is not available. Please contact support.', 500);
        }

        // Prepare email content
        const emailSubject = `Refund Request - ${user.email}`;
        const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background-color: #ffffff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; margin-bottom: 5px; }
            .value { color: #333; padding: 8px; background-color: #f8f9fa; border-radius: 4px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Refund Request</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">User Email:</div>
                <div class="value">${user.email}</div>
              </div>
              <div class="field">
                <div class="label">User Name:</div>
                <div class="value">${user.name || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="label">User ID:</div>
                <div class="value">${user.id}</div>
              </div>
              <div class="field">
                <div class="label">Current Credits:</div>
                <div class="value">${remainingCredits}</div>
              </div>
              <div class="field">
                <div class="label">Refund Reason:</div>
                <div class="value">${reason.replace(/\n/g, '<br>')}</div>
              </div>
              <div class="field">
                <div class="label">Account Information:</div>
                <div class="value">${account.replace(/\n/g, '<br>')}</div>
              </div>
              <div class="field">
                <div class="label">Requested Credits Amount:</div>
                <div class="value">${creditsAmount}</div>
              </div>
              ${description ? `
              <div class="field">
                <div class="label">Additional Description:</div>
                <div class="value">${description.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="label">Request Time:</div>
                <div class="value">${new Date().toISOString()}</div>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated refund request email. Please review and process accordingly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        const emailText = `
Refund Request

User Email: ${user.email}
User Name: ${user.name || 'N/A'}
User ID: ${user.id}
Current Credits: ${remainingCredits}

Refund Reason:
${reason}

Account Information:
${account}

Requested Credits Amount: ${creditsAmount}

${description ? `Additional Description:\n${description}\n` : ''}

Request Time: ${new Date().toISOString()}
    `.trim();

        // Save refund request to database
        const refundRequest = await createRefundRequest({
            userId: user.id,
            userEmail: user.email,
            userName: user.name || null,
            reason,
            account,
            requestedCreditsAmount: creditsAmount,
            approvedCreditsAmount: null, // Will be set by admin
            description: description || null,
            status: RefundRequestStatus.PENDING,
            remainingCredits,
            adminNotes: null,
            processedAt: null,
            processedBy: null,
        });

        // Send email
        const emailResult = await emailService.sendEmail({
            to: refundEmail,
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
            replyTo: user.email,
        });

        if (!emailResult.success) {
            console.error('[Refund] Failed to send refund email:', emailResult.error);
            // Still return success since request is saved to database
            console.warn('[Refund] Refund request saved but email failed:', refundRequest.id);
        }

        console.log('[Refund] Refund request created successfully:', {
            requestId: refundRequest.id,
            userId: user.id,
            userEmail: user.email,
            creditsAmount,
            messageId: emailResult.messageId,
        });

        return respData({
            message: 'Refund request submitted successfully. We will process your request and contact you via email.',
            requestId: refundRequest.id,
            messageId: emailResult.messageId,
        });
    } catch (e: any) {
        console.error('[Refund] Failed to process refund request:', e);
        return respErr(e.message || 'Failed to process refund request', 500);
    }
}

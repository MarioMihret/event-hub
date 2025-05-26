// utils/notifications.ts
import { sendEmail } from './email';

async function sendStatusUpdateEmail(application: any) {
    const statusMessages = {
      accepted: 'Congratulations! Your organizer application has been accepted.',
      rejected: 'Thank you for your interest. Unfortunately, your organizer application was not accepted at this time.'
    };
  
    const subject = `Organizer Application Status Update`;
    const text = `
      Dear ${application.fullName},

      ${statusMessages[application.status as keyof typeof statusMessages]}
      
      ${application.adminFeedback ? `\nFeedback: ${application.adminFeedback}` : ''}
      
      Best regards,
      The Admin Team
    `;

    // Call sendEmail and handle the result
    const emailResult = await sendEmail({
      to: application.email,
      subject: subject,
      text: text
    });

    if (emailResult.success) {
      console.log(`Status update email sent successfully to ${application.email}`);
    } else {
      console.error(`Failed to send status update email to ${application.email}: ${emailResult.error}`);
      // Potentially add further error handling here, like queuing the email for a retry
      // or alerting an admin, depending on application requirements.
    }
  }

export { sendStatusUpdateEmail };
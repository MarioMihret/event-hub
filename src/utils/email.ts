import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    console.error('Email Service Misconfiguration: SMTP environment variables are not fully set.');
    return { success: false, error: 'Email service is misconfigured. Please contact support.' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html: html || text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to} with subject "${subject}"`);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to send email to ${to} with subject "${subject}":`, error);
    return {
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'Failed to send email. Please try again later or contact support.'
        : `Failed to send email: ${error.message}`
    };
  }
} 
import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Generate a 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using Twilio
export const sendSMS = (phoneNumber, message) => {
    const accountSid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    client.messages
        .create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER, // Ensure the correct environment variable name
            to: phoneNumber, // Corrected from 'phoneNumber' to 'to' for Twilio API compatibility
        })
        .then((message) => console.log('Message sent:', message.sid))
        .catch((error) => console.error('Error sending SMS:', error.message));
    };


// Send Email using Nodemailer
export const sendEmail = (to, subject, text) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
    });
};

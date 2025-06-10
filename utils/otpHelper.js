import twilio from "twilio";
import nodemailer from "nodemailer";
import axios from "axios";


// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using Twilio
export const sendSMS = async(phoneNumber, message) => {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  try {
  await client.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
    to: `whatsapp:${phoneNumber}`,
  });
  console.log("Message sent via WhatsApp");
} catch (err) {
  console.error("WhatsApp failed:", err.message);
  // Fallback to SMS
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
  console.log("Message sent via SMS");
}

}
// Send Email using Nodemailer
export const sendEmail = (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
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

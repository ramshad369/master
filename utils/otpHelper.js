import twilio from "twilio";
import nodemailer from "nodemailer";
import axios from "axios";


// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using Twilio
export const sendSMS = async(phoneNumber, message) => {
  var config = {
    method: "get",
    url: `https://api.p.2chat.io/open/whatsapp/check-number/+917736461819/${phoneNumber}`,
    headers: {
      "X-User-API-Key": "UAK38ecf411-50f4-4be6-aec2-54a0d8c50c0e",
    },
  };
  const response = await axios(config);
  const isOnWhatsApp = response.data;
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  let messageSent;


  if (isOnWhatsApp.on_whatsapp) {
    console.log(`Sending message via WhatsApp to ${phoneNumber}`);
    messageSent = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`, // Add 'whatsapp:' prefix to the Twilio number
      to: `whatsapp:${phoneNumber}`, // Add 'whatsapp:' prefix to the recipient phone number
    }).then((message) => console.log("Whatsapp Message sent:", message.sid))
    .catch((error) => console.error("Whatsapp Error sending SMS:", error.message));
  } else {
    // Send message via SMS
    console.log(`Sending message via SMS to ${phoneNumber}`);
    messageSent = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER, // Normal SMS, no 'whatsapp:' prefix
      to: phoneNumber, // Normal phone number for SMS
    }).then((message) => console.log("Message sent:", message.sid))
    .catch((error) => console.error("Error sending SMS:", error.message));
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

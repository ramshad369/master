import twilio from "twilio";
import nodemailer from "nodemailer";
import axios from "axios";


// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using Twilio
export const sendSMS = (phoneNumber, message) => {
  var config = {
    method: "get",
    url: `https://api.p.2chat.io/open/whatsapp/check-number/+917736461819/${phoneNumber}`,
    headers: {
      "X-User-API-Key": "UAK38ecf411-50f4-4be6-aec2-54a0d8c50c0e",
    },
  };
  const isOnWhatsApp= {}
  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
      isOnWhatsApp = response.data;
    })
    .catch(function (error) {
      console.log(error);
    });
  
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  client.messages
    .create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER, // Ensure the correct environment variable name
      to: phoneNumber, // Corrected from 'phoneNumber' to 'to' for Twilio API compatibility
    })
    .then((message) => console.log("Message sent:", message.sid))
    .catch((error) => console.error("Error sending SMS:", error.message));
};

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

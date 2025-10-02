// index.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs } from "firebase/firestore";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
  apiKey: "AIzaSyDu4QJFLBHU2PSNiPIKpncPPZPM4p2-76U",
  authDomain: "efacility-trading.firebaseapp.com",
  projectId: "efacility-trading",
  storageBucket: "efacility-trading.firebasestorage.app",
  messagingSenderId: "983620967589",
  appId: "1:983620967589:web:bfdeab74d8d7f61516414c",
  measurementId: "G-VGTCJZ2JH4"
  privatekey:e7fddb05b1d9fc5d7c8fa9490744c2eda83e58f2
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
e7fddb05b1d9fc5d7c8fa9490744c2eda83e58f2
// ========== HARDCODED WHATSAPP GROUPS ==========
let whatsappLinks = {
  forex: "https://chat.whatsapp.com/EMxixrh4dQd5aDe3aaZ1Yx",
  crypto: "https://chat.whatsapp.com/BbJiiGSvWwMACQLaBqn1lY",
  stocks: "https://chat.whatsapp.com/JW6QD4pBxos1QlNcq8J4jG",
  indices: "https://chat.whatsapp.com/E7i5ulbaDOK1HCCmx1jF4O"
};

// ========== STUDENT ADMISSION ==========
app.post("/admission", async (req, res) => {
  try {
    const { fullname, dob, nin, email, phone, country, state, address, disability, health, course } = req.body;
    const studentRef = doc(db, "students", email);
    await setDoc(studentRef, {
      fullname, dob, nin, email, phone, country, state, address,
      disability, health, course,
      admissionStatus: "pending",
      tuitionStatus: "unpaid",
      createdAt: new Date().toISOString()
    });
    res.json({ message: "Admission form submitted, check back in 12 hours." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ACCEPT / DECLINE ADMISSION ==========
app.post("/admission/accept", async (req, res) => {
  const { email } = req.body;
  const ref = doc(db, "students", email);
  const snap = await getDoc(ref);
  if (!snap.exists()) return res.status(404).json({ error: "Student not found" });

  await updateDoc(ref, { admissionStatus: "accepted" });
  res.json({ message: "Admission accepted. Proceed to tuition payment." });
});

app.post("/admission/decline", async (req, res) => {
  const { email } = req.body;
  const ref = doc(db, "students", email);
  await updateDoc(ref, { admissionStatus: "declined" });
  res.json({ message: "Admission declined. You have been exited." });
});

// ========== PAYSTACK PAYMENT ==========
app.post("/pay", async (req, res) => {
  try {
    const { email, amount } = req.body;
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      { email, amount: amount * 100, callback_url: "https://efacility.trading.com/payment/callback" },
      { headers: { Authorization: `Bearer ${process.sk_live_9ebd077c174717cdf56781773b73cf976c4b9eb1}` } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PAYSTACK WEBHOOK ==========
app.post("/webhook", async (req, res) => {
  const event = req.body;
  if (event.event === "charge.success") {
    const email = event.data.customer.email;
    const ref = doc(db, "students", email);
    await updateDoc(ref, { tuitionStatus: "paid", lastPayment: new Date().toISOString() });

    // Assign WhatsApp link + ePin
    const student = (await getDoc(ref)).data();
    const epin = Math.random().toString(36).substring(2, 10).toUpperCase();
    await updateDoc(ref, { epin, whatsappLink: whatsappLinks[student.course] });
  }
  res.sendStatus(200);
});

// ========== ADMIN: MANAGE WHATSAPP LINKS ==========
app.post("/admin/whatsapp", async (req, res) => {
  const { course, link, email, password } = req.body;
  if (email !== "ebubechichukwu8@gmail.com" || password !== "Ebube@123")
    return res.status(403).json({ error: "Unauthorized" });

  whatsappLinks[course] = link;
  res.json({ message: `WhatsApp link for ${course} updated.` });
});

// ========== CLAIM FREE $7 ==========
app.post("/claim-bonus", async (req, res) => {
  const { email, accountNumber, bank } = req.body;
  const ref = doc(db, "students", email);
  const snap = await getDoc(ref);
  if (!snap.exists()) return res.status(404).json({ error: "Student not found" });

  const student = snap.data();
  const created = new Date(student.createdAt);
  const now = new Date();
  const diff = (now - created) / (1000 * 60 * 60 * 24);

  if (diff < 90) return res.json({ message: "Bonus available after 3 months." });

  await updateDoc(ref, { bonusClaimed: true, accountNumber, bank });
  res.json({ message: "Your $7 capital will be processed in 3 working days." });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // or "payment" for one-time
      line_items: [
        {
          price: "price_1R9zuNCm9YpuNQ14dqbsNt7m", // ← 用你的 Stripe 价格ID（或写 product + unit_amount）
          quantity: 1,
        },
      ],
      customer_email: "capsfly7@gmail.com", // 可选
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout error", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

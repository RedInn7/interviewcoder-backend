import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/checkout", async (req, res) => {
  const { email, plan } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // or "payment" for one-time
      line_items: [
        {
          price: plan==='monthly'?process.env.MONTHLY_PRICE_ID:process.env.YEARLY_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
      metadata: {
        email: email,
        plan:plan,
        preferred_language:"python",
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout error", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from "express"
import Stripe from "stripe"
import dotenv from "dotenv"

dotenv.config()

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

router.post("/create-intent",  async (req, res) => {
  const { amount, currency } = req.body

  // 字段校验
  if (!amount || typeof amount !== "number") {
    return res.status(400).json({ error: "Missing or invalid 'amount'" })
  }

  if (!currency || typeof currency !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'currency'" })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card"]
    })

    return res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error("Error creating PaymentIntent:", err)
    return res.status(500).json({ error: err.message })
  }
})

export default router

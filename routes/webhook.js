import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Stripe 推荐用原始body
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  console.log("webhook received");
  const sig = req.headers["stripe-signature"];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.metadata.email;
    const plan = session.metadata.plan;
    
    const stripe_customer_id = session.customer;
    const stripe_subscription_id = session.subscription;
    const now = new Date();
    
    const monthTime=30 * 24 * 60 * 60 * 1000;
    const yearTime=365 * 24 * 60 * 60 * 1000;
    const endsAt = new Date(now.getTime() + (plan==="annual"?yearTime:monthTime)); // 30天后
    const addCredits=(plan==="annual"?600:50);
    // 查找是否已有订阅记录
    const { data: existing, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('查找订阅记录失败', findError);
      return res.status(500).json({ error: '数据库错误' });
    }

    if (existing) {
      // 已有记录，更新
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          credits: existing.credits + addCredits,
          subscribed_at: now.toISOString(),
          subscription_ends_at: endsAt.toISOString(),
          stripe_customer_id,
          stripe_subscription_id
        })
        .eq('id', existing.id);
      if (updateError) {
        console.error('更新订阅失败', updateError);
        return res.status(500).json({ error: '更新失败' });
      }
    } else {
      // 没有记录，插入
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert([
          {
            email:email,
            preferred_language:"python",
            credits: addCredits,
            subscribed_at: now.toISOString(),
            subscription_ends_at: endsAt.toISOString(),
            stripe_customer_id,
            stripe_subscription_id
          }
        ]);
      if (insertError) {
        console.error('插入订阅失败', insertError);
        return res.status(500).json({ error: '插入失败' });
      }
    }
    console.log(`✅ User ${email} subscribed, ${addCredits} credits granted.`);
  }

  res.json({ received: true });
});

export default router; 
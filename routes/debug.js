import express from "express"
import { requireAuth } from "../middleware/auth.js"
import { supabase } from "../utils/supabase.js"
import { debugSolution } from "../utils/openai.js"

const router = express.Router()

router.post("/debug", requireAuth, async (req, res) => {
  const user = req.user
  const { imageDataList, problemInfo, language } = req.body

  if (!Array.isArray(imageDataList) || !problemInfo || !language)
    return res.status(400).json({ error: "Missing required fields" })

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!subscription || subscription.credits < 1)
    return res.status(403).json({ error: "API Key out of credits" })

  try {
    const result = await debugSolution(imageDataList, problemInfo, language)

    await supabase
      .from("subscriptions")
      .update({ credits: subscription.credits - 1 })
      .eq("user_id", user.id)

    return res.json(result)
  } catch (err) {
    console.error("Error in debug:", err)
    return res.status(500).json({ error: err.message })
  }
})

export default router

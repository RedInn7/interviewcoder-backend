import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "No token provided" })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return res.status(401).json({ error: "Invalid token" })

  req.user = data.user
  next()
}

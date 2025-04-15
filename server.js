import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import extractRouter from "./routes/extract.js"
import generateRouter from "./routes/generate.js"
import debugRouter from "./routes/debug.js"
import paymentRoutes from "./routes/payment.js"
import checkoutRouter from "./routes/checkout.js"
import authRouter from "./routes/auth.js"

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: "10mb" }))

app.use("/api", extractRouter)
app.use("/api", generateRouter)
app.use("/api", debugRouter)
app.use("/api", paymentRoutes)
app.use("/api", checkoutRouter)
app.use("/api", authRouter)

app.listen(3001, () => {
  console.log("✅ Backend running on http://localhost:3001")
})

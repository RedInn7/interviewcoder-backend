import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import extractRouter from "./routes/extract.js"
import generateRouter from "./routes/generate.js"
import debugRouter from "./routes/debug.js"
import paymentRoutes from "./routes/payment.js"
import checkoutRouter from "./routes/checkout.js"
import authRouter from "./routes/auth.js"
import webhookRouter from "./routes/webhook.js"
dotenv.config()

const app = express()

app.use(cors({
  origin: 'https://crackcodeinterview.io', // 只允许这个前端来源
  credentials: true,                      // 如果你要发送 cookie 或认证信息
}))

// 首先注册 webhook 路由，因为它需要原始请求体
app.use("/api/webhook", webhookRouter)


app.use(express.json({ limit: "10mb" }))

// 最后注册其他路由
app.use("/api", extractRouter)
app.use("/api", generateRouter)
app.use("/api", debugRouter)
app.use("/api", paymentRoutes)
app.use("/api", checkoutRouter)
app.use("/api", authRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`)
})

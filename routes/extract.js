import express from "express"
import { requireAuth } from "../middleware/auth.js"
import { extractProblemFromImage } from "../utils/openai.js"

const router = express.Router()

router.post("/extract", requireAuth, async (req, res) => {
  const { imageDataList, language } = req.body
  console.log("extract trigger")
  // 验证输入参数
  if (!Array.isArray(imageDataList) || !language) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  // 验证每个图片的 base64 格式
  for (const base64String of imageDataList) {
    if (!isValidBase64(base64String)) {
      return res.status(400).json({ error: "Invalid image format. Must be base64 encoded string" })
    }
  }

  try {
    const extractedData = await extractProblemFromImage(imageDataList, language)
    return res.json(extractedData)
  } catch (err) {
    console.error("Error in extract:", err)
    return res.status(500).json({ error: err.message })
  }
})

// 辅助函数：验证 base64 字符串
function isValidBase64(str) {
  if (typeof str !== 'string') return false
  
  // 检查是否是标准的 Data URL 格式
  if (str.startsWith('data:image/')) {
    const base64Data = str.split(',')[1]
    if (!base64Data) return false
    str = base64Data
  }
  
  // 验证 base64 字符串格式
  try {
    return btoa(atob(str)) === str
  } catch (err) {
    return false
  }
}

export default router

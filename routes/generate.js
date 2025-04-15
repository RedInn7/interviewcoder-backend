import express from "express"
import { requireAuth } from "../middleware/auth.js"
import { generateSolution } from "../utils/openai.js"

const router = express.Router()

router.post("/generate", requireAuth, async (req, res) => {
  // Validate required fields
  const requiredFields = [
    'problem_statement',
    'input_format',
    'output_format',
    'complexity',
    'test_cases',
    'validation_type',
    'difficulty',
    'language'
  ]

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }

  // Validate nested objects
  if (!req.body.input_format.description || !Array.isArray(req.body.input_format.parameters)) {
    return res.status(400).json({ error: "Invalid input_format structure" })
  }

  if (!req.body.output_format.description || !req.body.output_format.type || !req.body.output_format.subtype) {
    return res.status(400).json({ error: "Invalid output_format structure" })
  }

  if (!req.body.complexity.time || !req.body.complexity.space) {
    return res.status(400).json({ error: "Invalid complexity structure" })
  }

  if (!Array.isArray(req.body.test_cases)) {
    return res.status(400).json({ error: "test_cases must be an array" })
  }

  try {
    const solution = await generateSolution(req.body)
    return res.json(solution)
  } catch (err) {
    console.error("Error in generate:", err)
    return res.status(500).json({ error: err.message })
  }
})

export default router

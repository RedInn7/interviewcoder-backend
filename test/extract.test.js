import { extractProblemFromImage } from '../utils/openai.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testExtract() {
  try {
    // 读取测试图片
    const imagePath = path.join(__dirname, 'test-images/problem.png')
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Image = imageBuffer.toString('base64')
    
    console.log('Starting test...')
    console.log('Image size:', base64Image.length, 'bytes')
    
    const result = await extractProblemFromImage([base64Image], 'cpp')
    
    console.log('\nExtracted Problem Data:')
    console.log(JSON.stringify(result, null, 2))
    
    // 验证返回的数据结构
    const requiredFields = [
      'problem_statement',
      'input_format',
      'output_format',
      'complexity',
      'test_cases',
      'validation_type',
      'difficulty'
    ]
    
    const missingFields = requiredFields.filter(field => !result[field])
    if (missingFields.length > 0) {
      console.error('\nMissing required fields:', missingFields)
    } else {
      console.log('\nAll required fields present!')
    }
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testExtract() 
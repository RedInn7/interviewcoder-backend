import OpenAI from 'openai'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function cleanJsonString(jsonString) {
  try {
    // 1. 移除所有控制字符，但保留换行符
    let cleaned = jsonString.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
    
    // 2. 修复未闭合的括号
    const openBraces = (cleaned.match(/{/g) || []).length
    const closeBraces = (cleaned.match(/}/g) || []).length
    if (openBraces > closeBraces) {
      cleaned += '}'.repeat(openBraces - closeBraces)
    }
    
    // 3. 修复未闭合的数组
    const openBrackets = (cleaned.match(/\[/g) || []).length
    const closeBrackets = (cleaned.match(/]/g) || []).length
    if (openBrackets > closeBrackets) {
      cleaned += ']'.repeat(openBrackets - closeBrackets)
    }
    
    // 4. 处理代码块中的特殊字符
    // 4.1 将代码块中的换行符替换为 \n
    cleaned = cleaned.replace(/(?<="code":\s*")(.*?)(?=")/gs, match => {
      return match.replace(/\n/g, '\\n')
    })
    
    // 4.2 将代码块中的双引号转义
    cleaned = cleaned.replace(/(?<="code":\s*")(.*?)(?=")/gs, match => {
      return match.replace(/"/g, '\\"')
    })
    
    // 5. 确保最后一个字符是 }
    if (!cleaned.endsWith('}')) {
      cleaned = cleaned.trim() + '}'
    }
    
    // 6. 移除多余的空白字符
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    // 7. 尝试解析，如果失败则返回原始字符串
    JSON.parse(cleaned)
    return cleaned
  } catch (err) {
    console.error('Error cleaning JSON:', err)
    return jsonString
  }
}


export async function extractProblemFromImage(imageDataList, language) {
  const prompt = `You are an expert at analyzing programming problem screenshots. 
  Please analyze the provided images and extract the following information:
  1. Problem Statement (complete description of the problem)
  2. Input Format (description and parameters)
  3. Output Format (description, type, and subtype)
  4. Time and Space Complexity
  5. Test Cases
  6. Validation Type
  7. Difficulty Level

  The programming language is: ${language}
  
  IMPORTANT: Return ONLY a JSON object with the following structure, without any markdown formatting or code blocks:
  {
    "problem_statement": "string",
    "input_format": {
      "description": "string",
      "parameters": []
    },
    "output_format": {
      "description": "string",
      "type": "string",
      "subtype": "string"
    },
    "complexity": {
      "time": "string",
      "space": "string"
    },
    "test_cases": [],
    "validation_type": "string",
    "difficulty": "string"
  }`

  let responseText = ''  // 在函数作用域内定义 responseText

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...imageDataList.map(base64 => ({
              type: "image_url",
              image_url: {
                url: base64.startsWith('data:image/') 
                  ? base64 
                  : `data:image/jpeg;base64,${base64}`
              }
            }))
          ]
        }
      ],
      max_tokens: 2000
    })

    // Clean up response text by removing all non-JSON characters
    responseText = response.choices[0].message.content
    
    // Remove markdown code blocks
    responseText = responseText.replace(/```json\n?/g, '')
    responseText = responseText.replace(/```\n?/g, '')
    
    // Remove any text before the first {
    responseText = responseText.substring(responseText.indexOf('{'))
    
    // Remove any text after the last }
    responseText = responseText.substring(0, responseText.lastIndexOf('}') + 1)
    
    // Remove any comments (both single-line and multi-line)
    responseText = responseText.replace(/\/\/.*/g, '')  // Remove single-line comments
    responseText = responseText.replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
    
    // Clean up whitespace
    responseText = responseText.trim()
    
    // Remove any trailing commas in arrays and objects
    responseText = responseText.replace(/,(\s*[}\]])/g, '$1')
    
    // 清理响应中的非法控制字符
    const cleanedResponse = responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    console.log('Cleaned response:', cleanedResponse)  // 添加调试日志
    const result = JSON.parse(cleanedResponse)
    
    // Validate the response structure
    const requiredFields = [
      'problem_statement',
      'input_format',
      'output_format',
      'complexity',
      'test_cases',
      'validation_type',
      'difficulty'
    ]

    for (const field of requiredFields) {
      if (!result[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    return result
  } catch (err) {
    console.error('Failed to parse response:', responseText)
    throw new Error(`Failed to parse response: ${err.message}`)
  }
}

export async function generateSolution(problemInfo) {
  const prompt = `You are an expert programmer. Please solve the following programming problem in ${problemInfo.language}:

Problem Statement: ${problemInfo.problem_statement}

Input Format:
${problemInfo.input_format.description}
Parameters: ${JSON.stringify(problemInfo.input_format.parameters)}

Output Format:
${problemInfo.output_format.description}
Type: ${problemInfo.output_format.type}
Subtype: ${problemInfo.output_format.subtype}

Complexity Requirements:
Time: ${problemInfo.complexity.time}
Space: ${problemInfo.complexity.space}

Test Cases: ${JSON.stringify(problemInfo.test_cases)}

Validation Type: ${problemInfo.validation_type}
Difficulty: ${problemInfo.difficulty}

Please provide a complete solution with:
1. Clear function/method names
2. Proper input/output handling
3. Comments explaining the logic
4. Time and space complexity analysis`

  try {
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: "You are an expert programmer. Please provide solutions in the specified format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "solution",
          schema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The complete solution code"
              },
              thoughts: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Array of strings explaining the solution steps"
              },
              time_complexity: {
                type: "string",
                description: "Time complexity analysis"
              },
              space_complexity: {
                type: "string",
                description: "Space complexity analysis"
              }
            },
            required: ["code", "thoughts", "time_complexity", "space_complexity"],
            additionalProperties: false
          }
        }
      }
    })

    const result = JSON.parse(response.output_text)
    
    // Validate the response structure
    const requiredFields = [
      'code',
      'thoughts',
      'time_complexity',
      'space_complexity'
    ]

    for (const field of requiredFields) {
      if (!result[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    if (!Array.isArray(result.thoughts)) {
      throw new Error('thoughts must be an array of strings')
    }

    return result
  } catch (err) {
    console.error('Failed to parse response:', err.message)
    throw new Error(`Failed to parse response: ${err.message}`)
  }
}

export async function debugSolution(imageDataList, problemInfo, language) {
  const prompt = `You are an expert programmer and debugger. Please analyze the error screenshots and improve the solution for the following programming problem in ${language}:

Problem Statement: ${problemInfo.problem_statement}

Input Format:
${problemInfo.input_format.description}
Parameters: ${JSON.stringify(problemInfo.input_format.parameters)}

Output Format:
${problemInfo.output_format.description}
Type: ${problemInfo.output_format.type}
Subtype: ${problemInfo.output_format.subtype}

Complexity Requirements:
Time: ${problemInfo.complexity.time}
Space: ${problemInfo.complexity.space}

Test Cases: ${JSON.stringify(problemInfo.test_cases)}

Validation Type: ${problemInfo.validation_type}
Difficulty: ${problemInfo.difficulty}

Please provide an improved solution that:
1. Handles the error cases shown in the screenshots
2. Includes proper error handling
3. Has clear comments explaining the fixes
4. Maintains good performance

Format the response as a JSON object with the following structure:
{
  "debuggedSolutions": [
    {
      "language": "${language}",
      "code": "string"
    }
  ]
}`

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageDataList.map(base64 => ({
            type: "image_url",
            image_url: {
              url: base64.startsWith('data:image/') 
                ? base64 
                : `data:image/jpeg;base64,${base64}`
            }
          }))
        ]
      }
    ],
    max_tokens: 2000
  })

  // Clean up response text by removing all non-JSON characters
  let responseText = response.choices[0].message.content
  
  // Remove markdown code blocks
  responseText = responseText.replace(/```json\n?/g, '')
  responseText = responseText.replace(/```\n?/g, '')
  
  // Remove any text before the first {
  responseText = responseText.substring(responseText.indexOf('{'))
  
  // Remove any text after the last }
  responseText = responseText.substring(0, responseText.lastIndexOf('}') + 1)
  
  // Remove any comments (both single-line and multi-line)
  responseText = responseText.replace(/\/\/.*/g, '')  // Remove single-line comments
  responseText = responseText.replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
  
  // Clean up whitespace
  responseText = responseText.trim()
  
  // Remove any trailing commas in arrays and objects
  responseText = responseText.replace(/,(\s*[}\]])/g, '$1')
  
  try {
    // 清理响应中的非法控制字符
    const cleanedResponse = responseText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    const result = JSON.parse(cleanedResponse)
    
    // Validate the response structure
    const requiredFields = [
      'code',
      'thoughts',
      'time_complexity',
      'space_complexity'
    ]

    for (const field of requiredFields) {
      if (!result[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    if (!Array.isArray(result.thoughts)) {
      throw new Error('thoughts must be an array of strings')
    }

    return result
  } catch (err) {
    console.error('Failed to parse response:', responseText)
    throw new Error(`Failed to parse response: ${err.message}`)
  }
} 
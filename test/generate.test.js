import { generateSolution } from "../utils/openai.js"

async function testGenerate() {
  // Sample problem data
  const problemInfo = {
    problem_statement: "Given an array of integers nums and an integer target, return indices of the two numbers in nums such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    input_format: {
      description: "The input consists of two lines:\n1. First line: An array of integers nums\n2. Second line: An integer target",
      parameters: [
        {
          name: "nums",
          type: "array",
          description: "Array of integers"
        },
        {
          name: "target",
          type: "integer",
          description: "Target sum"
        }
      ]
    },
    output_format: {
      description: "Return an array of two integers representing the indices of the two numbers that add up to the target",
      type: "array",
      subtype: "integer"
    },
    complexity: {
      time: "O(n)",
      space: "O(n)"
    },
    test_cases: [
      {
        input: {
          nums: [2, 7, 11, 15],
          target: 9
        },
        output: [0, 1],
        explanation: "Because nums[0] + nums[1] = 2 + 7 = 9"
      },
      {
        input: {
          nums: [3, 2, 4],
          target: 6
        },
        output: [1, 2],
        explanation: "Because nums[1] + nums[2] = 2 + 4 = 6"
      }
    ],
    validation_type: "standard",
    difficulty: "easy",
    language: "python"
  }

  try {
    console.log("Testing generate solution...")
    console.log("Problem Info:", JSON.stringify(problemInfo, null, 2))

    const result = await generateSolution(problemInfo)
    
    console.log("\nGenerated Solution:")
    console.log("Code:", result.code)
    console.log("\nThoughts:")
    result.thoughts.forEach((thought, index) => {
      console.log(`${index + 1}. ${thought}`)
    })
    console.log("\nComplexity Analysis:")
    console.log("Time Complexity:", result.time_complexity)
    console.log("Space Complexity:", result.space_complexity)

    // Validate response structure
    if (!result.code || typeof result.code !== 'string') {
      throw new Error("Response must contain a code string")
    }
    if (!Array.isArray(result.thoughts)) {
      throw new Error("Response must contain a thoughts array")
    }
    if (!result.time_complexity || typeof result.time_complexity !== 'string') {
      throw new Error("Response must contain a time_complexity string")
    }
    if (!result.space_complexity || typeof result.space_complexity !== 'string') {
      throw new Error("Response must contain a space_complexity string")
    }

    console.log("\nTest completed successfully!")
  } catch (error) {
    console.error("Test failed:", error.message)
  }
}

// Run the test
testGenerate() 
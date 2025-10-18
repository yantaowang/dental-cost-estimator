import { type NextRequest, NextResponse } from "next/server"

const DEEPSEEK_API_KEY = "sk-20356cca951343aca121bde544d87116"
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

interface EstimationResult {
  treatments: Array<{ name: string; cost: string }>
  materials: Array<{ name: string; cost: string }>
  duration: string
  totalCost: string
  insuranceCoverage: string
  finalCost: string
  insuranceRate: number
  rawResponse: string
}

function calculateInsuranceRate(treatments: Array<{ name: string; cost: string }>): number {
  // Default insurance rates for different treatment types
  const treatmentText = treatments.map((t) => t.name.toLowerCase()).join(" ")

  // Cosmetic treatments typically have lower or no insurance coverage
  if (treatmentText.includes("美白") || treatmentText.includes("矫正") || treatmentText.includes("种植")) {
    return 0.3 // 30% coverage for cosmetic/elective procedures
  }

  // Basic treatments have higher coverage
  if (treatmentText.includes("拔牙") || treatmentText.includes("补牙") || treatmentText.includes("根管")) {
    return 0.7 // 70% coverage for basic treatments
  }

  // Emergency/pain treatments
  if (treatmentText.includes("疼痛") || treatmentText.includes("急诊") || treatmentText.includes("消炎")) {
    return 0.8 // 80% coverage for emergency care
  }

  // Default moderate coverage
  return 0.5 // 50% default coverage
}

export async function POST(request: NextRequest) {
  try {
    const { symptoms } = await request.json()

    if (!symptoms) {
      return NextResponse.json({ error: "请提供症状描述" }, { status: 400 })
    }

    const systemPrompt = `你是一个专业的牙科费用估算助手。根据用户描述的症状，你需要：
1. 识别可能需要的治疗项目
2. 估算每个治疗项目的费用（使用人民币）
3. 列出所需的材料和设备费用
4. 估算治疗时长
5. 计算总费用

请以JSON格式返回结果，格式如下：
{
  "treatments": [{"name": "治疗项目名称", "cost": "¥1000-2000"}],
  "materials": [{"name": "材料名称", "cost": "¥500-800"}],
  "duration": "2-3周",
  "totalCost": "¥3000-5000"
}

注意：
- 费用范围要合理，符合中国市场行情
- 如果症状描述不清楚，给出常见情况的估算
- 治疗项目要具体明确
- 材料费用要详细列出`

    const userPrompt = `患者症状：${symptoms}\n\n请根据以上症状提供详细的费用估算。`

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] DeepSeek API error:", errorText)
      throw new Error(`DeepSeek API 请求失败: ${response.status}`)
    }

    const data = await response.json()

    const aiResponse = data.choices[0]?.message?.content || ""

    // Parse AI response
    let parsedData
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("[v0] Failed to parse AI response:", parseError)
      parsedData = {
        treatments: [{ name: "常规检查与诊断", cost: "¥100-300" }],
        materials: [{ name: "基础医疗耗材", cost: "¥50-150" }],
        duration: "1-2周",
        totalCost: "¥500-1500",
      }
    }

    const insuranceRate = calculateInsuranceRate(parsedData.treatments || [])

    // Calculate insurance and final cost
    const totalCostMatch = parsedData.totalCost.match(/¥(\d+)-(\d+)/)
    let insuranceCoverage = "¥0"
    let finalCost = parsedData.totalCost

    if (totalCostMatch) {
      const minCost = Number.parseInt(totalCostMatch[1])
      const maxCost = Number.parseInt(totalCostMatch[2])
      const minInsurance = Math.round(minCost * insuranceRate)
      const maxInsurance = Math.round(maxCost * insuranceRate)
      const minFinal = minCost - minInsurance
      const maxFinal = maxCost - maxInsurance

      insuranceCoverage = `¥${minInsurance}-${maxInsurance}`
      finalCost = `¥${minFinal}-${maxFinal}`
    }

    const result: EstimationResult = {
      treatments: parsedData.treatments || [],
      materials: parsedData.materials || [],
      duration: parsedData.duration || "待定",
      totalCost: parsedData.totalCost || "¥0",
      insuranceCoverage,
      finalCost,
      insuranceRate,
      rawResponse: aiResponse,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Estimation error:", error)
    return NextResponse.json({ error: "估算失败，请稍后重试" }, { status: 500 })
  }
}

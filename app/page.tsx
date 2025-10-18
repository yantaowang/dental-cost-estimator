"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Calculator, History, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

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

interface HistoryItem {
  id: string
  symptoms: string
  result: EstimationResult
  timestamp: number
}

export default function DentalCostEstimator() {
  const [symptoms, setSymptoms] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EstimationResult | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const { toast } = useToast()

  useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dental-history")
      if (saved) {
        try {
          setHistory(JSON.parse(saved))
        } catch (e) {
          console.error("Failed to load history:", e)
        }
      }
    }
  })

  const saveToHistory = (symptoms: string, result: EstimationResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      symptoms,
      result,
      timestamp: Date.now(),
    }
    const newHistory = [newItem, ...history].slice(0, 10)
    setHistory(newHistory)
    if (typeof window !== "undefined") {
      localStorage.setItem("dental-history", JSON.stringify(newHistory))
    }
  }

  const clearHistory = () => {
    setHistory([])
    if (typeof window !== "undefined") {
      localStorage.removeItem("dental-history")
    }
    toast({
      title: "历史记录已清空",
      description: "所有估算历史已被删除",
    })
  }

  const handleEstimate = async () => {
    if (!symptoms.trim()) {
      toast({
        title: "请输入症状",
        description: "请描述您的牙齿症状以获取费用估算",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symptoms,
        }),
      })

      if (!response.ok) {
        throw new Error("估算请求失败")
      }

      const data = await response.json()
      setResult(data)
      saveToHistory(symptoms, data)

      toast({
        title: "估算完成",
        description: "费用估算已生成",
      })
    } catch (error) {
      console.error("Estimation error:", error)
      toast({
        title: "估算失败",
        description: "请稍后重试或检查网络连接",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFromHistory = (item: HistoryItem) => {
    setSymptoms(item.symptoms)
    setResult(item.result)
    setShowHistory(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Calculator className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            牙科费用估算
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">AI智能估算，快速了解治疗费用</p>
        </div>

        {/* Main Card */}
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">开始估算</CardTitle>
            <CardDescription className="text-sm">请描述您的牙齿症状，我们将为您提供详细的费用估算</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="symptoms" className="text-sm md:text-base">
                症状描述
              </Label>
              <Textarea
                id="symptoms"
                placeholder="例如：牙齿疼痛、需要拔牙、想做牙齿矫正等..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={4}
                className="resize-none text-sm md:text-base"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleEstimate} disabled={loading} className="flex-1 text-sm md:text-base">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    估算中...
                  </>
                ) : (
                  "开始估算"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowHistory(!showHistory)} className="px-3 md:px-4">
                <History className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <Card className="mb-4 md:mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl">历史记录</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearHistory} className="text-xs md:text-sm">
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  清空
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <p className="text-xs md:text-sm font-medium truncate">{item.symptoms}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString("zh-CN")}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">治疗项目</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.treatments.map((treatment, index) => (
                    <div key={index} className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
                      <span className="text-xs md:text-sm flex-1 leading-relaxed">{treatment.name}</span>
                      <span className="font-semibold text-primary text-xs md:text-sm whitespace-nowrap">
                        {treatment.cost}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">材料与设备费用</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.materials.map((material, index) => (
                    <div key={index} className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
                      <span className="text-xs md:text-sm flex-1 leading-relaxed">{material.name}</span>
                      <span className="font-semibold text-primary text-xs md:text-sm whitespace-nowrap">
                        {material.cost}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">费用汇总</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs md:text-sm text-muted-foreground">预计治疗时长</span>
                  <span className="font-medium text-xs md:text-sm">{result.duration}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs md:text-sm text-muted-foreground">总费用</span>
                  <span className="font-semibold text-base md:text-lg">{result.totalCost}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs md:text-sm text-muted-foreground">医保报销比例</span>
                  <span className="text-xs md:text-sm font-medium">{Math.round(result.insuranceRate * 100)}%</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-xs md:text-sm text-muted-foreground">医保报销</span>
                  <span className="text-primary font-medium text-xs md:text-sm">-{result.insuranceCoverage}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-base md:text-lg font-semibold">实际支付</span>
                    <span className="text-xl md:text-2xl font-bold text-primary">{result.finalCost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm md:text-base">温馨提示</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  以上费用为AI估算结果，仅供参考。实际费用可能因医院、地区、医生经验等因素有所差异。医保报销比例根据治疗项目自动计算，具体以当地医保政策为准。建议您前往正规医疗机构进行详细检查和咨询。
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  )
}

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { FileText, Plus, Download, Eye } from "lucide-react"
import { TOSMatrix } from "@/components/tos/TOSMatrix"
import { TOSForm } from "@/components/tos/TOSForm"

export interface TOSConfig {
  subjectNo: string
  course: string
  description: string
  yearSection: string
  examPeriod: string
  schoolYear: string
  totalItems: number
  preparedBy: string
  notedBy: string
  topics: Array<{
    name: string
    hours: number
  }>
}

export interface TOSData extends TOSConfig {
  distribution: {
    [topicName: string]: {
      total: number
      remembering: number[]
      understanding: number[]
      applying: number[]
      analyzing: number[]
      evaluating: number[]
      creating: number[]
    }
  }
}

const TOS = () => {
  const [tosConfig, setTosConfig] = useState<TOSConfig>({
    subjectNo: "IS 9",
    course: "BSIS",
    description: "IS 9 - System Analysis and Design",
    yearSection: "3A",
    examPeriod: "Final",
    schoolYear: "2024-2025",
    totalItems: 50,
    preparedBy: "",
    notedBy: "",
    topics: [
      { name: "Requirements Engineering", hours: 10 },
      { name: "Data and Process Modeling", hours: 15 },
      { name: "Object Modeling and Development Strategies", hours: 15 }
    ]
  })

  const [tosData, setTosData] = useState<TOSData | null>(null)
  const [currentStep, setCurrentStep] = useState<'form' | 'matrix'>('form')

  const handleGenerateTOS = (config: TOSConfig) => {
    // Calculate total hours
    const totalHours = config.topics.reduce((sum, topic) => sum + topic.hours, 0)
    
    // Calculate distribution
    const distribution: TOSData['distribution'] = {}
    let currentItemNumber = 1

    config.topics.forEach(topic => {
      // Calculate topic allocation based on hours
      const topicPercentage = topic.hours / totalHours
      const topicItems = Math.round(config.totalItems * topicPercentage)
      
      // Bloom's distribution percentages
      const bloomDistribution = {
        remembering: 0.15,  // 15%
        understanding: 0.15, // 15%
        applying: 0.20,     // 20%
        analyzing: 0.20,    // 20%
        evaluating: 0.15,   // 15%
        creating: 0.15      // 15%
      }

      // Calculate items per Bloom level for this topic
      const remembering = Math.round(topicItems * bloomDistribution.remembering)
      const understanding = Math.round(topicItems * bloomDistribution.understanding)
      const applying = Math.round(topicItems * bloomDistribution.applying)
      const analyzing = Math.round(topicItems * bloomDistribution.analyzing)
      const evaluating = Math.round(topicItems * bloomDistribution.evaluating)
      const creating = Math.round(topicItems * bloomDistribution.creating)
      
      // Adjust for rounding discrepancies
      const calculatedTotal = remembering + understanding + applying + analyzing + evaluating + creating
      let adjustment = topicItems - calculatedTotal
      
      // Apply adjustment to the largest category
      let adjustedCounts = { remembering, understanding, applying, analyzing, evaluating, creating }
      if (adjustment !== 0) {
        const largest = Object.entries(adjustedCounts).reduce((a, b) => adjustedCounts[a[0]] > adjustedCounts[b[0]] ? a : b)[0] as keyof typeof adjustedCounts
        adjustedCounts[largest] += adjustment
      }

      // Generate item number arrays
      const generateItemNumbers = (count: number) => {
        const items = []
        for (let i = 0; i < count; i++) {
          items.push(currentItemNumber++)
        }
        return items
      }

      distribution[topic.name] = {
        total: topicItems,
        remembering: generateItemNumbers(adjustedCounts.remembering),
        understanding: generateItemNumbers(adjustedCounts.understanding),
        applying: generateItemNumbers(adjustedCounts.applying),
        analyzing: generateItemNumbers(adjustedCounts.analyzing),
        evaluating: generateItemNumbers(adjustedCounts.evaluating),
        creating: generateItemNumbers(adjustedCounts.creating)
      }
    })

    const generatedTOS: TOSData = {
      ...config,
      distribution
    }

    setTosData(generatedTOS)
    setCurrentStep('matrix')
  }

  const handleBack = () => {
    setCurrentStep('form')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Table of Specifications</h1>
        </div>
        <p className="text-muted-foreground">
          Create and manage two-way tables of specifications for your examinations
        </p>
      </div>

      {currentStep === 'form' ? (
        <TOSForm 
          config={tosConfig}
          onConfigChange={setTosConfig}
          onGenerate={handleGenerateTOS}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="gap-2"
            >
              ← Back to Form
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Generate Questions
              </Button>
            </div>
          </div>
          
          {tosData && <TOSMatrix data={tosData} />}
        </div>
      )}
    </div>
  )
}

export default TOS
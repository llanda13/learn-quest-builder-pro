import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, FileText, Key, Printer } from "lucide-react"
import { TOSData } from "@/pages/TOS"

interface GeneratedTestProps {
  tosData: TOSData
  testQuestions: TestQuestion[]
  onBack: () => void
}

export interface TestQuestion {
  id: number
  topicName: string
  bloomLevel: string
  difficulty: 'Easy' | 'Average' | 'Difficult'
  type: 'multiple-choice' | 'true-false' | 'essay' | 'fill-blank'
  question: string
  options?: string[]
  correctAnswer: string | number
  points: number
}

export function GeneratedTest({ tosData, testQuestions, onBack }: GeneratedTestProps) {
  const easyQuestions = testQuestions.filter(q => q.difficulty === 'Easy')
  const averageQuestions = testQuestions.filter(q => q.difficulty === 'Average')
  const difficultQuestions = testQuestions.filter(q => q.difficulty === 'Difficult')

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPackage = () => {
    // Mock download functionality
    const blob = new Blob(['Test Package Generated'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tosData.subjectNo}-${tosData.examPeriod}-Test-Package.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={onBack}>
          ← Back to TOS
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print Test
          </Button>
          <Button variant="outline" className="gap-2">
            <Key className="w-4 h-4" />
            Answer Key
          </Button>
          <Button onClick={handleDownloadPackage} className="gap-2">
            <Download className="w-4 h-4" />
            Download Package
          </Button>
        </div>
      </div>

      {/* Test Document */}
      <div className="bg-white text-black p-8 shadow-lg print:shadow-none print:p-0">
        {/* School Header */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-xl font-bold">AGUSAN DEL SUR STATE COLLEGE OF AGRICULTURE AND TECHNOLOGY</h1>
          <h2 className="text-lg font-semibold">College of Computing and Information Sciences</h2>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div className="text-left">
              <p><strong>Course:</strong> {tosData.course}</p>
              <p><strong>Subject:</strong> {tosData.description}</p>
              <p><strong>Examination Period:</strong> {tosData.examPeriod}</p>
            </div>
            <div className="text-right">
              <p><strong>Year & Section:</strong> {tosData.yearSection}</p>
              <p><strong>School Year:</strong> {tosData.schoolYear}</p>
              <p><strong>Total Items:</strong> {tosData.totalItems}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <p><strong>Name:</strong> ________________________</p>
            <p><strong>Score:</strong> _______</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg print:bg-transparent print:border print:border-gray-400">
          <h3 className="font-bold mb-2">INSTRUCTIONS:</h3>
          <ul className="text-sm space-y-1">
            <li>• Answer all questions completely and clearly.</li>
            <li>• Circle the correct letter for multiple choice questions.</li>
            <li>• Write your essays on the back of the test paper or use additional sheets.</li>
            <li>• Manage your time wisely.</li>
          </ul>
        </div>

        {/* Easy Questions */}
        {easyQuestions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">PART I - EASY QUESTIONS</h3>
              <Badge variant="secondary">Remembering & Understanding</Badge>
            </div>
            <div className="space-y-4">
              {easyQuestions.map((question, index) => (
                <QuestionItem key={question.id} question={question} />
              ))}
            </div>
          </div>
        )}

        {/* Average Questions */}
        {averageQuestions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">PART II - AVERAGE QUESTIONS</h3>
              <Badge variant="secondary">Applying & Analyzing</Badge>
            </div>
            <div className="space-y-4">
              {averageQuestions.map((question, index) => (
                <QuestionItem key={question.id} question={question} />
              ))}
            </div>
          </div>
        )}

        {/* Difficult Questions */}
        {difficultQuestions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold">PART III - DIFFICULT QUESTIONS</h3>
              <Badge variant="secondary">Evaluating & Creating</Badge>
            </div>
            <div className="space-y-4">
              {difficultQuestions.map((question, index) => (
                <QuestionItem key={question.id} question={question} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-400">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="mb-8">Prepared by:</p>
              <div className="border-b border-gray-400 mb-2"></div>
              <p className="text-center">{tosData.preparedBy || "[Teacher Name]"}</p>
              <p className="text-center text-xs">Instructor</p>
            </div>
            <div>
              <p className="mb-8">Noted by:</p>
              <div className="border-b border-gray-400 mb-2"></div>
              <p className="text-center">{tosData.notedBy || "[Dean Name]"}</p>
              <p className="text-center text-xs">Dean</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionItem({ question }: { question: TestQuestion }) {
  return (
    <div className="border-l-4 border-primary pl-4">
      <div className="flex items-start gap-2">
        <span className="font-bold min-w-8">{question.id}.</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {question.topicName}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {question.bloomLevel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({question.points} {question.points === 1 ? 'point' : 'points'})
            </span>
          </div>
          <p className="mb-3 leading-relaxed">{question.question}</p>
          
          {question.type === 'multiple-choice' && question.options && (
            <div className="ml-4 space-y-1">
              {question.options.map((option, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="font-medium">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                </div>
              ))}
            </div>
          )}
          
          {question.type === 'essay' && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Answer: (Use the back of this paper or additional sheets)</p>
            </div>
          )}
          
          {question.type === 'fill-blank' && (
            <div className="mt-2">
              <div className="border-b border-gray-400 w-48 inline-block"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TOSData } from "@/pages/TOS"

interface TOSMatrixProps {
  data: TOSData
}

export function TOSMatrix({ data }: TOSMatrixProps) {
  const bloomLevels = [
    { key: 'remembering', label: 'Remembering', difficulty: 'Easy' },
    { key: 'understanding', label: 'Understanding', difficulty: 'Easy' },
    { key: 'applying', label: 'Applying', difficulty: 'Average' },
    { key: 'analyzing', label: 'Analyzing', difficulty: 'Average' },
    { key: 'evaluating', label: 'Evaluating', difficulty: 'Difficult' },
    { key: 'creating', label: 'Creating', difficulty: 'Difficult' }
  ] as const

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'Average': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'Difficult': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const formatItemNumbers = (items: number[]) => {
    if (items.length === 0) return '-'
    if (items.length === 1) return items[0].toString()
    
    // Group consecutive numbers
    const groups: string[] = []
    let start = items[0]
    let end = items[0]
    
    for (let i = 1; i < items.length; i++) {
      if (items[i] === end + 1) {
        end = items[i]
      } else {
        groups.push(start === end ? start.toString() : `${start}-${end}`)
        start = end = items[i]
      }
    }
    groups.push(start === end ? start.toString() : `${start}-${end}`)
    
    return `(${groups.join(', ')})`
  }

  // Calculate totals for each Bloom level
  const bloomTotals = bloomLevels.reduce((acc, level) => {
    acc[level.key] = Object.values(data.distribution).reduce((sum, topic) => {
      return sum + topic[level.key].length
    }, 0)
    return acc
  }, {} as Record<string, number>)

  const grandTotal = Object.values(bloomTotals).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Way Table of Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><strong>Subject No.:</strong> {data.subjectNo}</div>
            <div><strong>Course:</strong> {data.course}</div>
            <div><strong>Year & Section:</strong> {data.yearSection}</div>
            <div><strong>Description:</strong> {data.description}</div>
            <div><strong>Examination Period:</strong> {data.examPeriod}</div>
            <div><strong>School Year:</strong> {data.schoolYear}</div>
            <div><strong>Total Test Items:</strong> {data.totalItems}</div>
            <div><strong>Prepared by:</strong> {data.preparedBy}</div>
            <div><strong>Noted by:</strong> {data.notedBy}</div>
          </div>
        </CardContent>
      </Card>

      {/* Bloom's Taxonomy Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bloom's Taxonomy Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-2">Easy (30%)</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor('Easy')}>Remembering (15%)</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor('Easy')}>Understanding (15%)</Badge>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Average (40%)</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor('Average')}>Applying (20%)</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor('Average')}>Analyzing (20%)</Badge>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Difficult (30%)</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor('Difficult')}>Evaluating (15%)</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor('Difficult')}>Creating (15%)</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOS Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Item Distribution Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Topics</TableHead>
                  {bloomLevels.map((level) => (
                    <TableHead key={level.key} className="text-center font-bold min-w-[120px]">
                      <div>{level.label}</div>
                      <Badge className={`${getDifficultyColor(level.difficulty)} text-xs mt-1`}>
                        {level.difficulty}
                      </Badge>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold">Item Placement</TableHead>
                  <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.distribution).map(([topicName, topicData]) => (
                  <TableRow key={topicName}>
                    <TableCell className="font-medium">{topicName}</TableCell>
                    {bloomLevels.map((level) => (
                      <TableCell key={level.key} className="text-center text-sm">
                        <div className="font-semibold">{topicData[level.key].length}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatItemNumbers(topicData[level.key])}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold text-lg">I</TableCell>
                    <TableCell className="text-center font-bold">{topicData.total}</TableCell>
                  </TableRow>
                ))}
                
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  {bloomLevels.map((level) => (
                    <TableCell key={level.key} className="text-center font-bold">
                      {bloomTotals[level.key]}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold">-</TableCell>
                  <TableCell className="text-center font-bold text-lg">{grandTotal}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribution Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {bloomTotals.remembering + bloomTotals.understanding}
              </div>
              <div className="text-sm text-muted-foreground">Easy Items (30%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {bloomTotals.applying + bloomTotals.analyzing}
              </div>
              <div className="text-sm text-muted-foreground">Average Items (40%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {bloomTotals.evaluating + bloomTotals.creating}
              </div>
              <div className="text-sm text-muted-foreground">Difficult Items (30%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {grandTotal}
              </div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
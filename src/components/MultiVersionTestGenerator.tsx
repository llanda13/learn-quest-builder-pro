import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Plus, 
  Shuffle, 
  FileText, 
  Download,
  Printer,
  Eye,
  RefreshCw,
  Target,
  Filter,
  CheckCircle,
  AlertTriangle,
  Save,
  Trash2,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTestVersions } from "@/hooks/useTestVersions";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  choices?: Record<string, string>;
  correct_answer?: string;
  created_by: string;
}

interface TestVersion {
  version_label: string;
  questions: Question[];
  answer_key: Record<string, string>;
  total_points: number;
}

interface MultiVersionTestGeneratorProps {
  onBack: () => void;
}

export const MultiVersionTestGenerator = ({ onBack }: MultiVersionTestGeneratorProps) => {
  const { toast } = useToast();
  const {
    testMetadata,
    loading: metadataLoading,
    generateTestVersions,
    saveTestVersions,
    loadTestVersions,
    deleteTest,
    validateTestConfig,
    validateVersionBalance
  } = useTestVersions();

  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [testVersions, setTestVersions] = useState<TestVersion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<'A' | 'B' | 'C'>('A');
  const [activeTab, setActiveTab] = useState('configure');
  const [savedTestId, setSavedTestId] = useState<string | null>(null);

  // Test configuration
  const [testConfig, setTestConfig] = useState({
    title: "",
    subject: "",
    course: "",
    year_section: "",
    exam_period: "",
    school_year: "",
    instructions: "Read each question carefully and select the best answer. Mark your responses clearly.",
    time_limit: 60,
    points_per_question: 1,
    shuffle_questions: true,
    shuffle_choices: true,
    number_of_versions: 3
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('questions')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform database data to match component interface
      const transformedQuestions: Question[] = (data || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        topic: q.topic,
        bloom_level: q.bloom_level,
        difficulty: q.difficulty,
        choices: q.choices,
        correct_answer: q.correct_answer,
        created_by: q.created_by
      }));

      setAvailableQuestions(transformedQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVersions = async () => {
    // Validate configuration
    const configErrors = validateTestConfig(testConfig, selectedQuestions);
    if (configErrors.length > 0) {
      toast({
        title: "Configuration Error",
        description: configErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    // Check balance
    const { warnings } = validateVersionBalance(selectedQuestions, testConfig);
    if (warnings.length > 0) {
      console.warn('Test balance warnings:', warnings);
    }

    setIsGenerating(true);

    try {
      // Generate versions
      const versions = await generateTestVersions(testConfig, selectedQuestions);
      setTestVersions(versions);

      // Save to database
      const testId = await saveTestVersions(testConfig, versions);
      setSavedTestId(testId);

      setActiveTab('preview');
      
      toast({
        title: "Test Versions Generated",
        description: `Successfully created ${testConfig.number_of_versions} test versions with shuffled content.`,
      });
    } catch (error) {
      console.error('Error generating test versions:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate test versions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionToggle = (question: Question, isSelected: boolean) => {
    if (isSelected) {
      setSelectedQuestions(prev => [...prev, question]);
    } else {
      setSelectedQuestions(prev => prev.filter(q => q.id !== question.id));
    }
  };

  const handleDownloadPDF = async (version: TestVersion) => {
    try {
      const element = document.getElementById(`test-version-${version.version_label}`);
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `${testConfig.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_version_${version.version_label}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "PDF Downloaded",
        description: `Version ${version.version_label} downloaded successfully`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (version: TestVersion) => {
    const element = document.getElementById(`test-version-${version.version_label}`);
    if (element) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${testConfig.title} - Version ${version.version_label}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .question { margin-bottom: 20px; page-break-inside: avoid; }
                .choices { margin-left: 20px; }
                .choice { margin-bottom: 5px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleLoadSavedTest = async (testId: string) => {
    try {
      const versions = await loadTestVersions(testId);
      setTestVersions(versions);
      setActiveTab('preview');
      
      if (versions.length > 0) {
        setCurrentPreview(versions[0].version_label as 'A' | 'B' | 'C');
      }
      
      toast({
        title: "Test Loaded",
        description: `Loaded ${versions.length} test versions`,
      });
    } catch (error) {
      console.error('Error loading saved test:', error);
      toast({
        title: "Error",
        description: "Failed to load saved test",
        variant: "destructive",
      });
    }
  };

  const topics = [...new Set(availableQuestions.map(q => q.topic))];
  const difficulties = ['easy', 'average', 'difficult'];

  const filteredQuestions = availableQuestions.filter(question => {
    return (
      (searchTerm === "" || question.question_text.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTopic === "" || selectedTopic === "all" || question.topic === selectedTopic) &&
      (selectedDifficulty === "" || selectedDifficulty === "all" || question.difficulty.toLowerCase() === selectedDifficulty)
    );
  });

  const formatQuestionType = (type: string) => {
    switch (type) {
      case 'mcq':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'essay':
        return 'Essay';
      case 'short_answer':
        return 'Short Answer';
      default:
        return type;
    }
  };

  const { warnings } = validateVersionBalance(selectedQuestions, testConfig);

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="text-center mb-16 animate-slide-in-down">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
            <Shuffle className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Multi-Version Tests</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Multi-Version <span className="text-shimmer">Test Generator</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Create multiple versions of tests with shuffled questions and answer choices to prevent cheating
          </p>
          <Button variant="outline" onClick={onBack} className="interactive focus-ring">
            ← Back to Dashboard
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configure">Configure Test</TabsTrigger>
            <TabsTrigger value="select">Select Questions</TabsTrigger>
            <TabsTrigger value="preview">Preview Versions</TabsTrigger>
            <TabsTrigger value="history">Test History</TabsTrigger>
          </TabsList>

          {/* Configure Test Tab */}
          <TabsContent value="configure" className="space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="testTitle">Test Title *</Label>
                    <Input
                      id="testTitle"
                      value={testConfig.title}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Midterm Examination"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={testConfig.subject}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., System Analysis and Design"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="course">Course</Label>
                    <Input
                      id="course"
                      value={testConfig.course}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, course: e.target.value }))}
                      placeholder="e.g., BSIS"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearSection">Year & Section</Label>
                    <Input
                      id="yearSection"
                      value={testConfig.year_section}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, year_section: e.target.value }))}
                      placeholder="e.g., 3A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="examPeriod">Exam Period</Label>
                    <Input
                      id="examPeriod"
                      value={testConfig.exam_period}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, exam_period: e.target.value }))}
                      placeholder="e.g., Final Examination"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="instructions">Test Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={testConfig.instructions}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, instructions: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      value={testConfig.time_limit}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pointsPerQuestion">Points per Question</Label>
                    <Input
                      id="pointsPerQuestion"
                      type="number"
                      value={testConfig.points_per_question}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, points_per_question: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfVersions">Number of Versions</Label>
                    <Select 
                      value={testConfig.number_of_versions.toString()} 
                      onValueChange={(value) => setTestConfig(prev => ({ ...prev, number_of_versions: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Version (No shuffling)</SelectItem>
                        <SelectItem value="2">2 Versions (A, B)</SelectItem>
                        <SelectItem value="3">3 Versions (A, B, C)</SelectItem>
                        <SelectItem value="4">4 Versions (A, B, C, D)</SelectItem>
                        <SelectItem value="5">5 Versions (A, B, C, D, E)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Shuffling Options</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleQuestions"
                        checked={testConfig.shuffle_questions}
                        onCheckedChange={(checked) => setTestConfig(prev => ({ ...prev, shuffle_questions: checked as boolean }))}
                      />
                      <Label htmlFor="shuffleQuestions" className="cursor-pointer">
                        Shuffle question order between versions
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleChoices"
                        checked={testConfig.shuffle_choices}
                        onCheckedChange={(checked) => setTestConfig(prev => ({ ...prev, shuffle_choices: checked as boolean }))}
                      />
                      <Label htmlFor="shuffleChoices" className="cursor-pointer">
                        Shuffle answer choices (MCQ only)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={() => setActiveTab('select')}
                    className="bg-gradient-primary hover:shadow-glow btn-hover interactive focus-ring"
                  >
                    Next: Select Questions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Select Questions Tab */}
          <TabsContent value="select" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/20 rounded-xl">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {availableQuestions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Questions</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-secondary/20 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-secondary mb-1">
                    {selectedQuestions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Selected Questions</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-accent/20 rounded-xl">
                      <Target className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-accent mb-1">
                    {selectedQuestions.length * testConfig.points_per_question}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/20 rounded-xl">
                      <Shuffle className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-green-500 mb-1">
                    {testConfig.number_of_versions}
                  </div>
                  <div className="text-sm text-muted-foreground">Test Versions</div>
                </CardContent>
              </Card>
            </div>

            {/* Balance Warnings */}
            {warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Test Balance Warnings:</p>
                    <ul className="list-disc list-inside text-sm">
                      {warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Filters */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Topics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      {difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedTopic("all");
                      setSelectedDifficulty("all");
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 focus-ring"
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Questions List */}
            <div className="space-y-4">
              {loading ? (
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-12 text-center">
                    <RefreshCw className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50 animate-spin" />
                    <p className="text-muted-foreground">Loading questions...</p>
                  </CardContent>
                </Card>
              ) : filteredQuestions.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No questions found</h3>
                    <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredQuestions.map((question) => {
                  const isSelected = selectedQuestions.some(q => q.id === question.id);
                  return (
                    <Card key={question.id} className={`bg-card/80 backdrop-blur-sm border card-hover transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleQuestionToggle(question, checked as boolean)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium mb-3">{question.question_text}</p>
                            
                            {question.choices && (
                              <div className="space-y-1 mb-3">
                                {Object.entries(question.choices).map(([key, value]) => (
                                  <p key={key} className="text-sm text-muted-foreground pl-4">
                                    {key.toUpperCase()}. {value as string}
                                  </p>
                                ))}
                                {question.correct_answer && (
                                  <p className="text-sm font-medium text-green-600 pl-4">
                                    ✓ Correct: {question.correct_answer}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">{formatQuestionType(question.question_type)}</Badge>
                              <Badge variant="outline">{question.topic}</Badge>
                              <Badge variant="outline">{question.bloom_level}</Badge>
                              <Badge variant="outline">{question.difficulty}</Badge>
                              <Badge variant={question.created_by === 'AI' ? 'default' : 'secondary'}>
                                {question.created_by === 'AI' ? '🤖 AI' : '👤 Teacher'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            <div className="flex justify-center pt-6">
              <Button 
                onClick={handleGenerateVersions}
                disabled={selectedQuestions.length === 0 || isGenerating || !testConfig.title.trim()}
                className="bg-gradient-primary hover:shadow-glow btn-hover interactive focus-ring"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Test Versions"}
              </Button>
            </div>

            {isGenerating && (
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Shuffle className="w-5 h-5 text-primary animate-spin" />
                      <span className="font-medium">Generating {testConfig.number_of_versions} test versions...</span>
                    </div>
                    <Progress value={75} className="w-full" />
                    <p className="text-sm text-muted-foreground">
                      Shuffling questions and answer choices for each version
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Preview Versions Tab */}
          <TabsContent value="preview" className="space-y-6">
            {testVersions.length === 0 ? (
              <Card className="bg-card/80 backdrop-blur-sm border border-border/50">
                <CardContent className="p-12 text-center">
                  <Shuffle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No test versions generated</h3>
                  <p className="text-muted-foreground">Please configure your test and select questions first.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Version Controls */}
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Test Versions ({testVersions.length})</h3>
                      <div className="flex gap-2">
                        {testVersions.map((version) => (
                          <Button
                            key={version.version_label}
                            onClick={() => setCurrentPreview(version.version_label as 'A' | 'B' | 'C')}
                            variant={currentPreview === version.version_label ? "default" : "outline"}
                            size="sm"
                          >
                            Version {version.version_label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          const version = testVersions.find(v => v.version_label === currentPreview);
                          if (version) handlePrint(version);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print Version {currentPreview}
                      </Button>
                      <Button
                        onClick={() => {
                          const version = testVersions.find(v => v.version_label === currentPreview);
                          if (version) handleDownloadPDF(version);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button
                        onClick={() => {
                          // Download all versions as ZIP
                          testVersions.forEach(version => handleDownloadPDF(version));
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download All Versions
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Test Preview */}
                {testVersions.map((version) => (
                  <div
                    key={version.version_label}
                    id={`test-version-${version.version_label}`}
                    className={`${currentPreview === version.version_label ? 'block' : 'hidden'} bg-white text-black p-8 print:p-0 rounded-lg border`}
                  >
                    {/* Test Header */}
                    <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
                      <h1 className="text-3xl font-bold mb-2">
                        {testConfig.title} - Version {version.version_label}
                      </h1>
                      <div className="text-lg mb-4">{testConfig.subject}</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                        <div>
                          <strong>Name:</strong> _______________________
                        </div>
                        <div>
                          <strong>Date:</strong> _______________________
                        </div>
                        <div>
                          <strong>Score:</strong> _____ / {version.total_points}
                        </div>
                      </div>
                      
                      {testConfig.course && testConfig.year_section && (
                        <div className="mt-2 text-sm">
                          <strong>Course & Section:</strong> {testConfig.course} - {testConfig.year_section}
                        </div>
                      )}
                      
                      {testConfig.time_limit && (
                        <div className="mt-2 text-sm">
                          <strong>Time Limit:</strong> {testConfig.time_limit} minutes
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="mb-8 p-4 bg-gray-100 rounded border">
                      <h2 className="font-semibold mb-2">Instructions:</h2>
                      <p className="text-sm">{testConfig.instructions}</p>
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                      {version.questions.map((question, index) => (
                        <div key={`${version.version_label}-${question.id}`} className="border-b border-gray-200 pb-4 page-break-inside-avoid">
                          <div className="flex items-start gap-2 mb-3">
                            <span className="font-semibold text-lg">{index + 1}.</span>
                            <div className="flex-1">
                              <p className="font-medium mb-2">{question.question_text}</p>
                              <div className="text-sm text-gray-600 mb-2">
                                ({testConfig.points_per_question} point{testConfig.points_per_question !== 1 ? 's' : ''})
                              </div>
                              
                              {question.choices && question.question_type === 'mcq' && (
                                <div className="space-y-2 ml-4">
                                  {Object.entries(question.choices).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="w-6 h-6 border border-gray-400 rounded bg-white"></span>
                                      <span className="font-medium">{key}.</span>
                                      <span>{value as string}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {question.question_type === 'true_false' && (
                                <div className="space-y-2 ml-4">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 border border-gray-400 rounded bg-white"></span>
                                    <span>True</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 border border-gray-400 rounded bg-white"></span>
                                    <span>False</span>
                                  </div>
                                </div>
                              )}

                              {(question.question_type === 'essay' || question.question_type === 'short_answer') && (
                                <div className="ml-4 mt-4">
                                  <div className="border border-gray-300 p-4 bg-gray-50 min-h-[100px]">
                                    <div className="text-gray-400 text-sm">Write your answer here:</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4 mt-8">
                      <div>End of Test - Please review your answers</div>
                      <div className="mt-2">Version {version.version_label} | Generated on {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}

                {/* Version Comparison */}
                <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card">
                  <CardHeader>
                    <CardTitle>Version Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Question #</th>
                            {testVersions.map(version => (
                              <th key={version.version_label} className="text-center p-2">
                                Version {version.version_label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.min(10, selectedQuestions.length) }, (_, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2 font-medium">{index + 1}</td>
                              {testVersions.map(version => {
                                const question = version.questions[index];
                                return (
                                  <td key={version.version_label} className="p-2 text-center">
                                    {question ? (
                                      <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground">
                                          {question.topic}
                                        </div>
                                        <div className="text-xs">
                                          {question.question_text.substring(0, 30)}...
                                        </div>
                                        {question.correct_answer && (
                                          <Badge variant="outline" className="text-xs">
                                            {question.correct_answer}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Test History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Saved Test Versions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metadataLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading test history...</p>
                  </div>
                ) : testMetadata.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No saved tests</h3>
                    <p className="text-muted-foreground">Create and save your first multi-version test to see it here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testMetadata.map((test) => (
                      <Card key={test.id} className="border border-border/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-2">{test.title}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                <div>
                                  <span className="text-muted-foreground">Subject:</span>
                                  <p className="font-medium">{test.subject}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Questions:</span>
                                  <p className="font-medium">{test.total_questions}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Versions:</span>
                                  <p className="font-medium">{test.number_of_versions}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created:</span>
                                  <p className="font-medium">{new Date(test.created_at!).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline">
                                  {test.shuffle_questions ? 'Questions Shuffled' : 'Fixed Order'}
                                </Badge>
                                <Badge variant="outline">
                                  {test.shuffle_choices ? 'Choices Shuffled' : 'Fixed Choices'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                onClick={() => handleLoadSavedTest(test.id!)}
                                variant="outline"
                                size="sm"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                              <Button
                                onClick={() => deleteTest(test.id!)}
                                variant="outline"
                                size="sm"
                                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
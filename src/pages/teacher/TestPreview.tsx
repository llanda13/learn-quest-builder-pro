import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Printer, Download, FileText, Save, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PDFExporter } from '@/utils/exportPdf';

interface TestItem {
  id?: number;
  question_text?: string;
  question?: string;
  question_type?: string;
  type?: string;
  choices?: Record<string, string> | string[];
  options?: string[];
  correct_answer?: string | number;
  correctAnswer?: string | number;
  points?: number;
  difficulty?: string;
  bloom_level?: string;
  topic?: string;
  topicName?: string;
}

export default function TestPreview() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  useEffect(() => {
    if (testId) {
      fetchTest();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error) throw error;
      setTest(data);
    } catch (error) {
      console.error('Error fetching test:', error);
      toast({
        title: 'Error',
        description: 'Failed to load test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowAnswerKey(false);
    setTimeout(() => {
      window.print();
      setShowAnswerKey(true);
    }, 100);
  };

  const handleExportPDF = async () => {
    try {
      const result = await PDFExporter.exportToPDF('test-preview-content', {
        filename: `${test?.title || 'test'}.pdf`,
        orientation: 'portrait',
        format: 'a4',
        uploadToStorage: false,
      });
      
      PDFExporter.downloadBlob(result.blob, `${test?.title || 'test'}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Test exported to PDF successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
    }
  };

  const handleSaveTest = async () => {
    toast({
      title: 'Success',
      description: 'Test saved to My Tests',
    });
    navigate('/teacher/my-tests');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Test not found</p>
            <Button className="mt-4" onClick={() => navigate('/teacher/my-tests')}>
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items: TestItem[] = Array.isArray(test.items) ? test.items : [];
  const totalPoints = items.reduce((sum, item) => sum + (item.points || 1), 0);

  const questionsByType = items.reduce((acc, item) => {
    const type = item.question_type || item.type || 'Multiple Choice';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, TestItem[]>);

  const renderQuestionByType = (item: TestItem, index: number) => {
    const questionText = item.question_text || item.question || '';
    const type = item.question_type || item.type || 'Multiple Choice';
    const choices = item.choices || item.options || {};

    switch (type) {
      case 'Multiple Choice':
      case 'multiple-choice':
        return (
          <div key={index} className="mb-6">
            <p className="font-medium mb-2">{index + 1}. {questionText}</p>
            <div className="ml-6 space-y-1">
              {Object.entries(choices).map(([key, value]) => (
                <p key={key} className="text-sm">
                  {key}. {value}
                </p>
              ))}
            </div>
          </div>
        );

      case 'True or False':
      case 'true-false':
        return (
          <div key={index} className="mb-4">
            <p className="font-medium">
              {index + 1}. __________ {questionText}
            </p>
          </div>
        );

      case 'Fill in the Blank':
      case 'fill-blank':
        return (
          <div key={index} className="mb-4">
            <p className="font-medium">
              {index + 1}. {questionText.replace(/____/g, '__________')}
            </p>
          </div>
        );

      case 'Matching Type':
      case 'matching':
        return (
          <div key={index} className="mb-6">
            <p className="font-medium mb-2">{index + 1}. Match the items:</p>
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <p className="font-semibold text-sm mb-2">Column A</p>
                <div className="space-y-1">
                  {Object.entries(choices).slice(0, Math.ceil(Object.keys(choices).length / 2)).map(([key, value]) => (
                    <p key={key} className="text-sm">{key}. {value}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm mb-2">Column B</p>
                <div className="space-y-1">
                  {Object.entries(choices).slice(Math.ceil(Object.keys(choices).length / 2)).map(([key, value]) => (
                    <p key={key} className="text-sm">{key}. {value}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'Essay':
      case 'essay':
      case 'Short Answer':
        return (
          <div key={index} className="mb-6">
            <p className="font-medium mb-2">{index + 1}. {questionText}</p>
            <div className="ml-6 space-y-2">
              <div className="border-b border-muted h-8"></div>
              <div className="border-b border-muted h-8"></div>
              <div className="border-b border-muted h-8"></div>
            </div>
          </div>
        );

      default:
        return (
          <div key={index} className="mb-4">
            <p className="font-medium">{index + 1}. {questionText}</p>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={() => navigate('/teacher/my-tests')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tests
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAnswerKey(!showAnswerKey)}>
            {showAnswerKey ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showAnswerKey ? 'Hide' : 'Show'} Answer Key
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSaveTest}>
            <Save className="h-4 w-4 mr-2" />
            Save Test
          </Button>
        </div>
      </div>

      <div id="test-preview-content" className="bg-background">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-8">
            <div className="text-center space-y-2 border-b pb-6">
              <h1 className="text-2xl font-bold">PHILIPPINE SCHOOL</h1>
              <p className="text-sm text-muted-foreground">Excellence in Education</p>
              <Separator className="my-4" />
              <h2 className="text-xl font-semibold">{test.title || 'TEST EXAMINATION'}</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                <div className="text-left">
                  <p><span className="font-medium">Subject:</span> {test.subject || 'N/A'}</p>
                  <p><span className="font-medium">Course:</span> {test.course || 'N/A'}</p>
                  <p><span className="font-medium">Year & Section:</span> {test.year_section || 'N/A'}</p>
                </div>
                <div className="text-left">
                  <p><span className="font-medium">Examination Period:</span> {test.exam_period || 'N/A'}</p>
                  <p><span className="font-medium">School Year:</span> {test.school_year || 'N/A'}</p>
                  <p><span className="font-medium">Total Items:</span> {items.length} ({totalPoints} points)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-sm">
                <p><span className="font-medium">Prepared by:</span> _____________________</p>
                <p><span className="font-medium">Noted by:</span> _____________________</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">General Instructions:</h3>
              <div className="ml-6 space-y-1 text-sm">
                <p>• Write your Name, Section, and Student Number on your answer sheet</p>
                <p>• Read each item carefully before answering</p>
                <p>• For Multiple Choice: Encircle the letter of the correct answer</p>
                <p>• For True or False: Write TRUE or FALSE on the blank</p>
                <p>• For Fill in the Blank: Write the correct answer on the blank provided</p>
                <p>• For Matching Type: Write the letter of the correct match</p>
                <p>• For Essay: Answer in complete sentences with clear explanations</p>
                <p>• No cheating. Any form of dishonesty will result in automatic failure</p>
                <p>• {test.time_limit ? `Time Limit: ${test.time_limit} minutes` : 'Manage your time wisely'}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-8">
              {Object.entries(questionsByType).map(([type, questions]) => (
                <div key={type}>
                  <h3 className="text-lg font-semibold mb-4 uppercase">{type}</h3>
                  <div className="space-y-4">
                    {questions.map((item) => {
                      const globalIndex = items.indexOf(item);
                      return renderQuestionByType(item, globalIndex);
                    })}
                  </div>
                </div>
              ))}
            </div>

            {showAnswerKey && (
              <>
                <Separator className="my-8 print:hidden" />
                <div className="print:hidden bg-muted p-6 rounded-lg border-2 border-primary">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    ANSWER KEY (Teacher Copy Only)
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {items.map((item, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{index + 1}.</span>{' '}
                        <span className="text-primary font-semibold">
                          {item.correct_answer || item.correctAnswer || 'N/A'}
                        </span>
                        {item.points && item.points > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.points}pts)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="text-center text-xs text-muted-foreground pt-6 border-t">
              <p>This examination is property of the school. Unauthorized reproduction is prohibited.</p>
              <p className="mt-1">Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

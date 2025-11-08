import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wand2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IntelligentQuestionSelector } from '@/services/ai/intelligentSelector';

interface TOSRequirement {
  topic: string;
  bloomLevel: string;
  difficulty: string;
  count: number;
}

export default function IntelligentTestGenerator() {
  const [testName, setTestName] = useState('');
  const [requirements, setRequirements] = useState<TOSRequirement[]>([
    { topic: '', bloomLevel: 'remember', difficulty: 'easy', count: 5 }
  ]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const addRequirement = () => {
    setRequirements([...requirements, { topic: '', bloomLevel: 'remember', difficulty: 'easy', count: 5 }]);
  };

  const updateRequirement = (index: number, field: keyof TOSRequirement, value: string | number) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!testName.trim()) {
      toast({ title: 'Error', description: 'Please enter a test name', variant: 'destructive' });
      return;
    }

    if (requirements.some(r => !r.topic.trim())) {
      toast({ title: 'Error', description: 'All requirements must have a topic', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const selector = new IntelligentQuestionSelector();
      const tosRequirements = requirements.map(r => ({
        topic: r.topic,
        bloom_level: r.bloomLevel,
        difficulty: r.difficulty,
        count: r.count
      }));
      
      const result = await selector.selectQuestions(tosRequirements, user.id);

      // Create test record with proper structure - convert questions to plain objects
      const questionItems = result.selectedQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        choices: q.choices,
        correct_answer: q.correct_answer,
        bloom_level: q.bloom_level,
        difficulty: q.difficulty,
        topic: q.topic
      }));

      const { data: test, error: testError } = await supabase
        .from('generated_tests')
        .insert([{
          title: testName,
          created_by: user.id,
          items: questionItems as any,
          answer_key: questionItems.map((q, i) => ({
            number: i + 1,
            answer: q.correct_answer
          })) as any
        }])
        .select()
        .single();

      if (testError) throw testError;

      toast({
        title: 'Success',
        description: `Generated test with ${result.selectedQuestions.length} questions`,
      });

      navigate('/teacher/my-tests');
    } catch (error) {
      console.error('Error generating test:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate test',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6" />
            AI-Powered Test Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="testName">Test Name</Label>
            <Input
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Midterm Exam - Chapter 5"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Test Requirements</Label>
              <Button variant="outline" size="sm" onClick={addRequirement}>
                Add Requirement
              </Button>
            </div>

            {requirements.map((req, index) => (
              <Card key={index} className="p-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label>Topic</Label>
                    <Input
                      value={req.topic}
                      onChange={(e) => updateRequirement(index, 'topic', e.target.value)}
                      placeholder="e.g., Photosynthesis"
                    />
                  </div>
                  <div>
                    <Label>Bloom's Level</Label>
                    <Select
                      value={req.bloomLevel}
                      onValueChange={(value) => updateRequirement(index, 'bloomLevel', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remember">Remember</SelectItem>
                        <SelectItem value="understand">Understand</SelectItem>
                        <SelectItem value="apply">Apply</SelectItem>
                        <SelectItem value="analyze">Analyze</SelectItem>
                        <SelectItem value="evaluate">Evaluate</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select
                      value={req.difficulty}
                      onValueChange={(value) => updateRequirement(index, 'difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Count</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={req.count}
                        onChange={(e) => updateRequirement(index, 'count', parseInt(e.target.value))}
                      />
                      {requirements.length > 1 && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeRequirement(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Brain, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingQuestion {
  id: string;
  question_text: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  question_type: string;
  choices?: any;
  correct_answer: string;
  ai_confidence_score: number;
  created_at: string;
  metadata?: any;
}

export function PendingQuestionsPanel() {
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingQuestions();
  }, []);

  const fetchPendingQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('created_by', 'ai')
        .eq('status', 'pending')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingQuestions((data || []) as any);
    } catch (error) {
      console.error('Error fetching pending questions:', error);
      toast.error('Failed to load pending questions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (questionId: string) => {
    setProcessing(questionId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('questions')
        .update({
          approved: true,
          status: 'approved',
          approved_by: user?.id,
          approval_timestamp: new Date().toISOString()
        })
        .eq('id', questionId);

      if (error) throw error;

      toast.success('Question approved successfully');
      fetchPendingQuestions();
    } catch (error) {
      console.error('Error approving question:', error);
      toast.error('Failed to approve question');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (questionId: string) => {
    setProcessing(questionId);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          status: 'rejected',
          deleted: true
        })
        .eq('id', questionId);

      if (error) throw error;

      toast.success('Question rejected');
      fetchPendingQuestions();
    } catch (error) {
      console.error('Error rejecting question:', error);
      toast.error('Failed to reject question');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Pending AI-Generated Questions
          {pendingQuestions.length > 0 && (
            <Badge variant="secondary">{pendingQuestions.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingQuestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No pending questions to review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingQuestions.map((question) => (
              <div key={question.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{question.topic}</Badge>
                      <Badge variant="outline">{question.bloom_level}</Badge>
                      <Badge variant="outline">{question.difficulty}</Badge>
                      <Badge className="bg-purple-100 text-purple-800">
                        AI Confidence: {(question.ai_confidence_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-2">{question.question_text}</p>
                    
                    {question.question_type === 'mcq' && question.choices && (
                      <div className="ml-4 space-y-1">
                        {Object.entries(question.choices as Record<string, string>).map(([key, value]) => (
                          <div 
                            key={key} 
                            className={`text-sm ${
                              key === question.correct_answer
                                ? 'text-green-600 font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {key}. {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Generated {new Date(question.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(question.id)}
                      disabled={processing === question.id}
                      className="gap-2"
                    >
                      {processing === question.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(question.id)}
                      disabled={processing === question.id}
                      className="gap-2"
                    >
                      {processing === question.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

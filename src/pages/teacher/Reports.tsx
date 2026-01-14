import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, FileText, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Reports() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['report-stats'],
    queryFn: async () => {
      const [testsRes, studentsRes] = await Promise.all([
        supabase.from('generated_tests').select('*', { count: 'exact' }),
        supabase.from('test_assignments').select('student_id', { count: 'exact' })
      ]);

      return {
        testsGenerated: testsRes.count || 0,
        studentsAssessed: studentsRes.count || 0
      };
    }
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Usage Reports</h1>
          <p className="text-muted-foreground">
            Analyze your test generation and usage statistics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Tests Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.testsGenerated || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">This semester</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Students Assessed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.studentsAssessed || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all tests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                Avg Test Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <p className="text-xs text-muted-foreground mt-1">Class average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-500" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground mt-1">Test completion</p>
            </CardContent>
          </Card>
        </div>

        {/* AI-Assisted Test Generation - Moved from Dashboard */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Assisted Test Generation
            </CardTitle>
            <CardDescription>
              Generate tests automatically from your Table of Specifications. 
              The system will intelligently select or create non-redundant questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/teacher/generate-test")} className="w-full">
              Start Generating
            </Button>
          </CardContent>
        </Card>

        {/* TOS Management - Moved from Dashboard */}
        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => navigate("/teacher/tos")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              TOS Management
            </CardTitle>
            <CardDescription>
              Create and manage your Table of Specifications for structured test generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage TOS
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic Coverage</CardTitle>
            <CardDescription>Distribution of questions by topic</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
              Topic distribution chart will be implemented here
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

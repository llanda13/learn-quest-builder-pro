import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, BookOpen, Target, Brain } from 'lucide-react';

interface AnalyticsData {
  bloomDistribution: Array<{ name: string; value: number; color: string }>;
  difficultySpread: Array<{ name: string; value: number }>;
  topicDistribution: Array<{ name: string; value: number }>;
  questionUsage: Array<{ date: string; count: number }>;
  totalQuestions: number;
  approvedQuestions: number;
  pendingQuestions: number;
}

export default function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch questions data
      const { data: questions, error } = await supabase
        .from('questions')
        .select('bloom_level, difficulty, topic, approved, created_at, created_by');

      if (error) throw error;

      if (!questions) {
        setData({
          bloomDistribution: [],
          difficultySpread: [],
          topicDistribution: [],
          questionUsage: [],
          totalQuestions: 0,
          approvedQuestions: 0,
          pendingQuestions: 0
        });
        return;
      }

      // Process Bloom's distribution
      const bloomCounts: Record<string, number> = {};
      const bloomColors: Record<string, string> = {
        'Remembering': '#8884d8',
        'Understanding': '#82ca9d',
        'Applying': '#ffc658',
        'Analyzing': '#ff7c7c',
        'Evaluating': '#8dd1e1',
        'Creating': '#d084d0'
      };

      questions.forEach(q => {
        bloomCounts[q.bloom_level] = (bloomCounts[q.bloom_level] || 0) + 1;
      });

      const bloomDistribution = Object.entries(bloomCounts).map(([name, value]) => ({
        name,
        value,
        color: bloomColors[name] || '#8884d8'
      }));

      // Process difficulty spread
      const difficultyCounts: Record<string, number> = {};
      questions.forEach(q => {
        difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
      });

      const difficultySpread = Object.entries(difficultyCounts).map(([name, value]) => ({
        name,
        value
      }));

      // Process topic distribution
      const topicCounts: Record<string, number> = {};
      questions.forEach(q => {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
      });

      const topicDistribution = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      // Process question creation timeline
      const dateCounts: Record<string, number> = {};
      questions.forEach(q => {
        const date = new Date(q.created_at).toLocaleDateString();
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });

      const questionUsage = Object.entries(dateCounts)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-30) // Last 30 days
        .map(([date, count]) => ({ date, count }));

      // Calculate totals
      const totalQuestions = questions.length;
      const approvedQuestions = questions.filter(q => q.approved || q.created_by === 'teacher').length;
      const pendingQuestions = questions.filter(q => !q.approved && q.created_by === 'ai').length;

      setData({
        bloomDistribution,
        difficultySpread,
        topicDistribution,
        questionUsage,
        totalQuestions,
        approvedQuestions,
        pendingQuestions
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Questions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.approvedQuestions}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalQuestions > 0 ? Math.round((data.approvedQuestions / data.totalQuestions) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending AI Questions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingQuestions}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Question Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.questionUsage.length > 0 ? data.questionUsage[data.questionUsage.length - 1].count : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Questions created today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
            <CardDescription>
              Distribution of questions across cognitive levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.bloomDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.bloomDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Difficulty Distribution</CardTitle>
            <CardDescription>
              Questions by difficulty level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.difficultySpread}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Topics</CardTitle>
            <CardDescription>
              Most popular question topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topicDistribution} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Question Creation Timeline</CardTitle>
            <CardDescription>
              Questions created over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.questionUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
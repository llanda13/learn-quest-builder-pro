import { 
  FileText, 
  HelpCircle, 
  ClipboardList, 
  Users, 
  TrendingUp, 
  Brain,
  Award,
  Target
} from "lucide-react"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { RecentActivity } from "@/components/dashboard/RecentActivity"

const Index = () => {
  const stats = [
    {
      title: "Total Questions",
      value: "1,247",
      description: "Across all subjects",
      icon: HelpCircle,
      trend: { value: 12, isPositive: true }
    },
    {
      title: "Table of Specifications",
      value: "23",
      description: "Active blueprints",
      icon: FileText,
      trend: { value: 8, isPositive: true },
      gradient: true
    },
    {
      title: "Tests Generated",
      value: "156",
      description: "This month",
      icon: ClipboardList,
      trend: { value: 23, isPositive: true }
    },
    {
      title: "Active Users",
      value: "18",
      description: "Teachers & admins",
      icon: Users,
      trend: { value: 5, isPositive: true }
    },
  ]

  const bloomsDistribution = [
    { level: "Remember", count: 187, percentage: 15, color: "bg-blue-500" },
    { level: "Understand", count: 312, percentage: 25, color: "bg-green-500" },
    { level: "Apply", count: 249, percentage: 20, color: "bg-yellow-500" },
    { level: "Analyze", count: 187, percentage: 15, color: "bg-orange-500" },
    { level: "Evaluate", count: 156, percentage: 12.5, color: "bg-red-500" },
    { level: "Create", count: 156, percentage: 12.5, color: "bg-purple-500" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your test creation activities.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
        
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* Bloom's Taxonomy Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Bloom's Taxonomy Distribution</h3>
            </div>
            
            <div className="space-y-3">
              {bloomsDistribution.map((item) => (
                <div key={item.level} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.level}</span>
                    <span className="text-muted-foreground">{item.count} questions</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-card rounded-lg border p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Performance Metrics</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-medium text-sm">Question Quality</p>
                    <p className="text-xs text-muted-foreground">Average review score</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">4.8</p>
                  <p className="text-xs text-success">+0.3 this month</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium text-sm">Test Effectiveness</p>
                    <p className="text-xs text-muted-foreground">Based on feedback</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">92%</p>
                  <p className="text-xs text-success">+5% this month</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium text-sm">AI Assistance</p>
                    <p className="text-xs text-muted-foreground">Questions generated</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">342</p>
                  <p className="text-xs text-success">+89 this month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQualityMetrics } from "@/hooks/useQualityMetrics";
import { AuthProvider } from "./components/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import QuestionBankManager from "./pages/admin/QuestionBankManager";
import PendingApprovals from "./pages/admin/PendingApprovals";
import BulkImportPage from "./pages/admin/BulkImportPage";
import UserManagement from "./pages/admin/UserManagement";
import TOSPage from "./pages/teacher/TOSPage";
import IntelligentTestGenerator from "./pages/teacher/IntelligentTestGenerator";
import MyTests from "./pages/teacher/MyTests";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Initialize automated metrics collection
  useQualityMetrics();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Admin Routes - Professional Dark Theme */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Routes>
                      <Route index element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="question-bank" element={<QuestionBankManager />} />
                      <Route path="approvals" element={<PendingApprovals />} />
                      <Route path="bulk-import" element={<BulkImportPage />} />
                      <Route path="users" element={<UserManagement />} />
                    </Routes>
                  </ProtectedRoute>
                } 
              />
              
              {/* Teacher Routes - Clean Light Theme */}
              <Route 
                path="/teacher/*" 
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <Routes>
                      <Route index element={<Navigate to="/teacher/dashboard" replace />} />
                      <Route path="dashboard" element={<TeacherDashboard />} />
                      <Route path="tos" element={<TOSPage />} />
                      <Route path="generate-test" element={<IntelligentTestGenerator />} />
                      <Route path="my-tests" element={<MyTests />} />
                    </Routes>
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

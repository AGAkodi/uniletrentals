import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AgentSignup from "./pages/auth/AgentSignup";
import Search from "./pages/Search";
import PropertyDetail from "./pages/PropertyDetail";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import AgentDashboard from "./pages/dashboard/AgentDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AddProperty from "./pages/agent/AddProperty";
import AgentVerification from "./pages/agent/Verification";
import VerifyAgents from "./pages/admin/VerifyAgents";
import ApproveListings from "./pages/admin/ApproveListings";
import AdminReports from "./pages/admin/Reports";
import SetupAdmin from "./pages/admin/SetupAdmin";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/agent-signup" element={<AgentSignup />} />
            <Route path="/search" element={<Search />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/agent/add-property" element={<AddProperty />} />
            <Route path="/agent/verification" element={<AgentVerification />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/verify-agents" element={<VerifyAgents />} />
            <Route path="/admin/approve-listings" element={<ApproveListings />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

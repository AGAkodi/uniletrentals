import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import ManageAdmins from "./pages/admin/ManageAdmins";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import SavedProperties from "./pages/student/SavedProperties";
import MyBookings from "./pages/student/MyBookings";
import SharedRentals from "./pages/student/SharedRentals";
import CompareProperties from "./pages/student/CompareProperties";
import StudentProfile from "./pages/student/Profile";
import StudentBlog from "./pages/student/Blog";
import AgentProfile from "./pages/agent/Profile";
import AdminProfile from "./pages/admin/Profile";

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
            {/* Student Routes */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
            <Route path="/student/saved" element={<ProtectedRoute allowedRoles={['student']}><SavedProperties /></ProtectedRoute>} />
            <Route path="/student/bookings" element={<ProtectedRoute allowedRoles={['student']}><MyBookings /></ProtectedRoute>} />
            <Route path="/student/shared" element={<ProtectedRoute allowedRoles={['student']}><SharedRentals /></ProtectedRoute>} />
            <Route path="/student/compare" element={<ProtectedRoute allowedRoles={['student']}><CompareProperties /></ProtectedRoute>} />
            <Route path="/student/blog" element={<ProtectedRoute allowedRoles={['student']}><StudentBlog /></ProtectedRoute>} />
            
            {/* Agent Routes */}
            <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent']}><AgentDashboard /></ProtectedRoute>} />
            <Route path="/agent/profile" element={<ProtectedRoute allowedRoles={['agent']}><AgentProfile /></ProtectedRoute>} />
            <Route path="/agent/add-property" element={<ProtectedRoute allowedRoles={['agent']}><AddProperty /></ProtectedRoute>} />
            <Route path="/agent/verification" element={<ProtectedRoute allowedRoles={['agent']}><AgentVerification /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['admin']}><AdminProfile /></ProtectedRoute>} />
            <Route path="/admin/verify-agents" element={<ProtectedRoute allowedRoles={['admin']}><VerifyAgents /></ProtectedRoute>} />
            <Route path="/admin/approve-listings" element={<ProtectedRoute allowedRoles={['admin']}><ApproveListings /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/manage-admins" element={<ProtectedRoute allowedRoles={['admin']}><ManageAdmins /></ProtectedRoute>} />
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

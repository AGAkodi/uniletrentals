import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AgentSignup from "./pages/auth/AgentSignup";
import CheckEmail from "./pages/auth/CheckEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import CompleteStudentProfile from "./pages/auth/CompleteStudentProfile";
import CompleteAgentProfile from "./pages/auth/CompleteAgentProfile";
import Search from "./pages/Search";
import PropertyDetail from "./pages/PropertyDetail";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import AgentDashboard from "./pages/dashboard/AgentDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AddProperty from "./pages/agent/AddProperty";
import AgentVerification from "./pages/agent/Verification";
import AgentBookings from "./pages/agent/Bookings";
import AgentListings from "./pages/agent/Listings";
import AgentAnalytics from "./pages/agent/Analytics";
import EditProperty from "./pages/agent/EditProperty";
import VerifyAgents from "./pages/admin/VerifyAgents";
import ApproveListings from "./pages/admin/ApproveListings";
import AdminReports from "./pages/admin/Reports";
import SetupAdmin from "./pages/admin/SetupAdmin";
import ManageAdmins from "./pages/admin/ManageAdmins";
import ManageSharedRentals from "./pages/admin/ManageSharedRentals";
import ManageAgents from "./pages/admin/ManageAgents";
import ManageBlogs from "./pages/admin/ManageBlogs";
import EditBlog from "./pages/admin/EditBlog";
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
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="unilet-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                <Route path="/auth/agent-signup" element={<AgentSignup />} />
                <Route path="/auth/check-email" element={<CheckEmail />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/auth/complete-student-profile" element={<CompleteStudentProfile />} />
                <Route path="/auth/complete-agent-profile" element={<CompleteAgentProfile />} />
                <Route path="/search" element={<Search />} />
                <Route path="/property/:id" element={<PropertyDetail />} />
                {/* Student Routes */}
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/profile" element={<StudentProfile />} />
                <Route path="/student/saved" element={<SavedProperties />} />
                <Route path="/student/bookings" element={<MyBookings />} />
                <Route path="/student/shared" element={<SharedRentals />} />
                <Route path="/student/compare" element={<CompareProperties />} />
                <Route path="/student/blog" element={<StudentBlog />} />
                <Route path="/notifications" element={<Notifications />} />

                {/* Agent Routes */}
                <Route path="/agent/dashboard" element={<AgentDashboard />} />
                <Route path="/agent/profile" element={<AgentProfile />} />
                <Route path="/agent/add-property" element={<AddProperty />} />
                <Route path="/agent/verification" element={<AgentVerification />} />
                <Route path="/agent/bookings" element={<AgentBookings />} />
                <Route path="/agent/listings" element={<AgentListings />} />
                <Route path="/agent/analytics" element={<AgentAnalytics />} />
                <Route path="/agent/edit-property/:id" element={<EditProperty />} />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="/admin/profile" element={
                  <AdminRoute>
                    <AdminProfile />
                  </AdminRoute>
                } />
                <Route path="/admin/verify-agents" element={
                  <AdminRoute requiredPermission="manage_agents">
                    <VerifyAgents />
                  </AdminRoute>
                } />
                <Route path="/admin/approve-listings" element={
                  <AdminRoute requiredPermission="manage_listings">
                    <ApproveListings />
                  </AdminRoute>
                } />
                <Route path="/admin/reports" element={
                  <AdminRoute requiredPermission="manage_reports">
                    <AdminReports />
                  </AdminRoute>
                } />
                <Route path="/admin/manage-admins" element={
                  <AdminRoute requiredPermission="manage_admins">
                    <ManageAdmins />
                  </AdminRoute>
                } />
                <Route path="/admin/manage-agents" element={
                  <AdminRoute requiredPermission="manage_agents">
                    <ManageAgents />
                  </AdminRoute>
                } />
                <Route path="/admin/shared-rentals" element={
                  <AdminRoute requiredPermission="manage_listings">
                    <ManageSharedRentals />
                  </AdminRoute>
                } />
                <Route path="/admin/manage-blogs" element={
                  <AdminRoute requiredPermission="manage_blogs">
                    <ManageBlogs />
                  </AdminRoute>
                } />
                <Route path="/admin/create-blog" element={
                  <AdminRoute requiredPermission="manage_blogs">
                    <EditBlog />
                  </AdminRoute>
                } />
                <Route path="/admin/edit-blog/:id" element={
                  <AdminRoute requiredPermission="manage_blogs">
                    <EditBlog />
                  </AdminRoute>
                } />
                <Route path="/setup-admin" element={<SetupAdmin />} />

                {/* Public Routes */}
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

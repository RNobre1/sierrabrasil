import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Contact from "./pages/Contact";
import ClientLayout from "./components/layouts/ClientLayout";
import AdminLayout from "./components/layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import ConversationDetail from "./pages/ConversationDetail";
import AttendantConfig from "./pages/AttendantConfig";
import AgentDetail from "./pages/AgentDetail";
import AttendantPlayground from "./pages/AttendantPlayground";
import Reports from "./pages/Reports";
import Account from "./pages/Account";
import Agents from "./pages/Agents";
import Channels from "./pages/Channels";
import Integrations from "./pages/Integrations";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminAttendants from "./pages/admin/AdminAttendants";
import AdminConsumption from "./pages/admin/AdminConsumption";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/contact" element={<Contact />} />

            {/* Client Routes */}
            <Route element={<ProtectedRoute><ClientLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/conversations/:id" element={<ConversationDetail />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/attendant/config" element={<AttendantConfig />} />
              <Route path="/attendant/playground" element={<AttendantPlayground />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/account" element={<Account />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/tenants" element={<AdminTenants />} />
              <Route path="/admin/attendants" element={<AdminAttendants />} />
              <Route path="/admin/consumption" element={<AdminConsumption />} />
              <Route path="/admin/integrations" element={<Integrations />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

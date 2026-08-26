import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from '../../components/layout/admin-shell.tsx'
import { ProtectedRoute } from '../../components/ui/protected-route.tsx'
import { PublicOnlyRoute } from '../../components/ui/public-only-route.tsx'
import { RoleRoute } from '../../components/ui/role-route.tsx'
import { AdminCenterPage } from '../../pages/admin-center-page.tsx'
import { DashboardPage } from '../../pages/dashboard-page.tsx'
import { EmployeeProfilePage } from '../../pages/employee-profile-page.tsx'
import { EmployeesPage } from '../../pages/employees-page.tsx'
import { FinancePage } from '../../pages/finance-page.tsx'
import { InventoryPage } from '../../pages/inventory-page.tsx'
import { LoginPage } from '../../pages/login-page.tsx'
import { NotFoundPage } from '../../pages/not-found-page.tsx'
import { MySpacePage } from '../../pages/my-space-page.tsx'
import { PaymentsPage } from '../../pages/payments-page.tsx'
import { ProductsPage } from '../../pages/products-page.tsx'
import { CutsPage } from '../../pages/cuts-page.tsx'
import { ReportsPage } from '../../pages/reports-page.tsx'
import { SalesPage } from '../../pages/sales-page.tsx'
import { SettingsPage } from '../../pages/settings-page.tsx'
import { VehiclesPage } from '../../pages/vehicles-page.tsx'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-space" element={<MySpacePage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/cuts" element={<CutsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route element={<RoleRoute allowedRoles={['administrator']} />}>
            <Route path="/admin" element={<AdminCenterPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/:employeeId" element={<EmployeeProfilePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppDataProvider } from './app/providers/app-data-provider.tsx'
import { AuthProvider } from './app/providers/auth-provider.tsx'
import { FeedbackProvider } from './app/providers/feedback-provider.tsx'
import { QueryProvider } from './app/providers/query-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <FeedbackProvider>
            <AppDataProvider>
              <App />
            </AppDataProvider>
          </FeedbackProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Datos frescos por 5 minutos
      gcTime: 1000 * 60 * 30,    // Conservar en memoria 30 minutos
      refetchOnWindowFocus: false, // Evita recargas innecesarias
      retry: 1,                   // Reintentar 1 vez en caso de fallo de red
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

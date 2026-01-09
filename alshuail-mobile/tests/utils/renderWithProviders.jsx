import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { DataCacheProvider } from '../../src/contexts/DataCacheContext'

// Render component with React Router
export function renderWithRouter(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>{children}</BrowserRouter>
    ),
    ...options
  })
}

// Render component with all providers (Router + DataCache)
export function renderWithProviders(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <DataCacheProvider>
          {children}
        </DataCacheProvider>
      </BrowserRouter>
    ),
    ...options
  })
}

// Create a custom wrapper with specific route
export function createRouterWrapper(initialRoute = '/') {
  window.history.pushState({}, 'Test page', initialRoute)

  return ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )
}

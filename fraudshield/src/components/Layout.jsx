import { Sidebar } from './Sidebar.jsx'

export function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="grid-bg min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
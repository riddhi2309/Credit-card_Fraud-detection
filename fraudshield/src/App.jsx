import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout.jsx'
import Landing from '@/pages/Landing.jsx'
import Dashboard from '@/pages/Dashboard.jsx'
import BatchUpload from '@/pages/BatchUpload.jsx'
import Playground from '@/pages/Playground.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/batch" element={<BatchUpload />} />
          <Route path="/playground" element={<Playground />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
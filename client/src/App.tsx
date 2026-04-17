// ABOUTME: Root application component.
// ABOUTME: Renders the market dashboard and email signup form.

import { Dashboard } from './Dashboard'
import { EmailSignup } from './EmailSignup'

function App() {
  return (
    <>
      <Dashboard />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 40px' }}>
        <EmailSignup />
      </div>
    </>
  )
}

export default App

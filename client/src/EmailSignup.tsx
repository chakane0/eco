// ABOUTME: Email signup form for the weekly market digest.
// ABOUTME: Validates email client-side and submits to the subscriber API.

import { useState } from 'react';
import { subscribe } from './api';
import styles from '../src/Styles/EmailSignup.module.css';

export function EmailSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setStatus('loading')
    try {
      await subscribe(email)
      setStatus('success')
      setMessage('You\'re subscribed! Watch for the weekly digest.')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Stay informed</h2>
      <p className={styles.subtitle}>
        Get the top 5 market movers with AI insights delivered weekly.
      </p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={styles.input}
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className={styles.button}
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {status === 'success' && <p className={styles.success}>{message}</p>}
      {status === 'error' && <p className={styles.error}>{message}</p>}
    </div>
  )
}

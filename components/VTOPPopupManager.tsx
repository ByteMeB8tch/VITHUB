// components/VTOPPopupManager.tsx - Manage VTOP login popup window
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'

interface VTOPPopupManagerProps {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  userId: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VTOPPopupManager({
  onSuccess,
  onError,
  userId,
  isOpen = false,
  onOpenChange,
}: VTOPPopupManagerProps) {
  const [isOpen_, setIsOpen_] = useState(isOpen)
  const [status, setStatus] = useState<'idle' | 'opening' | 'waiting' | 'scraping' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const popupRef = useRef<Window | null>(null)
  const popupCheckIntervalRef = useRef<NodeJS.Timeout>()

  const isOpen_ = isOpen !== undefined ? isOpen : isOpen_
  const setIsOpen = isOpen !== undefined ? onOpenChange! : setIsOpen_

  /**
   * Open VTOP login popup
   */
  const openVTOPPopup = useCallback(() => {
    console.log('[VTOP-POPUP] Opening VTOP login popup')
    setStatus('opening')
    setErrorMessage('')

    const vtopUrl = process.env.NEXT_PUBLIC_VTOP_URL || 'https://vtop.vit.ac.in'
    const popupWidth = 500
    const popupHeight = 700
    const left = window.screenX + (window.outerWidth - popupWidth) / 2
    const top = window.screenY + (window.outerHeight - popupHeight) / 2

    // Open popup window
    const popup = window.open(
      `${vtopUrl}/login`,
      'VTOPLogin',
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
    )

    if (!popup) {
      console.error('[VTOP-POPUP] Popup blocked by browser')
      setStatus('error')
      setErrorMessage('Popup was blocked. Please disable popup blockers and try again.')
      onError?.('Popup blocked')
      return
    }

    popupRef.current = popup

    // Focus popup
    try {
      popup.focus()
    } catch (e) {
      console.log('[VTOP-POPUP] Could not focus popup (cross-origin)')
    }

    setStatus('waiting')

    // Check for popup closure and message communication
    popupCheckIntervalRef.current = setInterval(() => {
      if (popup.closed) {
        clearInterval(popupCheckIntervalRef.current)
        console.log('[VTOP-POPUP] Popup closed')
        setStatus('idle')
        // Don't close dialog yet - wait for scraping to complete
      }
    }, 500)
  }, [onError])

  /**
   * Handle message from popup (PostMessage API)
   */
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      const allowedOrigin = process.env.NEXT_PUBLIC_VTOP_URL || 'https://vtop.vit.ac.in'
      if (!event.origin.includes(allowedOrigin) && event.origin !== window.location.origin) {
        console.warn('[VTOP-POPUP] Ignoring message from untrusted origin:', event.origin)
        return
      }

      console.log('[VTOP-POPUP] Received message:', event.data?.type)

      if (event.data?.type === 'VTOP_LOGIN_SUCCESS') {
        const { registrationNo, cookies, sessionData } = event.data
        console.log('[VTOP-POPUP] Login success:', registrationNo)

        setStatus('scraping')

        try {
          // Create session on backend
          const sessionResponse = await fetch('/api/vtop-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              registrationNo,
              cookies,
              sessionData,
              userAgent: navigator.userAgent,
              ipAddress: await getClientIP(),
            }),
          })

          if (!sessionResponse.ok) {
            throw new Error('Failed to create session')
          }

          const { sessionId } = await sessionResponse.json()

          // Initialize connection
          await fetch('/api/vtop-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              registrationNo,
              autoRefresh: false,
            }),
          })

          // Start scraping
          const scrapeResponse = await fetch('/api/vtop-scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              registrationNo,
              sessionId,
            }),
          })

          if (!scrapeResponse.ok) {
            throw new Error('Failed to scrape VTOP data')
          }

          const scrapeData = await scrapeResponse.json()
          console.log('[VTOP-POPUP] Scraping success')

          setStatus('success')
          onSuccess?.(scrapeData.data)

          // Close popup
          if (popupRef.current) {
            popupRef.current.close()
          }

          // Close dialog after 2 seconds
          setTimeout(() => {
            setIsOpen(false)
          }, 2000)
        } catch (error: any) {
          console.error('[VTOP-POPUP] Error processing login:', error)
          setStatus('error')
          setErrorMessage(error.message || 'Failed to process login')
          onError?.(error.message)
        }
      } else if (event.data?.type === 'VTOP_LOGIN_ERROR') {
        console.error('[VTOP-POPUP] Login error:', event.data.error)
        setStatus('error')
        setErrorMessage(event.data.error || 'Login failed')
        onError?.(event.data.error)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [userId, onSuccess, onError, setIsOpen])

  /**
   * Get client IP address
   */
  async function getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return undefined
    }
  }

  /**
   * Handle popup open
   */
  useEffect(() => {
    if (isOpen_ && status === 'idle') {
      openVTOPPopup()
    }
  }, [isOpen_])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current)
      }
      if (popupRef.current) {
        popupRef.current.close()
      }
    }
  }, [])

  return (
    <Dialog open={isOpen_} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect VTOP Account</DialogTitle>
          <DialogDescription>
            {status === 'idle' && 'Click the button below to login to VTOP'}
            {status === 'opening' && 'Opening VTOP login...'}
            {status === 'waiting' && 'Please complete your login in the popup window'}
            {status === 'scraping' && 'Fetching your data from VTOP...'}
            {status === 'success' && 'Successfully connected!'}
            {status === 'error' && 'An error occurred'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          {status === 'idle' && (
            <Button onClick={openVTOPPopup} size="lg" className="w-full">
              Open VTOP Login
            </Button>
          )}

          {status === 'opening' && (
            <div className="flex flex-col items-center space-y-2">
              <Loader className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600">Opening VTOP...</p>
            </div>
          )}

          {status === 'waiting' && (
            <div className="flex flex-col items-center space-y-2">
              <Loader className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600">Waiting for login completion...</p>
              <p className="text-xs text-gray-500 text-center">
                If the popup didn't open, please{' '}
                <button className="text-blue-500 underline" onClick={openVTOPPopup}>
                  click here to try again
                </button>
              </p>
            </div>
          )}

          {status === 'scraping' && (
            <div className="flex flex-col items-center space-y-2">
              <Loader className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600">Fetching your data...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-green-600">Success!</p>
              <p className="text-xs text-gray-600">Your VTOP account has been connected.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-3 w-full">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium text-red-600">Connection Failed</p>
              <p className="text-xs text-gray-600 text-center">{errorMessage}</p>
              <div className="flex gap-2 w-full pt-2">
                <Button
                  onClick={() => {
                    setStatus('idle')
                    setErrorMessage('')
                  }}
                  size="sm"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Manual fallback option */}
        <div className="border-t pt-4">
          <details className="text-xs cursor-pointer">
            <summary className="text-gray-600 hover:text-gray-900">
              Popup not working? Try manual method
            </summary>
            <div className="mt-2 text-gray-600 space-y-1">
              <p>1. Visit VTOP manually at {process.env.NEXT_PUBLIC_VTOP_URL || 'https://vtop.vit.ac.in'}</p>
              <p>2. Login with your credentials</p>
              <p>3. Your data will sync automatically (may take a few minutes)</p>
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  )
}

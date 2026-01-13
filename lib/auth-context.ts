// Centralized auth utilities to prevent race conditions

export interface AuthState {
  isAuthenticated: boolean
  studentData: any
  isLoading: boolean
  hasChecked: boolean // Flag to ensure we only check once
}

let authCheckInProgress = false

export async function checkAuthenticationStatus(): Promise<{
  isAuthenticated: boolean
  studentData: any | null
}> {
  // Prevent multiple simultaneous checks
  if (authCheckInProgress) {
    return {
      isAuthenticated: false,
      studentData: null,
    }
  }

  authCheckInProgress = true

  try {
    // Check sessionStorage first
    const storedData = sessionStorage.getItem('vitStudentData')
    
    if (storedData) {
      try {
        const studentData = JSON.parse(storedData)
        
        // Validate data structure
        if (studentData.registrationNo && studentData.name) {
          return {
            isAuthenticated: true,
            studentData,
          }
        }
      } catch (parseError) {
        console.error('[Auth] Failed to parse stored data:', parseError)
        sessionStorage.removeItem('vitStudentData')
      }
    }

    return {
      isAuthenticated: false,
      studentData: null,
    }
  } finally {
    authCheckInProgress = false
  }
}

export function clearAuthStorage() {
  sessionStorage.removeItem('vitStudentData')
  sessionStorage.removeItem('dataSessionId')
  sessionStorage.removeItem('vitSessionToken')
  localStorage.removeItem('vitStudentData')
}

export function saveAuthData(studentData: any) {
  try {
    sessionStorage.setItem('vitStudentData', JSON.stringify(studentData))
    if (studentData.dataSessionId) {
      sessionStorage.setItem('dataSessionId', studentData.dataSessionId)
    }
    if (studentData.sessionToken) {
      sessionStorage.setItem('vitSessionToken', studentData.sessionToken)
    }
  } catch (error) {
    console.error('[Auth] Failed to save auth data:', error)
  }
}

export function getStoredAuthData() {
  try {
    const data = sessionStorage.getItem('vitStudentData')
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('[Auth] Failed to get stored auth data:', error)
    return null
  }
}

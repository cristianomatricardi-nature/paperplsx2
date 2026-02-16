

## Fix: Google Sign-In Redirect Issue

### Problem
Google OAuth sign-in completes successfully (confirmed in backend logs), but the AuthPage does not redirect the user to `/researcher-home` after the session is established. The page just stays on `/auth`.

### Root Cause
The `AuthPage` component lacks a check for an already-authenticated user. After the Google OAuth flow completes and the session is set, `onAuthStateChange` fires in the `useAuth` hook, but nothing in `AuthPage` reacts to it by navigating away.

### Solution
Add an effect in `AuthPage.tsx` that watches the auth state and redirects to `/researcher-home` when a user session is detected.

---

### Technical Details

**File: `src/pages/AuthPage.tsx`**

1. Import and use the `useAuth` hook
2. Add a `useEffect` that checks if the user is authenticated and redirects to `/researcher-home`

```typescript
import { useAuth } from '@/hooks/useAuth';

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/researcher-home', { replace: true });
    }
  }, [user, loading, navigate]);

  // ... rest of component
};
```

This single change ensures that:
- After Google OAuth returns and the session is set, the user is automatically sent to `/researcher-home`
- If someone visits `/auth` while already logged in, they are redirected immediately
- The email/password `handleSignIn` existing `navigate('/researcher-home')` continues working as before


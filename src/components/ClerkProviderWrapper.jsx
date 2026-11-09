import { ClerkProvider, useUser, useClerk } from '@clerk/react';
import { AuthContext } from '../context/AuthContext';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.CLERK_PUBLISHABLE_KEY;
const HAS_CLERK = Boolean(CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith('pk_'));

function ClerkBridge({ children }) {
  const { isSignedIn, user } = useUser();
  const clerk = useClerk();

  const handleOpenSignIn = () => {
    if (clerk?.openSignIn) {
      clerk.openSignIn();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        hasClerk: true,
        isSignedIn: Boolean(isSignedIn),
        user,
        openSignIn: handleOpenSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default function ClerkProviderWrapper({ children }) {
  if (HAS_CLERK) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <ClerkBridge>{children}</ClerkBridge>
      </ClerkProvider>
    );
  }

  // Gracefully provide fallback auth context when Clerk key is not provided
  return (
    <AuthContext.Provider
      value={{
        hasClerk: false,
        isSignedIn: false,
        user: null,
        openSignIn: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

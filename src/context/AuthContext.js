import { createContext, useContext } from 'react';

export const AuthContext = createContext({
  hasClerk: false,
  isSignedIn: false,
  user: null,
  openSignIn: () => {},
});

export const useAuth = () => useContext(AuthContext);


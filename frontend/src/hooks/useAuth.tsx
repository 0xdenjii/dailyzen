import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AuthToken } from "@/lib/auth";
import { UserPublic } from "@/types";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: UserPublic | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(AuthToken.get());

  // The query to fetch the current user based on the token.
  // It is enabled only when a token is present.
  const {
    data: user,
    isLoading: isUserLoading,
    isError,
  } = useQuery<UserPublic>({
    queryKey: ["currentUser"],
    queryFn: () => apiClient.get("/users/me"),
    enabled: !!token, // Only run this query if the token exists
    retry: 1, // Don't retry aggressively on auth errors
  });

  // Effect to handle token changes and errors
  useEffect(() => {
    if (isError) {
      // If the token is invalid, log the user out
      logout();
    }
  }, [isError]);
  
  const login = (newToken: string) => {
    AuthToken.set(newToken);
    setToken(newToken);
    // After logging in, we want to refetch the user data
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };

  const logout = () => {
    AuthToken.remove();
    setToken(null);
    // Remove all cached data on logout for security
    queryClient.clear();
    // Redirect to login page
    navigate("/login");
  };

  const value = {
    user: user || null,
    isLoading: isUserLoading && !!token, // Only be in a loading state if we are actively fetching a user
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// The custom hook that components will use to access the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
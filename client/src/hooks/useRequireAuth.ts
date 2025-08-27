import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export function useRequireAuth(allowedRoles?: string[]) {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // User will be redirected to login by the routing logic
      return;
    }

    if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // User doesn't have required role
      console.warn(`Access denied. Required roles: ${allowedRoles.join(", ")}, user role: ${user.role}`);
    }
  }, [user, isAuthenticated, isLoading, allowedRoles]);

  return {
    user,
    isAuthenticated,
    isLoading,
    hasRequiredRole: user ? (allowedRoles ? allowedRoles.includes(user.role) : true) : false,
  };
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { CounterProvider } from "@/features/counter/CounterProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AuthProvider>
          <CounterProvider>{children}</CounterProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

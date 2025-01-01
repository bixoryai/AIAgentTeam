import { createContext, useContext, useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeContext = createContext<ReturnType<typeof useTheme> | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useTheme();

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Set theme variant
    root.classList.remove("theme-professional", "theme-tint", "theme-vibrant");
    root.classList.add(`theme-${theme.theme.variant}`);
    
    // Set appearance
    const isDark = theme.theme.appearance === "dark" || 
      (theme.theme.appearance === "system" && 
       window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
  }, [theme.theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

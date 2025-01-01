import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Theme {
  variant: "professional" | "tint" | "vibrant";
  primary: string;
  appearance: "light" | "dark" | "system";
  radius: number;
}

async function getTheme(): Promise<Theme> {
  const response = await fetch("/api/theme");
  if (!response.ok) {
    throw new Error("Failed to fetch theme");
  }
  return response.json();
}

async function updateTheme(theme: Theme): Promise<Theme> {
  const response = await fetch("/api/theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(theme),
  });
  if (!response.ok) {
    throw new Error("Failed to update theme");
  }
  return response.json();
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>({
    variant: "professional",
    primary: "hsl(222.2 47.4% 11.2%)",
    appearance: "light",
    radius: 0.5,
  });

  const { data } = useQuery({
    queryKey: ["/api/theme"],
    queryFn: getTheme,
  });

  const mutation = useMutation({
    mutationFn: updateTheme,
  });

  useEffect(() => {
    if (data) {
      setThemeState(data);
    }
  }, [data]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    mutation.mutate(newTheme);
  };

  return {
    theme,
    setTheme,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

import logoLight from "@/imports/logo_vertical-1.png";
import logoDark from "@/imports/Gemini_Generated_Image_wmqm8lwmqm8lwmqm.png";
import { useTheme } from "@/lib/theme";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const heights: Record<string, string> = {
  xs: "h-8",
  sm: "h-12",
  md: "h-16",
  lg: "h-24",
  xl: "h-32",
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const { theme } = useTheme();
  return (
    <img
      src={theme === "dark" ? logoDark : logoLight}
      alt="EmpleoNow — Donde empiezan las oportunidades"
      className={`object-contain ${heights[size]} ${className}`}
    />
  );
}

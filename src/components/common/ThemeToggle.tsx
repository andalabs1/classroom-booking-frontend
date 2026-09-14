import { Button, Tooltip } from "antd";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";

export function ThemeToggle({ className }: { className?: string }) {
  const mode = useThemeStore((state) => state.mode);
  const toggle = useThemeStore((state) => state.toggle);
  const { i18n } = useTranslation();
  const dark = mode === "dark";
  const label =
    i18n.language === "th"
      ? dark
        ? "เปลี่ยนเป็นโหมดสว่าง"
        : "เปลี่ยนเป็นโหมดมืด"
      : dark
        ? "Switch to light mode"
        : "Switch to dark mode";
  return (
    <Tooltip title={label}>
      <Button
        className={className}
        type="text"
        aria-label={label}
        aria-pressed={dark}
        icon={dark ? <Sun size={19} /> : <Moon size={19} />}
        onClick={toggle}
      />
    </Tooltip>
  );
}

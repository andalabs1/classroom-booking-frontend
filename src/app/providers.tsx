import { useThemeStore } from "../stores/themeStore";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect } from "react";
import { ConfigProvider, App } from "antd";
import thTH from "antd/locale/th_TH";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/th";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getAppTheme } from "../config/themeConfig";
import { queryClient } from "./queryClient";
export function Providers({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);
  dayjs.locale(i18n.language === "th" ? "th" : "en");
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === "classroom-database-v1") {
        void queryClient.invalidateQueries({ queryKey: ["database"] });
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={getAppTheme(mode)}
        locale={i18n.language === "th" ? thTH : enUS}
      >
        <App>{children}</App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

import { useThemeStore } from "../shared/stores/themeStore";
import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { ConfigProvider, App } from "antd";
import thTH from "antd/locale/th_TH";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/th";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getAppTheme } from "../shared/config/themeConfig";
import { queryClient } from "./queryClient";
/**
 * ผูก React Query, Ant Design และภาษาเข้ากับทุกหน้า
 * ซิงก์โหมดธีมกับ document ก่อน browser วาด และตั้ง locale ของ dayjs ตามภาษาปัจจุบัน
 */
export function Providers({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);
  dayjs.locale(i18n.language === "th" ? "th" : "en");
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

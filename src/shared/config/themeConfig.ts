import { theme, type ThemeConfig } from "antd";
export const colors = {
  primary: "#8C56D4",
  secondary: "#DC95FF",
  pink: "#FFBEFB",
  cream: "#FFF4BF",
  green: "#399876",
  muted: "#9690A0",
};

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: colors.primary,
    borderRadius: 8,
    fontFamily: "Sarabun, sans-serif",
    colorText: "#302C3A",
    colorTextSecondary: "#827B8C",
    colorBorder: "#E9E5EF",
    controlHeight: 42,
    fontSize: 14,
  },
  components: {
    Button: { primaryShadow: "none" },
    // สีหัวตารางทุกหน้าอ่านจาก global.css ซึ่งสลับค่าตาม data-theme บน document
    Table: {
      headerBg: "var(--table-header-bg)",
      headerColor: "var(--table-header-color)",
      cellPaddingBlock: 16,
    },
    Select: { optionSelectedBg: "#F1E9FC" },
  },
};

/**
 * คืน Ant Design theme ตาม light/dark โดยต่อยอด token และ component config กลาง
 */
export function getAppTheme(mode: "light" | "dark"): ThemeConfig {
  if (mode === "light")
    return { ...appTheme, algorithm: theme.defaultAlgorithm };
  return {
    ...appTheme,
    algorithm: theme.darkAlgorithm,
    token: {
      ...appTheme.token,
      colorPrimary: "#B78AEE",
      colorText: "#EEE9F5",
      colorTextSecondary: "#B2A8BF",
      colorBorder: "#40364D",
      colorBgBase: "#16131D",
      colorBgLayout: "#16131D",
      colorBgContainer: "#211C2A",
      colorBgElevated: "#2A2335",
      colorTextPlaceholder: "#968AA5",
    },
    components: {
      ...appTheme.components,
      Select: { optionSelectedBg: "#3B2D4E" },
    },
  };
}

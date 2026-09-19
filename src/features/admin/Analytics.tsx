import { theme } from "antd";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";
import ReactECharts from "echarts-for-react/esm/core";
import * as echarts from "echarts/core";
import { LineChart, BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
import type { EChartsOption } from "echarts";
import dayjs from "dayjs";
import type { Booking, Room } from "../../types";
import { getBookingLabels } from "../../constants/bookingStatus";
import { colors } from "../../config/themeConfig";
import { Panel } from "../../components/common/Common";
import styles from "./Admin.module.css";
export function Analytics({
  bookings,
  rooms,
  start,
  end,
  report = false,
}: {
  bookings: Booking[];
  rooms: Room[];
  start: string;
  end: string;
  report?: boolean;
}) {
  const { t } = useTranslation();
  const bookingLabels = getBookingLabels(t);
  const { token } = theme.useToken();
  const dark = useThemeStore((state) => state.mode === "dark");
  const days = Array.from(
    {
      length: Math.min(
        366,
        Math.max(1, dayjs(end).diff(dayjs(start), "day") + 1),
      ),
    },
    (_, i) => dayjs(start).add(i, "day").format("YYYY-MM-DD"),
  );
  const top = rooms
    .map((r) => ({
      name: r.code,
      value: bookings.filter((b) => b.roomId === r.id).length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const base: EChartsOption = {
    color: [
      colors.primary,
      colors.secondary,
      colors.pink,
      colors.cream,
      colors.muted,
    ],
    textStyle: { fontFamily: "Sarabun", color: token.colorTextSecondary },
    tooltip: {
      trigger: "axis",
      backgroundColor: token.colorBgElevated,
      borderColor: token.colorBorder,
      textStyle: { color: token.colorText },
    },
    grid: { left: 38, right: 18, top: 20, bottom: 35 },
  };
  const trend: EChartsOption = {
    ...base,
    xAxis: {
      axisLabel: { color: token.colorTextSecondary },
      type: "category",
      data: days.map((d) => dayjs(d).format("DD MMM")),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      axisLabel: { color: token.colorTextSecondary },
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: token.colorBorderSecondary } },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: days.map((d) => bookings.filter((b) => b.date === d).length),
        areaStyle: { color: dark ? "#362746" : "#f4ecfc" },
        lineStyle: { width: 3 },
        symbolSize: 6,
      },
    ],
  };
  const donut: EChartsOption = {
    ...base,
    tooltip: {
      trigger: "item",
      backgroundColor: token.colorBgElevated,
      borderColor: token.colorBorder,
      textStyle: { color: token.colorText },
    },
    legend: {
      bottom: 0,
      textStyle: {
        fontSize: 11,
        fontFamily: "Sarabun",
        color: token.colorTextSecondary,
      },
    },
    series: [
      {
        type: "pie",
        radius: ["48%", "70%"],
        center: ["50%", "43%"],
        label: { show: false },
        data: Object.entries(bookingLabels).map(([status, name]) => ({
          name,
          value: bookings.filter((b) => b.status === status).length,
        })),
        itemStyle: {
          borderColor: token.colorBgContainer,
          borderWidth: 4,
          borderRadius: 4,
        },
      },
    ],
  };
  const bar: EChartsOption = {
    ...base,
    xAxis: {
      axisLabel: { color: token.colorTextSecondary },
      type: "category",
      data: top.map((r) => r.name),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      axisLabel: { color: token.colorTextSecondary },
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: token.colorBorderSecondary } },
    },
    series: [
      {
        type: "bar",
        data: top.map((r) => r.value),
        barMaxWidth: 32,
        itemStyle: { borderRadius: [5, 5, 0, 0] },
      },
    ],
  };
  const horizontal: EChartsOption = {
    ...base,
    yAxis: {
      axisLabel: { color: token.colorTextSecondary },
      type: "category",
      inverse: true,
      data: top.map((r) => r.name),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    xAxis: {
      axisLabel: { color: token.colorTextSecondary },
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: token.colorBorderSecondary } },
    },
    series: [
      {
        type: "bar",
        data: top.map((r) => r.value),
        barMaxWidth: 16,
        itemStyle: { borderRadius: [0, 4, 4, 0], color: colors.secondary },
      },
    ],
  };
  return (
    <>
      <div className={styles.charts}>
        <Panel>
          <h2 className={styles.chartTitle}>{t("adminTotalBookings")}</h2>
          <ReactECharts
            echarts={echarts}
            option={trend}
            style={{ height: 270 }}
          />
        </Panel>
        <Panel>
          <h2 className={styles.chartTitle}>{t("adminStatus")}</h2>
          <ReactECharts
            echarts={echarts}
            option={donut}
            style={{ height: 270 }}
          />
        </Panel>
      </div>
      <div className={report ? styles.charts : ""}>
        <Panel>
          <h2 className={styles.chartTitle}>{t("adminRoomUsage")}</h2>
          <ReactECharts
            echarts={echarts}
            option={bar}
            style={{ height: 250 }}
          />
        </Panel>
        {report && (
          <Panel>
            <h2 className={styles.chartTitle}>
              {t("adminMostBookedRoom")}
            </h2>
            <ReactECharts
              echarts={echarts}
              option={horizontal}
              style={{ height: 250 }}
            />
          </Panel>
        )}
      </div>
    </>
  );
}

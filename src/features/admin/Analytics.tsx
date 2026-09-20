import { Segmented, theme } from "antd";
import { useMemo, useState } from "react";
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

type AnalyticsGranularity = "day" | "week" | "month";

function getTimeline(
  bookings: Booking[],
  start: string,
  end: string,
  granularity: AnalyticsGranularity,
) {
  const unit = granularity === "day" ? "day" : granularity;
  const first = dayjs(start).startOf(unit);
  const last = dayjs(end).startOf(unit);
  const totals = new Map<string, number>();

  for (let cursor = first; !cursor.isAfter(last, unit); cursor = cursor.add(1, unit)) {
    totals.set(cursor.format("YYYY-MM-DD"), 0);
  }

  for (const booking of bookings) {
    const bucket = dayjs(booking.date).startOf(unit).format("YYYY-MM-DD");
    if (totals.has(bucket)) totals.set(bucket, (totals.get(bucket) ?? 0) + 1);
  }

  return [...totals.entries()].map(([key, value]) => {
    const date = dayjs(key);
    const label =
      granularity === "week"
        ? `${date.format("DD MMM")}–${date.add(6, "day").format("DD MMM")}`
        : granularity === "month"
          ? date.format("MMM YYYY")
          : date.format("DD MMM");
    return { label, value };
  });
}

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
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("day");
  const bookingLabels = getBookingLabels(t);
  const { token } = theme.useToken();
  const dark = useThemeStore((state) => state.mode === "dark");
  const timeline = useMemo(
    () => getTimeline(bookings, start, end, granularity),
    [bookings, end, granularity, start],
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
      data: timeline.map((item) => item.label),
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
        data: timeline.map((item) => item.value),
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
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>{t("adminBookingsOverTime")}</h2>
            <Segmented
              aria-label={t("adminTrendGranularity")}
              value={granularity}
              onChange={(value) => setGranularity(value as AnalyticsGranularity)}
              options={[
                { value: "day", label: t("adminDaily") },
                { value: "week", label: t("adminWeekly") },
                { value: "month", label: t("adminMonthly") },
              ]}
            />
          </div>
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

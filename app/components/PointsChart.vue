<script setup lang="ts">
import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";

use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const props = defineProps<{
  series: { field: string; data: [string, number][] }[];
  start: Date;
  end: Date;
  loading?: boolean;
}>();

const colorMode = useColorMode();

// Crimson first, then colours that stay readable on light and dark backgrounds
const PALETTE = ["#DC143C", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];

const option = computed(() => {
  const dark = colorMode.value === "dark";
  const text = dark ? "#d4d4d8" : "#3f3f46";
  const grid = dark ? "#3f3f46" : "#e4e4e7";

  return {
    color: PALETTE,
    backgroundColor: "transparent",
    textStyle: { color: text },
    animation: false,
    legend: { top: 0, type: "scroll", textStyle: { color: text } },
    tooltip: { trigger: "axis" },
    // ECharts 6 keeps axis labels inside the chart by default (grid.outerBounds)
    grid: { top: 40, left: 8, right: 16, bottom: 64 },
    xAxis: {
      type: "time",
      min: props.start.getTime(),
      max: props.end.getTime(),
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
    },
    yAxis: {
      type: "value",
      scale: true,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
    },
    dataZoom: [
      { type: "inside" },
      { type: "slider", height: 20, bottom: 8, borderColor: grid },
    ],
    series: props.series.map(({ field, data }) => ({
      name: field,
      type: "line",
      showSymbol: false,
      data,
    })),
  };
});
</script>

<template>
  <!-- VChart fills its parent (vue-echarts base styles), so size the wrapper -->
  <div class="h-96 w-full">
    <VChart
      :option="option"
      :loading="loading"
      :loading-options="{ text: '', color: '#DC143C', maskColor: 'transparent' }"
      autoresize
    />
  </div>
</template>

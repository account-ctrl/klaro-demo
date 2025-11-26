
'use client';

import * as React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';
import type { BlotterCase } from "@/lib/types";

const chartConfig = {
    value: {
        label: "Cases",
    },
    settled: {
        label: "Settled",
        color: "hsl(var(--chart-2))",
    },
    pending: {
        label: "Pending",
        color: "#ff7a59",
    },
    referred: {
        label: "Referred",
        color: "hsl(var(--chart-4))",
    },
};

type BlotterAnalyticsChartProps = {
    blotterCases: BlotterCase[];
};

export function BlotterAnalyticsChart({ blotterCases }: BlotterAnalyticsChartProps) {
    const chartData = React.useMemo(() => {
        if (!blotterCases) return [];
        const settled = blotterCases.filter(c => c.status === 'Settled' || c.status === 'Dismissed').length;
        const pending = blotterCases.filter(c => ['Open', 'Under Mediation', 'Conciliation', 'Arbitration'].includes(c.status)).length;
        const referred = blotterCases.filter(c => c.status === 'Referred' || c.status === 'Issued CFA').length;
        
        return [
            { status: "settled", label: "Settled/Dismissed", value: settled, fill: "var(--color-settled)" },
            { status: "pending", label: "Pending/Mediation", value: pending, fill: "#ff7a59" },
            { status: "referred", label: "Referred/CFA", value: referred, fill: "var(--color-referred)" },
        ];
    }, [blotterCases]);


  const totalValue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [chartData])


  return (
    <div className="flex flex-col h-full">
        <CardHeader className="pb-0">
            <CardTitle className="text-[#33475b]">Blotter Case Analytics</CardTitle>
            <CardDescription>Breakdown of current cases by status.</CardDescription>
        </CardHeader>
        <div className="flex-1 pb-4 min-h-0">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full max-h-[250px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="status"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                     <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-[#33475b] text-3xl font-bold"
                              >
                                {totalValue.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground text-xs"
                              >
                                Total Cases
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                   <ChartLegend
                    content={<ChartLegendContent nameKey="label" />}
                    className="-mt-4 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
                    />
                </PieChart>
              </ChartContainer>
        </div>
    </div>
    
  );
}

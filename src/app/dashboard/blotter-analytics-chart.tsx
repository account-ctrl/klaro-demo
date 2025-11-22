
'use client';

import * as React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Pie, PieChart, Cell } from 'recharts';
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
        color: "hsl(var(--chart-3))",
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
            { status: "pending", label: "Pending/Mediation", value: pending, fill: "var(--color-pending)" },
            { status: "referred", label: "Referred/CFA", value: referred, fill: "var(--color-referred)" },
        ];
    }, [blotterCases]);


  const totalValue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0)
  }, [chartData])


  return (
    <Card>
        <CardHeader>
            <CardTitle>Blotter Case Analytics</CardTitle>
            <CardDescription>Breakdown of current cases by status.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
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
                                className="fill-foreground text-3xl font-bold"
                              >
                                {totalValue.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
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
        </CardContent>
    </Card>
    
  );
}

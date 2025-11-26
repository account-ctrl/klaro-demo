
'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { CertificateRequest } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';

const chartConfig = {
  issued: {
    label: 'Documents Issued',
    color: '#ff7a59',
  },
};

type DocumentIssuanceChartProps = {
    requests: CertificateRequest[];
};


export function DocumentIssuanceChart({ requests }: DocumentIssuanceChartProps) {

   const chartData = useMemo(() => {
    if (!requests) return [];
    
    const monthlyData: { [key: string]: number } = {};

    // Initialize the last 6 months
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = format(d, 'MMM');
        monthlyData[monthKey] = 0;
    }

    requests.forEach(req => {
        if (req.dateRequested) {
            const month = format(req.dateRequested.toDate(), 'MMM');
            if (month in monthlyData) {
                monthlyData[month]++;
            }
        }
    });

    return Object.keys(monthlyData).map(month => ({ month, issued: monthlyData[month] }));

  }, [requests]);


  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
            <defs>
                <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff7a59" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ff7a59" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10} 
                fontSize={12} 
                tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={10} 
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} cursor={false} />
            <Area 
                type="monotone" 
                dataKey="issued" 
                stroke="#ff7a59" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorIssued)" 
            />
            </AreaChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}

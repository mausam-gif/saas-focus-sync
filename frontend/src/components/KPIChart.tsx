"use client";
import React from 'react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

interface KPIChartProps {
    productivity: number;
    completion: number;
    efficiency: number;
}

export const KPIChart: React.FC<KPIChartProps> = ({ productivity, completion, efficiency }) => {
    const data = {
        labels: ['Productivity', 'Task Completion', 'Efficiency'],
        datasets: [
            {
                label: 'Employee KPI Metrics',
                data: [productivity, completion, efficiency],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        scales: {
            r: {
                angleLines: {
                    display: true
                },
                suggestedMin: 0,
                suggestedMax: 100
            }
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow flex justify-center items-center h-80">
            <Radar data={data} options={options} />
        </div>
    );
};

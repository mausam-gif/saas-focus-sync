"use client";
import React, { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';



interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies: string;
    custom_class?: string;
}

interface GanttChartProps {
    tasks: Task[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
    const ganttRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ganttRef.current && tasks.length > 0) {
            // Clear the container to prevent duplicate charts or glitches
            ganttRef.current.innerHTML = '';

            // Use a small timeout to ensure the DOM is ready and container has size
            const timer = setTimeout(() => {
                if (ganttRef.current) {
                    new Gantt(ganttRef.current, tasks, {
                        view_mode: 'Day',
                        date_format: 'YYYY-MM-DD',
                        // @ts-ignore
                        custom_popup_html: function (task: any) {
                            return `
                                <div class="p-2 bg-white shadow rounded border text-sm">
                                  <h5 class="font-bold mb-1">${task.name}</h5>
                                  <p>Progress: ${task.progress}%</p>
                                </div>
                            `;
                        }
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [tasks]);

    return (
        <div className="w-full overflow-x-auto bg-white p-4 rounded-lg shadow">
            {tasks.length > 0 ? (
                <div ref={ganttRef} />
            ) : (
                <p className="text-gray-500">No tasks to display.</p>
            )}
        </div>
    );
};

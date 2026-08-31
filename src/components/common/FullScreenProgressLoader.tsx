import React from 'react';

interface FullScreenProgressLoaderProps {
  isOpen: boolean;
  progress: number;
  title: string;
  subtitle?: string;
}

export default function FullScreenProgressLoader({
  isOpen,
  progress,
  title,
  subtitle = "Please do not close the app.",
}: FullScreenProgressLoaderProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px] transition-opacity">
      <div className="flex w-full max-w-xs flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-slate-100">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              className="text-slate-100"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
            <circle
              className="text-blue-600 transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (progress / 100) * 251.2}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
          </svg>
          <span className="text-xl font-bold text-slate-700">{progress}%</span>
        </div>
        <p className="mt-6 text-center text-sm font-semibold text-slate-800">
          {title}
        </p>
        {subtitle && (
          <p className="mt-2 text-center text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
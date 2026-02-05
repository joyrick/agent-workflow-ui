'use client';

import { Check, Loader2, Circle, AlertCircle } from 'lucide-react';

interface WorkflowStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: string;
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm ml-13">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Priebeh workflow
      </h3>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg transition-all duration-300 ${
              step.status === 'running'
                ? 'bg-primary-50'
                : step.status === 'completed'
                ? 'bg-green-50'
                : step.status === 'error'
                ? 'bg-red-50'
                : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {step.status === 'pending' && (
                  <Circle size={18} className="text-gray-400" />
                )}
                {step.status === 'running' && (
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse-ring bg-primary-400 rounded-full opacity-75" />
                    <Loader2 size={18} className="animate-spin text-primary-500" />
                  </div>
                )}
                {step.status === 'completed' && (
                  <div className="p-0.5 bg-green-500 rounded-full">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                {step.status === 'error' && (
                  <AlertCircle size={18} className="text-red-500" />
                )}
              </div>
              <span
                className={`text-sm flex-1 ${
                  step.status === 'running'
                    ? 'text-primary-700 font-medium'
                    : step.status === 'completed'
                    ? 'text-green-700'
                    : step.status === 'error'
                    ? 'text-red-700'
                    : 'text-gray-500'
                }`}
              >
                {step.name}
              </span>
              {step.status === 'running' && (
                <span className="text-xs text-primary-500 animate-pulse">
                  Spracováva sa...
                </span>
              )}
            </div>
            {step.status === 'completed' && step.output && (
              <div className="mt-2 ml-7 text-xs text-gray-600 bg-white/50 p-2 rounded border border-green-100 truncate">
                {step.output.length > 100 ? step.output.substring(0, 100) + '...' : step.output}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

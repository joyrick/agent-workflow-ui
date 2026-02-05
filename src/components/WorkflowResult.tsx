'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Gauge,
} from 'lucide-react';

interface WorkflowResultData {
  name: string;
  value: string;
  confidence: number;
  note: string;
  noteType: "zhoda" | "problem";
  details: {
    doc1: string;
    doc2: string;
    doc3: string;
    orchestrator: string;
    category: string;
    finalOutput: string;
  };
}

interface WorkflowResultProps {
  result: WorkflowResultData;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (confidence >= 0.8) return 'Vysoká';
    if (confidence >= 0.5) return 'Stredná';
    return 'Nízka';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500 ease-out`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
      <span
        className={`text-sm font-medium ${
          confidence >= 0.8
            ? 'text-green-600'
            : confidence >= 0.5
            ? 'text-yellow-600'
            : 'text-red-600'
        }`}
      >
        {getLabel()} ({Math.round(confidence * 100)}%)
      </span>
    </div>
  );
}

export function WorkflowResult({ result }: WorkflowResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMatch = result.noteType === 'zhoda';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ml-13">
      {/* Main Result Table */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Gauge size={16} className="text-primary-500" />
          Výsledok analýzy
        </h3>
        
        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Názov
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hodnota
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Dôvera
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Poznámka
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {result.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {result.value}
                  </span>
                </td>
                <td className="px-4 py-4 min-w-[180px]">
                  <ConfidenceBar confidence={result.confidence} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isMatch ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {isMatch ? (
                        <CheckCircle2 size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-red-600" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isMatch ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {result.note}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Expand/Collapse Details */}
      <div className="border-t border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText size={16} />
            Zobraziť detaily z dokumentov
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 animate-slide-in">
            <div className="grid gap-3">
              <DetailCard
                title="Dokument 1"
                content={result.details.doc1}
              />
              <DetailCard
                title="Dokument 2"
                content={result.details.doc2}
              />
              <DetailCard
                title="Dokument 3"
                content={result.details.doc3}
              />
              <DetailCard
                title="Orchestrátor"
                content={result.details.orchestrator}
                highlight
              />
              <DetailCard
                title="Finálny výstup"
                content={result.details.finalOutput}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({
  title,
  content,
  highlight,
}: {
  title: string;
  content: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg ${
        highlight ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
      }`}
    >
      <h4
        className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
          highlight ? 'text-primary-700' : 'text-gray-500'
        }`}
      >
        {title}
      </h4>
      <p className={`text-sm ${highlight ? 'text-primary-900' : 'text-gray-700'}`}>
        {content}
      </p>
    </div>
  );
}

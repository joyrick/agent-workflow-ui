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
  results: WorkflowResultData[];
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
        className={`text-sm font-medium whitespace-nowrap ${
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

function ResultRow({ result, onToggleDetails, isExpanded }: { 
  result: WorkflowResultData; 
  onToggleDetails: () => void;
  isExpanded: boolean;
}) {
  const isMatch = result.noteType === 'zhoda';

  return (
    <>
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
        <td className="px-4 py-4">
          <button
            onClick={onToggleDetails}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zobraziť detaily"
          >
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-500" />
            ) : (
              <ChevronDown size={16} className="text-gray-500" />
            )}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-4 py-4 bg-gray-50">
            <div className="grid gap-3 animate-slide-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </td>
        </tr>
      )}
    </>
  );
}

export function WorkflowResult({ results }: WorkflowResultProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ml-13">
      {/* Main Result Table */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Gauge size={16} className="text-primary-500" />
          Výsledky analýzy ({results.length} kontrolovaných parametrov)
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                  <FileText size={14} className="text-gray-400" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <ResultRow
                  key={index}
                  result={result}
                  isExpanded={expandedRows.has(index)}
                  onToggleDetails={() => toggleRow(index)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Celkovo: {results.filter(r => r.noteType === 'zhoda').length} zhôd, {results.filter(r => r.noteType === 'problem').length} problémov
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-green-700">Zhoda</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle size={14} className="text-red-500" />
              <span className="text-red-700">Problém</span>
            </div>
          </div>
        </div>
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
        highlight ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-200'
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
        {content || 'Žiadne dáta'}
      </p>
    </div>
  );
}

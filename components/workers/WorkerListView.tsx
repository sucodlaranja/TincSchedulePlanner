'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useScheduleStore } from '@/lib/store'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import WorkerForm from './WorkerForm'
import type { Worker } from '@/lib/types'

export default function WorkerListView() {
  const config = useScheduleStore((s) => s.config)
  const removeWorker = useScheduleStore((s) => s.removeWorker)
  const toggleConfigPanel = useScheduleStore((s) => s.toggleConfigPanel)
  const [addOpen, setAddOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<Worker | null>(null)

  if (!config) {
    return (
      <EmptyState
        title="No configuration yet"
        description="Create a configuration first to manage workers."
        action={{ label: 'Open Config', onClick: toggleConfigPanel }}
        icon="⚙️"
      />
    )
  }

  const workers = config.workers

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workers</h1>
          <p className="text-sm text-gray-500">{workers.length} worker{workers.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          + Add Worker
        </Button>
      </div>

      {workers.length === 0 ? (
        <EmptyState
          title="No workers yet"
          description="Add workers to start building your schedule."
          action={{ label: '+ Add Worker', onClick: () => setAddOpen(true) }}
          icon="👷"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Hrs/week</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Preference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workers.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: worker.color }}
                      >
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{worker.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">{worker.hoursPerWeek}h</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {(worker.preferences.preferredDaysOff ?? []).length > 0 ? (worker.preferences.preferredDaysOff ?? []).map((d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${worker.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {worker.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/workers/${worker.id}`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => setEditWorker(worker)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition rounded cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${worker.name}?`)) removeWorker(worker.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition rounded cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Worker" size="sm">
        <WorkerForm onClose={() => setAddOpen(false)} />
      </Modal>

      <Modal isOpen={!!editWorker} onClose={() => setEditWorker(null)} title="Edit Worker" size="sm">
        {editWorker && <WorkerForm worker={editWorker} onClose={() => setEditWorker(null)} />}
      </Modal>
    </div>
  )
}

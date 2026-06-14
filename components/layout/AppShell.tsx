'use client'

import { type ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import ConfigPanel from '@/components/config/ConfigPanel'
import { useScheduleStore } from '@/lib/store'

export default function AppShell({ children }: { children: ReactNode }) {
  const configPanelOpen = useScheduleStore((s) => s.configPanelOpen)
  const setConfigPanelOpen = useScheduleStore((s) => s.setConfigPanelOpen)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden md:flex print:hidden"><Sidebar /></div>
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto pb-14 md:pb-0">{children}</main>
      </div>
      <BottomNav />
      <div className="print:hidden"><ConfigPanel isOpen={configPanelOpen} onClose={() => setConfigPanelOpen(false)} /></div>
    </div>
  )
}

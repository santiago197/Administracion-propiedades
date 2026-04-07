'use client'

import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ContratosStats {
  total: number
  vigentes: number
  proximos_a_vencer: number
  vencidos: number
}

interface ContratosStatsCardsProps {
  stats: ContratosStats
}

export function ContratosStatsCards({ stats }: ContratosStatsCardsProps) {
  const cards = [
    {
      label: 'Total contratos',
      value: stats.total,
      icon: FileText,
      color: 'text-foreground',
      bg: 'bg-muted/50',
    },
    {
      label: 'Vigentes',
      value: stats.vigentes,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Proximos a vencer',
      value: stats.proximos_a_vencer,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Vencidos',
      value: stats.vencidos,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

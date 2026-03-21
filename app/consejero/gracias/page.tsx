'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export default function GraciasPagina() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="border border-border/50 bg-card/50 p-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold text-foreground mb-3">
            ¡Gracias!
          </h1>
          
          <p className="text-muted-foreground mb-4">
            Tu evaluación y voto han sido registrados exitosamente.
          </p>

          <p className="text-sm text-muted-foreground mb-8">
            El administrador del conjunto notificará los resultados finales una vez que todos los consejeros hayan completado sus evaluaciones y votos.
          </p>

          <Card className="border-dashed border border-primary/20 bg-primary/5 p-4 mb-8">
            <h3 className="font-semibold text-foreground mb-2">Próximos pasos</h3>
            <ul className="text-left text-sm text-muted-foreground space-y-2">
              <li>✓ Evaluación completa</li>
              <li>✓ Votación registrada</li>
              <li>○ Resultados finales (próximamente)</li>
            </ul>
          </Card>

          <Link href="/">
            <Button className="w-full">
              Volver a Inicio
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}

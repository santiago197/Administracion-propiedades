'use client'

import { useRouter } from 'next/navigation'
import { NavBar } from '@/components/admin/nav-bar'
import { FormConjunto } from '@/components/admin/form-conjunto'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Conjunto } from '@/lib/types'

export default function NuevoConjunto() {
  const router = useRouter()

  const handleSuccess = (conjunto: Conjunto) => {
    router.push(`/admin/conjuntos/${conjunto.id}/configuracion`)
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Nuevo Conjunto Residencial</h1>
          <p className="mt-2 text-muted-foreground">
            Registra la información básica de tu conjunto para comenzar
          </p>
        </div>

        <FormConjunto onSuccess={handleSuccess} />
      </main>
    </div>
  )
}

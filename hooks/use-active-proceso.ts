'use client'

import { useState, useEffect } from 'react'
import type { Proceso, Conjunto } from '@/lib/types/index'

type State = {
  conjunto: Conjunto | null
  proceso: Proceso | null
  procesos: Proceso[]
  loading: boolean
  error: string | null
}

/** Obtiene el conjunto del usuario autenticado y su proceso activo (configuracion, evaluacion o votacion). */
export function useActiveProceso(): State {
  const [state, setState] = useState<State>({
    conjunto: null,
    proceso: null,
    procesos: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    const init = async () => {
      try {
        const conjRes = await fetch('/api/conjuntos')
        if (!conjRes.ok) throw new Error('No se pudo obtener el conjunto')
        const conjunto: Conjunto = await conjRes.json()

        const procRes = await fetch(`/api/procesos?conjunto_id=${conjunto.id}`)
        if (!procRes.ok) throw new Error('No se pudo obtener los procesos')
        const procesos: Proceso[] = await procRes.json()

        const proceso =
          procesos.find((p) =>
            ['configuracion', 'evaluacion', 'votacion'].includes(p.estado)
          ) ?? procesos[0] ?? null

        setState({ conjunto, proceso, procesos, loading: false, error: null })
      } catch (e) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : 'Error desconocido',
        }))
      }
    }
    init()
  }, [])

  return state
}

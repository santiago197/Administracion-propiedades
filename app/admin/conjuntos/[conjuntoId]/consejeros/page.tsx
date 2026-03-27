'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Users,
  Copy,
  Check,
  RefreshCw,
  UserX,
  UserCheck,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import type { Consejero, CargoCohnsejero } from '@/lib/types/index'

// ─── Constantes ───────────────────────────────────────────────────────────────

const CARGOS: { value: CargoCohnsejero; label: string }[] = [
  { value: 'presidente',         label: 'Presidente' },
  { value: 'vicepresidente',     label: 'Vicepresidente' },
  { value: 'secretario',         label: 'Secretario' },
  { value: 'tesorero',           label: 'Tesorero' },
  { value: 'vocal_principal',    label: 'Vocal Principal' },
  { value: 'consejero',          label: 'Consejero' },
  { value: 'consejero_suplente', label: 'Consejero Suplente' },
]

const CARGO_LABEL: Record<CargoCohnsejero, string> = Object.fromEntries(
  CARGOS.map((c) => [c.value, c.label])
) as Record<CargoCohnsejero, string>

// ─── CodigoAcceso ────────────────────────────────────────────────────────────

function CodigoAcceso({
  codigo,
  consejeroId,
  activo,
  onRegenerado,
}: {
  codigo: string
  consejeroId: string
  activo: boolean
  onRegenerado: (id: string, nuevoCodigo: string) => void
}) {
  const [copiado, setCopiado] = useState(false)
  const [regenerando, setRegenerando] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const regenerar = async () => {
    if (!confirm('¿Regenerar el código? El código actual dejará de funcionar de inmediato.')) return
    setRegenerando(true)
    try {
      const res = await fetch('/api/consejeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerar_codigo', consejero_id: consejeroId }),
      })
      if (res.ok) {
        const { codigo: nuevo } = await res.json()
        onRegenerado(consejeroId, nuevo)
      }
    } finally {
      setRegenerando(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <code className="font-mono text-sm bg-muted px-2.5 py-1 rounded border border-border/60 tracking-widest select-all">
        {codigo}
      </code>
      <button
        onClick={copiar}
        title="Copiar código"
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        {copiado
          ? <Check className="h-3.5 w-3.5 text-green-500" />
          : <Copy className="h-3.5 w-3.5" />
        }
      </button>
      {activo && (
        <button
          onClick={regenerar}
          disabled={regenerando}
          title="Regenerar código"
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${regenerando ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  )
}

// ─── Formulario nuevo consejero ───────────────────────────────────────────────

function FormNuevoConsejero({
  onCreado,
  onCancelar,
}: {
  onCreado: (c: Consejero) => void
  onCancelar: () => void
}) {
  const [form, setForm] = useState({
    nombre_completo: '',
    cargo: 'consejero' as CargoCohnsejero,
    apartamento: '',
    torre: '',
    email: '',
    telefono: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre_completo.trim() || !form.apartamento.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/consejeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: form.nombre_completo.trim(),
          cargo: form.cargo,
          apartamento: form.apartamento.trim(),
          torre: form.torre.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear consejero')
        return
      }
      onCreado(data)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-4">Nuevo consejero</h3>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Nombre completo <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Ej. Ana María García"
              value={form.nombre_completo}
              onChange={(e) => set('nombre_completo', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Cargo <span className="text-destructive">*</span>
            </label>
            <select
              value={form.cargo}
              onChange={(e) => set('cargo', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CARGOS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Apartamento <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Ej. 301"
              value={form.apartamento}
              onChange={(e) => set('apartamento', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Torre (opcional)</label>
            <Input
              placeholder="Ej. A"
              value={form.torre}
              onChange={(e) => set('torre', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email (opcional)</label>
            <Input
              type="email"
              placeholder="consejero@ejemplo.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Teléfono (opcional)</label>
            <Input
              placeholder="3001234567"
              value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Creando...' : 'Crear consejero'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ConsejerosPage() {
  const params = useParams()
  const conjuntoId = params.conjuntoId as string

  const [consejeros, setConsejeros] = useState<Consejero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const accessUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/consejero`
      : '/consejero'

  const fetchConsejeros = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/consejeros?conjunto_id=${conjuntoId}`)
      if (!res.ok) throw new Error('Error al cargar consejeros')
      setConsejeros(await res.json())
    } catch {
      setError('No se pudieron cargar los consejeros')
    } finally {
      setLoading(false)
    }
  }, [conjuntoId])

  useEffect(() => { fetchConsejeros() }, [fetchConsejeros])

  const handleCreado = (c: Consejero) => {
    setConsejeros((prev) => [c, ...prev])
    setMostrarForm(false)
  }

  const handleToggleActivo = async (c: Consejero) => {
    const accion = c.activo ? 'desactivar' : 'reactivar'
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${c.nombre_completo}?`)) return
    setTogglingId(c.id)
    try {
      const res = await fetch('/api/consejeros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, activo: !c.activo }),
      })
      if (res.ok) {
        setConsejeros((prev) => prev.map((x) => x.id === c.id ? { ...x, activo: !x.activo } : x))
      }
    } finally {
      setTogglingId(null)
    }
  }

  const handleCodigoRegenerado = (id: string, nuevoCodigo: string) => {
    setConsejeros((prev) => prev.map((c) => c.id === id ? { ...c, codigo_acceso: nuevoCodigo } : c))
  }

  const activos = consejeros.filter((c) => c.activo)
  const inactivos = consejeros.filter((c) => !c.activo)

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        <Link href={`/admin/conjuntos/${conjuntoId}`}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al conjunto
          </Button>
        </Link>

        {/* Encabezado */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl flex items-center gap-2">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
              Consejeros
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Gestiona los miembros del consejo que participan en la evaluación y votación.
            </p>
          </div>
          {!mostrarForm && (
            <Button onClick={() => setMostrarForm(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Agregar consejero
            </Button>
          )}
        </div>

        {/* Banner: ¿cómo acceden? */}
        <Card className="mb-6 border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                ¿Cómo acceden los consejeros?
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200 mb-3">
                Cada consejero recibe un <strong>código de 8 caracteres</strong>. Lo ingresan en la
                siguiente URL para acceder a la evaluación y votación:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                  {accessUrl}
                </code>
              </div>
            </div>
          </div>
        </Card>

        {/* Formulario */}
        {mostrarForm && (
          <div className="mb-6">
            <FormNuevoConsejero
              onCreado={handleCreado}
              onCancelar={() => setMostrarForm(false)}
            />
          </div>
        )}

        {/* Cargando */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <Card className="p-8 text-center border border-destructive/30">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium mb-3">{error}</p>
            <Button variant="outline" onClick={fetchConsejeros}>Reintentar</Button>
          </Card>
        )}

        {/* Vacío */}
        {!loading && !error && consejeros.length === 0 && (
          <Card className="p-12 text-center border-dashed">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-semibold mb-1">No hay consejeros registrados</p>
            <p className="text-sm text-muted-foreground mb-6">
              Agrega los miembros del consejo para que puedan evaluar y votar.
            </p>
            <Button onClick={() => setMostrarForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar primer consejero
            </Button>
          </Card>
        )}

        {/* Activos */}
        {!loading && activos.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Consejeros activos</h2>
              <Badge variant="secondary">{activos.length}</Badge>
            </div>

            {activos.map((c) => (
              <Card key={c.id} className="border border-border/50 bg-card/50 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold">{c.nombre_completo}</p>
                      <Badge variant="outline" className="text-xs">
                        {CARGO_LABEL[c.cargo] ?? c.cargo}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Apto. {c.torre ? `${c.torre}-` : ''}{c.apartamento}
                      {c.email && ` · ${c.email}`}
                    </p>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                        Código de acceso
                      </p>
                      <CodigoAcceso
                        codigo={c.codigo_acceso}
                        consejeroId={c.id}
                        activo={c.activo}
                        onRegenerado={handleCodigoRegenerado}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Comparte este código — el consejero lo ingresa en <strong>/consejero</strong>
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActivo(c)}
                    disabled={togglingId === c.id}
                    className="gap-1.5 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    {togglingId === c.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <UserX className="h-4 w-4" />
                    }
                    Desactivar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Inactivos */}
        {!loading && inactivos.length > 0 && (
          <div>
            <button
              onClick={() => setMostrarInactivos((v) => !v)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              {mostrarInactivos
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
              {inactivos.length} consejero{inactivos.length !== 1 ? 's' : ''} inactivo{inactivos.length !== 1 ? 's' : ''}
            </button>

            {mostrarInactivos && (
              <div className="space-y-3">
                {inactivos.map((c) => (
                  <Card key={c.id} className="border border-border/30 bg-muted/20 p-4 sm:p-5 opacity-60">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-medium text-muted-foreground">{c.nombre_completo}</p>
                          <Badge variant="outline" className="text-xs opacity-70">
                            {CARGO_LABEL[c.cargo] ?? c.cargo}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Apto. {c.torre ? `${c.torre}-` : ''}{c.apartamento}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActivo(c)}
                        disabled={togglingId === c.id}
                        className="gap-1.5 shrink-0"
                      >
                        {togglingId === c.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <UserCheck className="h-4 w-4" />
                        }
                        Reactivar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

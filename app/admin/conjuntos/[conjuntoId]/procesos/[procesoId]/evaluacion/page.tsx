'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { NavBar } from '@/components/admin/nav-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader,
  BarChart4,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import type { Propuesta, Proceso } from '@/lib/types/index'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"

export default function EvaluacionProceso() {
  const params = useParams()
  const router = useRouter()
  const conjuntoId = params.conjuntoId as string
  const procesoId = params.procesoId as string

  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPropuesta, setSelectedPropuesta] = useState<Propuesta | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [evaluando, setEvaluando] = useState(false)

  // Estados de evaluación
  const [evalData, setEvalData] = useState({
    densidad: 0,
    cartera: 0,
    financiero: 0,
    complejaOps: [] as string[],
    complejaNivel: 0,
    capacidad: 0,
    tecnica: 0,
    referencias: 0,
    economica: 0
  })

  useEffect(() => {
    fetchData()
  }, [procesoId])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/propuestas?proceso_id=${procesoId}`)
      if (res.ok) {
        const data = await res.json()
        setPropuestas(data)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEval = (p: Propuesta) => {
    setSelectedPropuesta(p)

    // Auto-sugerencias basadas en datos reales
    const sugerenciaDensidad = p.unidades_administradas > 500 ? 25 : (p.unidades_administradas >= 300 ? 15 : 5)
    const sugerenciaCapacidad = p.tipo_persona === 'juridica' ? 10 : 5

    setEvalData({
      densidad: sugerenciaDensidad,
      cartera: 0,
      financiero: 0,
      complejaOps: [],
      complejaNivel: 0,
      capacidad: sugerenciaCapacidad,
      tecnica: 0,
      referencias: 0,
      economica: 0
    })
    setIsModalOpen(true)
  }

  const calcularTotal = () => {
    return evalData.densidad +
           evalData.cartera +
           evalData.financiero +
           evalData.complejaNivel +
           evalData.capacidad +
           evalData.tecnica +
           evalData.referencias +
           evalData.economica
  }

  const getClasificacion = (score: number) => {
    if (score >= 85) return { label: 'Destacado', color: 'bg-green-500', text: 'text-green-500' }
    if (score >= 70) return { label: 'Apto', color: 'bg-yellow-500', text: 'text-yellow-500' }
    if (score >= 55) return { label: 'Condicionado', color: 'bg-orange-500', text: 'text-orange-500' }
    return { label: 'No Apto', color: 'bg-red-500', text: 'text-red-500' }
  }

  const handleSaveEval = async () => {
    if (!selectedPropuesta) return
    setEvaluando(true)

    const total = calcularTotal()
    const clasificacion = getClasificacion(total).label.toLowerCase().replace(' ', '_')

    try {
      const res = await fetch(`/api/propuestas/${selectedPropuesta.id}/evaluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puntaje_total: total,
          clasificacion,
          detalles: evalData
        })
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchData()
      } else {
        alert('Error al guardar la evaluación')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setEvaluando(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link href={`/admin/conjuntos/${conjuntoId}/procesos/${procesoId}`}>
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver al Tablero
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart4 className="h-8 w-8 text-primary" />
            Evaluación Técnica de Candidatos
          </h1>
          <p className="text-muted-foreground mt-2">
            Califica a los candidatos habilitados según los criterios ponderados del proceso.
          </p>
        </div>

        <Card className="overflow-hidden border-border/50">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Nombre / Razón Social</th>
                <th className="px-6 py-4 text-center">Tipo</th>
                <th className="px-6 py-4 text-center">Unidades</th>
                <th className="px-6 py-4 text-center">Puntaje</th>
                <th className="px-6 py-4 text-center">Clasificación</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {propuestas
                .sort((a, b) => b.puntaje_evaluacion - a.puntaje_evaluacion)
                .map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{p.razon_social}</p>
                    <p className="text-xs text-muted-foreground">{p.nit_cedula}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="outline" className="capitalize">
                      {p.tipo_persona}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center font-medium">
                    {p.unidades_administradas}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-lg font-bold ${p.puntaje_evaluacion > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {p.puntaje_evaluacion} / 100
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {p.clasificacion ? (
                      <Badge className={getClasificacion(p.puntaje_evaluacion).color}>
                        {p.clasificacion.toUpperCase()}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Pendiente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => handleOpenEval(p)}
                      disabled={p.estado !== 'en_evaluacion'}
                      className="gap-2"
                    >
                      {p.puntaje_evaluacion > 0 ? 'Re-evaluar' : 'Evaluar'}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>

      {/* MODAL DE EVALUACIÓN */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="text-primary" />
              Panel de Calificación
            </DialogTitle>
            <DialogDescription>
              Evaluando a: <span className="font-bold text-foreground">{selectedPropuesta?.razon_social}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6">
            <div className="md:col-span-2 space-y-8">
              {/* CRITERIO 1: EXPERIENCIA */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    1. Experiencia Alta Densidad (25 pts)
                  </h3>
                  <span className="text-primary font-bold">{evalData.densidad} pts</span>
                </div>
                <RadioGroup
                  value={evalData.densidad.toString()}
                  onValueChange={(v) => setEvalData({...evalData, densidad: parseInt(v)})}
                  className="grid grid-cols-1 gap-3"
                >
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="25" id="d1" />
                    <Label htmlFor="d1">+500 unidades administradas (Puntaje Máximo)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="15" id="d2" />
                    <Label htmlFor="d2">300 – 500 unidades</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="5" id="d3" />
                    <Label htmlFor="d3">Menos de 300 unidades / Sin experiencia específica</Label>
                  </div>
                </RadioGroup>
              </section>

              {/* CRITERIO 2: CARTERA */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    2. Resultados en Cartera (20 pts)
                  </h3>
                  <span className="text-primary font-bold">{evalData.cartera} pts</span>
                </div>
                <RadioGroup
                  value={evalData.cartera.toString()}
                  onValueChange={(v) => setEvalData({...evalData, cartera: parseInt(v)})}
                  className="grid grid-cols-1 gap-3"
                >
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="20" id="c1" />
                    <Label htmlFor="c1">Reducción comprobada de cartera morosa</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="10" id="c2" />
                    <Label htmlFor="c2">Manejo operativo sin resultados medibles</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="0" id="c3" />
                    <Label htmlFor="c3">Sin experiencia en cobro o gestión de cartera</Label>
                  </div>
                </RadioGroup>
              </section>

              {/* CRITERIO 3: CONTROL FINANCIERO */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-amber-500" />
                    3. Control Financiero (15 pts)
                  </h3>
                  <span className="text-primary font-bold">{evalData.financiero} pts</span>
                </div>
                <RadioGroup
                  value={evalData.financiero.toString()}
                  onValueChange={(v) => setEvalData({...evalData, financiero: parseInt(v)})}
                  className="flex gap-4"
                >
                  <div className="flex-1 flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="15" id="f1" />
                    <Label htmlFor="f1">Manejo Completo</Label>
                  </div>
                  <div className="flex-1 flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value="8" id="f2" />
                    <Label htmlFor="f2">Básico / Limitado</Label>
                  </div>
                </RadioGroup>
              </section>

              {/* OPERACION COMPLEJA */}
              <section className="space-y-4">
                <h3 className="font-bold text-lg">4. Operación Compleja (15 pts)</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['Seguridad', 'Convivencia', 'Parqueaderos'].map(item => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox id={item} />
                      <label htmlFor={item} className="text-sm">{item}</label>
                    </div>
                  ))}
                </div>
                <RadioGroup
                  value={evalData.complejaNivel.toString()}
                  onValueChange={(v) => setEvalData({...evalData, complejaNivel: parseInt(v)})}
                  className="grid grid-cols-3 gap-2"
                >
                   <div className="border p-2 rounded text-center cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="15" className="sr-only" id="o1" />
                    <Label htmlFor="o1" className="cursor-pointer">Alta (15)</Label>
                  </div>
                  <div className="border p-2 rounded text-center cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="8" className="sr-only" id="o2" />
                    <Label htmlFor="o2" className="cursor-pointer">Media (8)</Label>
                  </div>
                  <div className="border p-2 rounded text-center cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="3" className="sr-only" id="o3" />
                    <Label htmlFor="o3" className="cursor-pointer">Baja (3)</Label>
                  </div>
                </RadioGroup>
              </section>
            </div>

            {/* SIDEBAR DE PUNTAJE */}
            <div className="space-y-6">
              <Card className="p-6 bg-primary/5 border-primary/20 sticky top-0">
                <h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">Resumen en vivo</h4>
                <div className="text-center space-y-2 mb-6">
                  <p className="text-5xl font-black text-primary">{calcularTotal()}</p>
                  <p className="text-sm font-medium">Puntos de 100</p>
                </div>

                <Progress value={calcularTotal()} className="h-3 mb-4" />

                <div className={`p-3 rounded-md text-center font-bold ${getClasificacion(calcularTotal()).color} text-white`}>
                  {getClasificacion(calcularTotal()).label.toUpperCase()}
                </div>

                <div className="mt-8 space-y-4">
                   <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacidad Operativa:</span>
                    <span className="font-bold">{evalData.capacidad} pts</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Propuesta Técnica:</span>
                    <select
                      className="bg-transparent border-b font-bold"
                      onChange={(e) => setEvalData({...evalData, tecnica: parseInt(e.target.value)})}
                    >
                      <option value="0">-</option>
                      <option value="10">Clara (10)</option>
                      <option value="5">Genérica (5)</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Referencias:</span>
                    <select
                      className="bg-transparent border-b font-bold"
                      onChange={(e) => setEvalData({...evalData, referencias: parseInt(e.target.value)})}
                    >
                      <option value="0">-</option>
                      <option value="5">Ok (5)</option>
                      <option value="2">Débiles (2)</option>
                    </select>
                  </div>
                   <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Económica:</span>
                    <select
                      className="bg-transparent border-b font-bold"
                      onChange={(e) => setEvalData({...evalData, economica: parseInt(e.target.value)})}
                    >
                      <option value="0">-</option>
                      <option value="5">Lógica (5)</option>
                      <option value="2">Barata (2)</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Button
                className="w-full h-12 text-lg font-bold gap-2"
                disabled={evaluando}
                onClick={handleSaveEval}
              >
                {evaluando ? <Loader className="animate-spin" /> : <CheckCircle2 />}
                Guardar Calificación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, BarChart3, Users2, FileText, Lock } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                SA
              </div>
              <h1 className="text-xl font-bold">SelecionAdm</h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
                Características
              </Link>
              <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground">
                Acerca de
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <section className="border-b border-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Sistema de Selección de Administradores PH
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Cumple con la Ley 675 de 2001. Transparencia, evaluación ponderada y votación democrática en un solo lugar. Diseñado para simplificar la selección de administradores en conjuntos residenciales colombianos.
              </p>
              <div className="mt-10 flex gap-4">
                <Link href="/admin">
                  <Button size="lg" className="gap-2">
                    Comenzar <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg">
                  Ver Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-primary/20 to-accent/20 blur-2xl" />
              <Card className="relative border border-primary/20 bg-card/50 p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Evaluación ponderada automática</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users2 className="h-5 w-5 text-primary" />
                    <span>Votación individual por consejero</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span>Resultados transparentes en tiempo real</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Gestión documental integrada</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-primary" />
                    <span>Códigos de acceso seguros</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-b border-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Características Principales</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Todo lo que necesitas para un proceso de selección transparente y ordenado
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Configuración de Conjunto',
                description: 'Registra información del conjunto residencial y crea procesos de selección',
                icon: '🏢',
              },
              {
                title: 'Gestión de Consejeros',
                description: 'Registra miembros del consejo y genera códigos de acceso únicos',
                icon: '👥',
              },
              {
                title: 'Propuestas de Administradores',
                description: 'Carga mínimo 3 propuestas con información completa y documentos',
                icon: '📋',
              },
              {
                title: 'Criterios Ponderados',
                description: 'Define criterios de evaluación con pesos que sumen 100%',
                icon: '⚖️',
              },
              {
                title: 'Evaluación Individual',
                description: 'Cada consejero califica todas las propuestas independientemente',
                icon: '✍️',
              },
              {
                title: 'Votación Democrática',
                description: 'Un voto por consejero, requisito: completar evaluación previa',
                icon: '🗳️',
              },
            ].map((feature, idx) => (
              <Card key={idx} className="border border-border/50 bg-card/50 p-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Results Section */}
        <section id="about" className="border-b border-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold">Resultados Transparentes</h2>
              <p className="mt-4 text-muted-foreground">
                Obtén un análisis completo del proceso con:
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <strong>Ranking de Evaluación:</strong> Puntajes ponderados automáticos
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <strong>Conteo de Votos:</strong> Número de votos por propuesta
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <strong>Puntaje Final:</strong> Combinación ponderada (evaluación + votación)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <strong>Semáforo Visual:</strong> Verde/Amarillo/Rojo para fácil interpretación
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <strong>Exportación:</strong> PDF y Excel de resultados
                  </div>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/50 p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Empresa A</span>
                    <span className="font-semibold">4.8/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-primary w-[96%]" />
                  </div>
                  <span className="text-xs text-muted-foreground">7 votos • Verde</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Empresa B</span>
                    <span className="font-semibold">3.6/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-accent w-[72%]" />
                  </div>
                  <span className="text-xs text-muted-foreground">4 votos • Amarillo</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Empresa C</span>
                    <span className="font-semibold">2.2/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div className="h-2 rounded-full bg-destructive w-[44%]" />
                  </div>
                  <span className="text-xs text-muted-foreground">2 votos • Rojo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Simplifica el proceso de selección de administradores en tu conjunto residencial
          </p>
          <Link href="/admin">
            <Button size="lg" className="gap-2">
              Acceso a Administración <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>SelecionAdm © 2024 - Ley 675 de 2001</p>
            <p>Cumple con normativa colombiana de selección de administradores</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

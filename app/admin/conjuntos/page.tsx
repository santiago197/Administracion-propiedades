import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConjuntos } from '@/lib/supabase/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, ArrowRight, Plus } from 'lucide-react'
import type { Conjunto } from '@/lib/types/index'

export default async function ConjuntosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: dbUser } = await supabase
    .from('usuarios')
    .select('activo, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (!dbUser || !dbUser.activo) redirect('/login')
  if (dbUser.rol !== 'superadmin') redirect('/admin')

  const { data: conjuntos } = await getConjuntos()

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Superadmin</p>
          <h1 className="text-2xl tracking-tight">Panel de Conjuntos</h1>
          <p className="text-sm text-muted-foreground">
            Gestión global de todos los conjuntos registrados en el sistema.
          </p>
        </div>
        <Link href="/admin/nuevo-conjunto">
          <Button className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Nuevo conjunto
          </Button>
        </Link>
      </div>

      {!conjuntos?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">No hay conjuntos registrados.</p>
            <Link href="/admin/nuevo-conjunto" className="mt-4 inline-block">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Crear el primer conjunto
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(conjuntos as Conjunto[]).map((conjunto) => (
            <Link key={conjunto.id} href={`/admin/conjuntos/${conjunto.id}`}>
              <Card className="hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        {conjunto.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {conjunto.nombre}
                        </CardTitle>
                        <CardDescription>{conjunto.ciudad}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {conjunto.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{conjunto.direccion}</span>
                    <ArrowRight className="h-4 w-4 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

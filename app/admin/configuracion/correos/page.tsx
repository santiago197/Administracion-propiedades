'use client'

import { useState, useMemo } from 'react'
import { Mail, Send, Eye, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type EmailType = {
  id: string
  label: string
  defaultSubject: string
  defaultBody: string
}

const emailTypes: EmailType[] = [
  {
    id: 'subsanacion',
    label: 'Subsanación de documentos',
    defaultSubject:
      'REQUERIMIENTO: Subsanación de documentación - Proceso de Selección Barlovento Reservado',
    defaultBody: `Estimados señores,

Reciban un cordial saludo de parte del Consejo de Administración de Barlovento Reservado.

Tras la revisión inicial de los documentos presentados para la convocatoria de Administración, hemos identificado que su postulación requiere subsanar o completar ciertos soportes para cumplir con los requisitos mínimos de la vigencia 2026.

Plazo de Subsanación:
Tal como se estableció en los términos de la convocatoria, cuentan con un plazo máximo de 24 horas a partir del envío de este correo para cargar la documentación pendiente o corregida.

Instrucciones de carga:
Para formalizar este paso, deben subir los archivos correspondientes en formato PDF a través del siguiente enlace:
{{enlace}}

Quedamos atentos a cualquier inquietud.

Atentamente,
Consejo de Administración
Barlovento Reservado`,
  },
  {
    id: 'aprobacion',
    label: 'Aprobación de documentos',
    defaultSubject: 'NOTIFICACIÓN: Documentación aprobada - Proceso de Selección',
    defaultBody: `Estimado(a) {{nombre}},

Nos complace informarle que la documentación presentada para el proceso {{proceso}} ha sido revisada y aprobada satisfactoriamente.

A continuación, se procederá con la siguiente etapa del proceso de selección.

Puede consultar el estado de su postulación en el siguiente enlace:
{{enlace}}

Atentamente,
Consejo de Administración`,
  },
  {
    id: 'rechazo',
    label: 'Rechazo de propuesta',
    defaultSubject: 'NOTIFICACIÓN: Resultado del proceso de selección',
    defaultBody: `Estimado(a) {{nombre}},

Agradecemos su participación en el proceso {{proceso}}.

Tras la evaluación de todas las propuestas recibidas, lamentamos informarle que su postulación no ha sido seleccionada en esta ocasión.

Le invitamos a participar en futuras convocatorias.

Atentamente,
Consejo de Administración`,
  },
]

const placeholders = [
  { key: '{{nombre}}', description: 'Nombre del destinatario' },
  { key: '{{proceso}}', description: 'Nombre del proceso' },
  { key: '{{enlace}}', description: 'Enlace de acción' },
]

export default function EmailConfigPage() {
  const [emailType, setEmailType] = useState<string>('')
  const [fromEmail, setFromEmail] = useState('consejo@barloventoreservado.com')
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [previewData, setPreviewData] = useState({
    nombre: 'Juan Pérez',
    proceso: 'Selección de Administración 2026',
    enlace: 'https://ejemplo.com/subir-documentos',
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleEmailTypeChange = (value: string) => {
    setEmailType(value)
    const selectedType = emailTypes.find((t) => t.id === value)
    if (selectedType) {
      setSubject(selectedType.defaultSubject)
      setBody(selectedType.defaultBody)
    }
  }

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/\{\{nombre\}\}/g, previewData.nombre)
      .replace(/\{\{proceso\}\}/g, previewData.proceso)
      .replace(/\{\{enlace\}\}/g, previewData.enlace)
  }

  const previewSubject = useMemo(() => replacePlaceholders(subject), [subject, previewData])
  const previewBody = useMemo(() => replacePlaceholders(body), [body, previewData])

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const canSend =
    emailType && isValidEmail(fromEmail) && isValidEmail(toEmail) && subject.trim() && body.trim()

  const handleSend = async () => {
    if (!canSend) return

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject: previewSubject,
          body: previewBody,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: 'Correo enviado exitosamente' })
        setToEmail('')
      } else {
        setResult({ success: false, message: data.error || 'Error al enviar el correo' })
      }
    } catch {
      setResult({ success: false, message: 'Error de conexión. Intente nuevamente.' })
    } finally {
      setSending(false)
    }
  }

  const insertPlaceholder = (placeholder: string) => {
    setBody((prev) => prev + placeholder)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de Correos</h1>
        <p className="text-muted-foreground">
          Configure y envíe correos electrónicos para notificaciones de procesos administrativos
        </p>
      </div>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{result.success ? 'Éxito' : 'Error'}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuración del Correo
            </CardTitle>
            <CardDescription>
              Complete los campos para configurar el correo a enviar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-type">Tipo de correo</Label>
              <Select value={emailType} onValueChange={handleEmailTypeChange}>
                <SelectTrigger id="email-type">
                  <SelectValue placeholder="Seleccione un tipo de correo" />
                </SelectTrigger>
                <SelectContent>
                  {emailTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from-email">Correo remitente</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="remitente@ejemplo.com"
              />
              {fromEmail && !isValidEmail(fromEmail) && (
                <p className="text-sm text-destructive">Ingrese un correo válido</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-email">Correo destinatario</Label>
              <Input
                id="to-email"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="destinatario@ejemplo.com"
              />
              {toEmail && !isValidEmail(toEmail) && (
                <p className="text-sm text-destructive">Ingrese un correo válido</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Asunto</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del correo"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Cuerpo del correo</Label>
                <div className="flex gap-1">
                  {placeholders.map((p) => (
                    <Button
                      key={p.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => insertPlaceholder(p.key)}
                      title={p.description}
                    >
                      {p.key}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escriba el contenido del correo..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Variables de ejemplo (para vista previa)</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="preview-nombre" className="text-xs text-muted-foreground">
                    Nombre
                  </Label>
                  <Input
                    id="preview-nombre"
                    value={previewData.nombre}
                    onChange={(e) => setPreviewData((p) => ({ ...p, nombre: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="preview-proceso" className="text-xs text-muted-foreground">
                    Proceso
                  </Label>
                  <Input
                    id="preview-proceso"
                    value={previewData.proceso}
                    onChange={(e) => setPreviewData((p) => ({ ...p, proceso: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="preview-enlace" className="text-xs text-muted-foreground">
                    Enlace
                  </Label>
                  <Input
                    id="preview-enlace"
                    value={previewData.enlace}
                    onChange={(e) => setPreviewData((p) => ({ ...p, enlace: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSend} disabled={!canSend || sending} className="w-full">
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar correo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa
            </CardTitle>
            <CardDescription>
              Así se verá el correo con las variables reemplazadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Vista previa</TabsTrigger>
                <TabsTrigger value="raw">Plantilla</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">De:</Badge>
                    <span className="text-sm">{fromEmail || 'Sin especificar'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Para:</Badge>
                    <span className="text-sm">{toEmail || 'Sin especificar'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Asunto:</Badge>
                    <span className="text-sm font-medium">{previewSubject || 'Sin asunto'}</span>
                  </div>
                </div>
                <Separator />
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {previewBody || 'El contenido del correo aparecerá aquí...'}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="raw" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Asunto (con placeholders)</Label>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <code className="text-sm">{subject || 'Sin asunto'}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cuerpo (con placeholders)</Label>
                  <div className="rounded-lg border bg-muted/30 p-4 max-h-[400px] overflow-auto">
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {body || 'Sin contenido'}
                    </pre>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Placeholders disponibles</Label>
                  <div className="flex flex-wrap gap-2">
                    {placeholders.map((p) => (
                      <div
                        key={p.key}
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                      >
                        <code className="font-semibold text-primary">{p.key}</code>
                        <span className="text-muted-foreground ml-1">- {p.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

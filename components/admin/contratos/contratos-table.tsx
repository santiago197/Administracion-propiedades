'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle,
  Calendar,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ContratoConEstado, EstadoContrato } from '@/lib/types/index'

// ─────────────────────────────────────────────────────────────────────

const ESTADO_CONTRATO_CLS: Record<EstadoContrato, string> = {
  vigente: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  proximo_a_vencer: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  vencido: 'bg-destructive/10 text-destructive border-destructive/20',
}

const ESTADO_CONTRATO_LABEL: Record<EstadoContrato, string> = {
  vigente: 'Vigente',
  proximo_a_vencer: 'Prox. a vencer',
  vencido: 'Vencido',
}

// ─────────────────────────────────────────────────────────────────────

interface ContratosTableProps {
  contratos: ContratoConEstado[]
  onEdit: (contrato: ContratoConEstado) => void
  onDelete: (contrato: ContratoConEstado) => void
  onViewFile: (contrato: ContratoConEstado) => void
  isDeleting?: boolean
}

export function ContratosTable({
  contratos,
  onEdit,
  onDelete,
  onViewFile,
  isDeleting = false,
}: ContratosTableProps) {
  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="font-medium text-muted-foreground mb-1">
          No hay contratos registrados
        </h3>
        <p className="text-sm text-muted-foreground/70">
          Comienza agregando un nuevo contrato con el botón de arriba.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Notificar antes de</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contratos.map((contrato) => (
            <TableRow key={contrato.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{contrato.nombre}</span>
                  {contrato.archivo_principal_pathname && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onViewFile(contrato)}
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver documento</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {contrato.descripcion && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {contrato.descripcion}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm">{contrato.responsable || '-'}</span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Badge
                    variant="outline"
                    className={`text-xs w-fit ${ESTADO_CONTRATO_CLS[contrato.estado_calculado]}`}
                  >
                    {ESTADO_CONTRATO_LABEL[contrato.estado_calculado]}
                  </Badge>
                  {contrato.notificacion_vencida && contrato.estado_calculado === 'vigente' && (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs">Notif. pendiente</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        La fecha de notificacion ya paso
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">
                    {format(new Date(contrato.fecha_fin), 'd MMM yyyy', { locale: es })}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {contrato.dias_para_vencer > 0
                      ? `${contrato.dias_para_vencer} dias restantes`
                      : contrato.dias_para_vencer === 0
                        ? 'Vence hoy'
                        : `Vencio hace ${Math.abs(contrato.dias_para_vencer)} dias`}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">
                    {contrato.fecha_max_notificacion
                      ? format(new Date(contrato.fecha_max_notificacion), 'd MMM yyyy', { locale: es })
                      : '-'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {contrato.dias_preaviso} dias habiles
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {contrato.valor ? (
                  <span className="font-medium">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: contrato.moneda || 'COP',
                      minimumFractionDigits: 0,
                    }).format(contrato.valor)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(contrato)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    {contrato.archivo_principal_pathname && (
                      <DropdownMenuItem onClick={() => onViewFile(contrato)}>
                        <Download className="mr-2 h-4 w-4" />
                        Ver documento
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(contrato)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}

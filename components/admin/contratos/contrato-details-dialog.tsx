import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ContratoConEstado } from '@/lib/types/index';

interface ContratoDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoConEstado | null;
}

export function ContratoDetailsDialog({ open, onOpenChange, contrato }: ContratoDetailsDialogProps) {
  if (!contrato) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del contrato</DialogTitle>
          <DialogDescription>
            Información completa del contrato seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div>
            <span className="font-semibold">Nombre:</span> {contrato.nombre}
          </div>
          <div>
            <span className="font-semibold">Responsable:</span> {contrato.responsable || '-'}
          </div>
          <div>
            <span className="font-semibold">Descripción:</span> {contrato.descripcion || '-'}
          </div>
          <div>
            <span className="font-semibold">Estado:</span> <Badge>{contrato.estado_calculado}</Badge>
          </div>
          <div>
            <span className="font-semibold">Vigencia:</span> {contrato.fecha_inicio ? format(new Date(contrato.fecha_inicio), 'd MMM yyyy', { locale: es }) : '-'} a {contrato.fecha_fin ? format(new Date(contrato.fecha_fin), 'd MMM yyyy', { locale: es }) : '-'}
          </div>
          <div>
            <span className="font-semibold">Valor:</span> {contrato.valor ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: contrato.moneda || 'COP', minimumFractionDigits: 0 }).format(contrato.valor) : '-'}
          </div>
          <div>
            <span className="font-semibold">Observaciones:</span> {contrato.observaciones || '-'}
          </div>
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

'use client'

import { useState } from 'react'
import { analizarRutLocal } from '../services/ocr'
import type { RUTData, RepresentanteLegalData, SocioData } from '../model'
import type { TipoPersona } from '@/lib/types'

export interface RepresentanteResumen {
  nombre: string
  tipoRepresentacion: string
  isPep: boolean
  hasVinculoPep: boolean
}

export interface SocioResumen {
  nombre: string
  porcentaje: string
  isPep: boolean
  hasVinculoPep: boolean
}

/** Datos extraídos del RUT necesarios para el flujo de propuestas */
export interface DatosRutExtraidos {
  nit: string
  dv: string
  nitCompleto: string           // "NIT-DV" formato para nit_cedula
  razonSocial: string
  tipoPersona: TipoPersona
  representanteLegal: string
  email: string
  telefono: string
  direccion: string
  representantes: RepresentanteResumen[]
  socios: SocioResumen[]
  hayAlertaPep: boolean
}

function nombreCompleto(
  primerNombre: string | null,
  otrosNombres: string | null,
  primerApellido: string | null,
  segundoApellido: string | null
): string {
  return [primerNombre, otrosNombres, primerApellido, segundoApellido]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function mapRepresentante(r: RepresentanteLegalData): RepresentanteResumen {
  return {
    nombre: r.razonSocial || nombreCompleto(r.primerNombre, r.otrosNombres, r.primerApellido, r.segundoApellido),
    tipoRepresentacion: r.tipoRepresentacion,
    isPep: r.isPep ?? false,
    hasVinculoPep: r.hasVinculoPep ?? false,
  }
}

function mapSocio(s: SocioData): SocioResumen {
  return {
    nombre: s.razonSocial || nombreCompleto(s.primerNombre, s.otrosNombres, s.primerApellido, s.segundoApellido),
    porcentaje: s.porcentajeParticipacion ?? '',
    isPep: s.isPep ?? false,
    hasVinculoPep: s.hasVinculoPep ?? false,
  }
}

function mapRutData(rutData: RUTData): DatosRutExtraidos {
  const tipo = rutData.identificacion.tipoContribuyente?.toLowerCase() ?? ''
  const esJuridica = tipo.includes('jur')

  const representantePrincipal =
    rutData.representantesLegales.find((r) => r.tipoRepresentacion === 'Principal') ??
    rutData.representantesLegales[0] ??
    null

  const razonSocial = esJuridica
    ? rutData.identificacion.razonSocial ?? ''
    : nombreCompleto(
        rutData.identificacion.primerNombre,
        rutData.identificacion.otrosNombres,
        rutData.identificacion.primerApellido,
        rutData.identificacion.segundoApellido
      )

  const nit = rutData.header.nit || rutData.identificacion.numeroIdentificacion || ''
  const dv = rutData.header.dv || rutData.identificacion.dv || ''

  const representantes = rutData.representantesLegales.map(mapRepresentante)
  const socios = rutData.socios.map(mapSocio)

  const hayAlertaPep =
    representantes.some((r) => r.isPep || r.hasVinculoPep) ||
    socios.some((s) => s.isPep || s.hasVinculoPep) ||
    (rutData.contador?.isPep ?? false) ||
    (rutData.contador?.hasVinculoPep ?? false)

  return {
    nit,
    dv,
    nitCompleto: dv ? `${nit}-${dv}` : nit,
    razonSocial,
    tipoPersona: esJuridica ? 'juridica' : 'natural',
    representanteLegal: representantePrincipal
      ? representantePrincipal.razonSocial ||
        nombreCompleto(
          representantePrincipal.primerNombre,
          representantePrincipal.otrosNombres,
          representantePrincipal.primerApellido,
          representantePrincipal.segundoApellido
        )
      : '',
    email: rutData.ubicacion.email ?? '',
    telefono: rutData.ubicacion.telefono1 ?? '',
    direccion: rutData.ubicacion.direccion ?? '',
    representantes,
    socios,
    hayAlertaPep,
  }
}

interface EstadoExtraccion {
  extrayendo: boolean
  progreso: string
  error: string | null
  datos: DatosRutExtraidos | null
}

const ESTADO_INICIAL: EstadoExtraccion = {
  extrayendo: false,
  progreso: '',
  error: null,
  datos: null,
}

/**
 * Hook reutilizable para extraer datos de un PDF del RUT colombiano.
 * Envuelve analizarRutLocal() y expone una interfaz limpia orientada
 * al flujo de propuestas (FormPropuesta, DocumentosPage, ValidacionLegal).
 */
export function useRutAutocompletado() {
  const [estado, setEstado] = useState<EstadoExtraccion>(ESTADO_INICIAL)

  const extraerRut = async (file: File, signal?: AbortSignal): Promise<DatosRutExtraidos | null> => {
    setEstado({ extrayendo: true, progreso: 'Leyendo documento...', error: null, datos: null })

    try {
      const resultado = await analizarRutLocal(file, signal, (msg) =>
        setEstado((prev) => ({ ...prev, progreso: msg }))
      )

      if (!resultado.success || !resultado.data?.data) {
        throw new Error(resultado.message || 'No se pudo extraer información del RUT')
      }

      const datos = mapRutData(resultado.data.data)
      setEstado({ extrayendo: false, progreso: '', error: null, datos })
      return datos
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setEstado(ESTADO_INICIAL)
        return null
      }
      const error = e instanceof Error ? e.message : 'Error al procesar el RUT'
      setEstado({ extrayendo: false, progreso: '', error, datos: null })
      return null
    }
  }

  const limpiar = () => setEstado(ESTADO_INICIAL)

  return {
    extraerRut,
    limpiar,
    extrayendo: estado.extrayendo,
    progreso: estado.progreso,
    error: estado.error,
    datos: estado.datos,
  }
}

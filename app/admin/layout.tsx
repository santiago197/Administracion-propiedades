import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Administración - SelecionAdm',
  description: 'Panel de administración del sistema de selección de administradores',
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}

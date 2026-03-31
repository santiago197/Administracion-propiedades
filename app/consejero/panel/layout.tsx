import { ConsejeroShell } from '@/components/consejero/consejero-shell'

export default function ConsejeroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ConsejeroShell>{children}</ConsejeroShell>
}

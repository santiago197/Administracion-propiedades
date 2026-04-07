/**
 * Layout para la sección pública de proponentes
 * No requiere autenticación, solo validación de código
 */

export default function ProponenteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}

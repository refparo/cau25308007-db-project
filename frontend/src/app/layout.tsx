import './globals.css'
import ClientLayout from './layout-client'

export const metadata = {
  title: '教学管理系统'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

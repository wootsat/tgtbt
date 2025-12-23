import './globals.css'
import { Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/react" // <--- 1. Import this

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TGTBT',
  description: 'Too Good To Be True',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics /> {/* <--- 2. Add this component here */}
      </body>
    </html>
  )
}
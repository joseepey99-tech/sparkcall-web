import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  variable: '--font-outfit',
})

export const metadata = {
  title: 'SparkCall',
  description: 'Where Sparks Connect',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={outfit.variable} style={{
        background: '#06040E',
        color: '#EDE8F5',
        fontFamily: 'var(--font-outfit), sans-serif',
        margin: 0,
        padding: 0,
        minHeight: '100vh',
      }}>
        {children}
      </body>
    </html>
  )
}
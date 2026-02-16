import type { Metadata } from "next";
import { Literata, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "scriva — Write.",
  description:
    "Write your book in a distraction-free editor with AI that knows your characters, your voice, and your story. Manuscripts live in GitHub as markdown. Export EPUB & PDF. Open-source, MIT.",
  icons: {
    icon: "/scriva-mark.svg",
  },
  openGraph: {
    title: "Write.",
    description: "Your words, your repo, your rules.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    siteName: "scriva",
    type: "website",
    url: "https://openscriva.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "scriva — Write.",
    description: "Open-source, AI-native book writing.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="paper"
      className={`${literata.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=JSON.parse(localStorage.getItem("scriva-store")||"{}");var t=d&&d.state&&d.state.preferences&&d.state.preferences.theme;if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "Plain Next App",
  description: "A clean Next.js + TypeScript + Tailwind starter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black">{children}</body>
    </html>
  );
}


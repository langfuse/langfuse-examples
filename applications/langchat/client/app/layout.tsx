import { PipecatProvider } from './PipecatProvider';
import clsx from "clsx";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
	title: "Langchat",
	description:
		"An expert on Langfuse, powered by Pipecat, Daily, ElevenLabs, and Next.js.",
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={clsx(
					geist.variable,
					geistMono.variable,
					"bg-white min-h-dvh flex flex-col justify-between antialiased font-sans select-none"
				)}
			>
			<PipecatProvider>
				<main className="flex flex-col items-center justify-center grow">
					{children}
				</main>
			</PipecatProvider>
			</body>
		</html>
	);
}

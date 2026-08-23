export const metadata = {
  title: 'FB Scheduler',
  description: 'Facebook Multi-Page Scheduler',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}

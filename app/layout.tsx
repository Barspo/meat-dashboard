import './globals.css';
import type { Metadata } from 'next';
import { Rubik } from 'next/font/google'; 
// וודא שהקובץ Sidebar קיים בתיקייה הנכונה
import Sidebar from './components/Sidebar';

const rubik = Rubik({ subsets: ['latin', 'hebrew'] });

export const metadata: Metadata = {
  title: 'Meat Dashboard',
  description: 'Advanced production analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // כאן אנחנו מגדירים שהאתר הוא בעברית ומימין לשמאל
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} bg-slate-950 text-white flex min-h-screen`}>
        
        {/* כאן אנחנו שמים את התפריט שיופיע קבוע */}
        <Sidebar />

        {/* וכאן נכנס התוכן המשתנה (הדף הראשי, דף ביצועים וכו') */}
        <div className="flex-1 overflow-y-auto h-screen bg-slate-950">
          {children}
        </div>

      </body>
    </html>
  );
}
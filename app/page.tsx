import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full p-8 text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">نظام نوبتك</h1>
          <p className="text-slate-500">نظام إدارة طوابير الانتظار الذكي</p>
        </div>

        <div className="grid gap-4">
          <Link href="/admin" className="w-full">
            <Button className="w-full h-16 text-lg" variant="default">
              لوحة التحكم (Admin)
            </Button>
          </Link>

          <Link href="/display" className="w-full">
            <Button className="w-full h-16 text-lg" variant="outline">
              شاشة العرض (Display)
            </Button>
          </Link>
        </div>

        <div className="text-xs text-slate-400">
          تأكد من فتح شاشة العرض في نافذة منفصلة
        </div>
      </Card>
    </div>
  );
}

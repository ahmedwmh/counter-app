"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Plus, SkipForward, Volume2, Pause, Play, LogOut } from 'lucide-react';
import { QueueDB } from '@/lib/db';

export default function AdminPage() {
    const [db, setDb] = useState<QueueDB | null>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [currentCustomer, setCurrentCustomer] = useState<any>(null);
    const [name, setName] = useState('');
    const [isOffline, setIsOffline] = useState(false);
    const [nextNumber, setNextNumber] = useState(1);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPasswordError, setShowPasswordError] = useState(false);
    const [channel, setChannel] = useState<BroadcastChannel | null>(null);

    const ADMIN_PASSWORD = '1234';

    // Initialize BroadcastChannel
    useEffect(() => {
        const bc = new BroadcastChannel('nobatuk_channel');
        setChannel(bc);
        return () => bc.close();
    }, []);

    // Notify Display Page
    const notifyDisplay = (action: string, data?: any) => {
        if (channel) {
            channel.postMessage({ type: action, payload: data });
        }
    };

    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = () => {
        const authData = localStorage.getItem('nobatuk_auth');
        if (authData) {
            const { timestamp } = JSON.parse(authData);
            const now = Date.now();
            const twentyFourHours = 24 * 60 * 60 * 1000;

            if (now - timestamp < twentyFourHours) {
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem('nobatuk_auth');
            }
        }
    };

    const handlePasswordSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            const authData = {
                timestamp: Date.now()
            };
            localStorage.setItem('nobatuk_auth', JSON.stringify(authData));
            setIsAuthenticated(true);
            setPassword('');
            setShowPasswordError(false);
        } else {
            setShowPasswordError(true);
            setPassword('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('nobatuk_auth');
        setIsAuthenticated(false);
    };

    // Offline check
    useEffect(() => {
        setIsOffline(!navigator.onLine);
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const initDB = async () => {
            const queueDB = new QueueDB();
            await queueDB.init();
            setDb(queueDB);
            await loadCustomers(queueDB);
            checkDailyReset(queueDB);
        };
        initDB();
    }, []);

    const checkDailyReset = async (database: QueueDB) => {
        const lastDate = localStorage.getItem('nobatuk_last_date');
        const today = new Date().toDateString();

        if (lastDate !== today) {
            await database.clear();
            localStorage.setItem('nobatuk_last_date', today);
            setCustomers([]);
            setCurrentCustomer(null);
            setNextNumber(1);
            notifyDisplay('RESET');
        }
    };

    const loadCustomers = async (database: QueueDB) => {
        const allCustomers = await database.getAll();
        setCustomers(allCustomers);

        const current = allCustomers.find((c: any) => c.status === 'current');
        setCurrentCustomer(current || null);

        const maxNumber = allCustomers.reduce((max: number, c: any) => Math.max(max, c.number), 0);
        setNextNumber(maxNumber + 1);
    };

    const addCustomer = async () => {
        if (!name.trim() || !db) return;

        const newCustomer = {
            number: nextNumber,
            name: name.trim(),
            status: 'waiting',
            timestamp: Date.now()
        };

        try {
            await db.add(newCustomer);
            await loadCustomers(db);
            setName('');
            notifyDisplay('UPDATE');
        } catch (error) {
            console.error("Failed to add customer:", error);
        }
    };

    const callNext = async () => {
        if (!db) return;

        const waiting = customers.filter((c: any) => c.status === 'waiting').sort((a: any, b: any) => a.number - b.number);
        if (waiting.length === 0) return;

        try {
            if (currentCustomer) {
                await db.update({ ...currentCustomer, status: 'served' });
            }

            const next = waiting[0];
            await db.update({ ...next, status: 'current' });

            await loadCustomers(db);
            notifyDisplay('CALL_NEXT', { number: next.number, name: next.name });
        } catch (error) {
            console.error("Failed to call next:", error);
        }
    };

    const repeatCall = () => {
        if (!currentCustomer) return;
        notifyDisplay('REPEAT_CALL', { number: currentCustomer.number, name: currentCustomer.name });
    };

    const holdCustomer = async () => {
        if (!currentCustomer || !db) return;

        try {
            await db.update({ ...currentCustomer, status: 'hold' });
            await loadCustomers(db);
            notifyDisplay('HOLD');
        } catch (error) {
            console.error("Failed to hold customer:", error);
        }
    };

    const resumeCustomer = async (customer: any) => {
        if (!db) return;

        try {
            if (currentCustomer) {
                await db.update({ ...currentCustomer, status: 'waiting' });
            }

            await db.update({ ...customer, status: 'current' });
            await loadCustomers(db);
            notifyDisplay('CALL_NEXT', { number: customer.number, name: customer.name });
        } catch (error) {
            console.error("Failed to resume customer:", error);
        }
    };

    const waiting = customers.filter((c: any) => c.status === 'waiting');
    const onHold = customers.filter((c: any) => c.status === 'hold');

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8" dir="rtl">
                <Card className="w-full max-w-md p-8">
                    <div className="text-center mb-8">
                        <div className="text-3xl font-bold text-slate-800 mb-2">لوحة التحكم</div>
                        <div className="text-slate-500">أدخل كلمة المرور للوصول</div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Input
                                type="password"
                                placeholder="كلمة المرور"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setShowPasswordError(false);
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handlePasswordSubmit(e);
                                    }
                                }}
                                className="text-center text-lg"
                                autoFocus
                            />
                        </div>

                        {showPasswordError && (
                            <Alert className="bg-red-50 border-red-200">
                                <AlertDescription className="text-red-800 text-center">
                                    كلمة المرور غير صحيحة
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button onClick={handlePasswordSubmit} className="w-full">
                            دخول
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.location.href = '/display'}
                        >
                            الذهاب لشاشة العرض
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">
            {isOffline && (
                <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                        أنت تعمل الآن في وضع الأوفلاين، البيانات تُحفظ محلياً
                    </AlertDescription>
                </Alert>
            )}

            <div className="max-w-7xl mx-auto p-6">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">لوحة التحكم</h1>
                    <div className="flex gap-3">
                        <Button onClick={() => window.open('/display', '_blank')} variant="outline">
                            فتح شاشة العرض
                        </Button>
                        <Button onClick={handleLogout} variant="outline" className="text-red-600 hover:text-red-700 gap-2">
                            <LogOut className="h-4 w-4" />
                            تسجيل الخروج
                        </Button>
                    </div>
                </div>

                <Card className="p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">إضافة زبون جديد</h2>
                    <div className="flex gap-3">
                        <Input
                            placeholder="اسم الزبون"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={addCustomer} className="gap-2">
                            <Plus className="h-4 w-4" />
                            إضافة (رقم {nextNumber})
                        </Button>
                    </div>
                </Card>

                <Card className="p-6 mb-6 bg-gradient-to-l from-blue-50 to-transparent border-blue-200">
                    <h2 className="text-xl font-semibold mb-4">الزبون الحالي</h2>
                    {currentCustomer ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-4xl font-bold text-blue-600 mb-2">
                                    رقم {currentCustomer.number}
                                </div>
                                <div className="text-lg">{currentCustomer.name}</div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={repeatCall} variant="outline" className="gap-2">
                                    <Volume2 className="h-4 w-4" />
                                    تكرار
                                </Button>
                                <Button onClick={holdCustomer} variant="outline" className="gap-2">
                                    <Pause className="h-4 w-4" />
                                    معلق
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 py-8">لا يوجد زبون حالي</div>
                    )}
                </Card>

                <div className="grid grid-cols-2 gap-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">قائمة الانتظار ({waiting.length})</h2>
                            <Button onClick={callNext} disabled={waiting.length === 0} className="gap-2">
                                <SkipForward className="h-4 w-4" />
                                التالي
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {waiting.map((customer: any) => (
                                <div key={customer.id} className="p-3 bg-slate-50 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-bold text-lg">#{customer.number}</span>
                                            <span className="mx-2">-</span>
                                            <span>{customer.name}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {waiting.length === 0 && (
                                <div className="text-center text-slate-400 py-8">لا يوجد زبائن في الانتظار</div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">المعلقون ({onHold.length})</h2>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {onHold.map((customer: any) => (
                                <div key={customer.id} className="p-3 bg-amber-50 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-bold text-lg">#{customer.number}</span>
                                            <span className="mx-2">-</span>
                                            <span>{customer.name}</span>
                                        </div>
                                        <Button
                                            onClick={() => resumeCustomer(customer)}
                                            size="sm"
                                            variant="outline"
                                            className="gap-1"
                                        >
                                            <Play className="h-3 w-3" />
                                            استئناف
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {onHold.length === 0 && (
                                <div className="text-center text-slate-400 py-8">لا يوجد زبائن معلقون</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

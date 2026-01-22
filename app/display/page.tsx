"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { QueueDB } from '@/lib/db';

export default function DisplayPage() {
    const [db, setDb] = useState<QueueDB | null>(null);
    const [currentCustomer, setCurrentCustomer] = useState<any>(null);
    const [animation, setAnimation] = useState('');
    const [channel, setChannel] = useState<BroadcastChannel | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(false);

    // Initialize DB
    useEffect(() => {
        const initDB = async () => {
            const queueDB = new QueueDB();
            await queueDB.init();
            setDb(queueDB);
            await loadCustomers(queueDB);
        };
        initDB();
    }, []);

    const enableSound = () => {
        // Play a silent sound to unlock audio context
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const audioContext = new AudioContext();
            audioContext.resume().then(() => {
                setSoundEnabled(true);
                // Optional: Speak a test phrase
                const utterance = new SpeechSynthesisUtterance("تم تفعيل الصوت");
                utterance.lang = 'ar-SA';
                window.speechSynthesis.speak(utterance);
            });
        } else {
            setSoundEnabled(true);
        }
    };

    const loadCustomers = async (database: QueueDB) => {
        const allCustomers = await database.getAll();
        const current = allCustomers.find((c: any) => c.status === 'current');
        setCurrentCustomer(current || null);
    };

    // Improved Arabic TTS
    const speakArabic = (number: number, name: string) => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        // Add diacritics for better pronunciation
        const text = `الرَّقَمُ ${number}، ${name}`;
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = 'ar-SA';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        utterance.volume = 1;

        const loadVoiceAndSpeak = () => {
            const voices = window.speechSynthesis.getVoices();

            // Try to find Google or Maged voice
            const arabicVoice = voices.find(v => v.lang.startsWith('ar') && v.name.includes('Google'))
                || voices.find(v => v.lang.startsWith('ar') && v.name.includes('Maged'))
                || voices.find(v => v.lang.startsWith('ar'));

            if (arabicVoice) {
                utterance.voice = arabicVoice;
            }

            window.speechSynthesis.speak(utterance);
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            loadVoiceAndSpeak();
        } else {
            window.speechSynthesis.onvoiceschanged = loadVoiceAndSpeak;
        }
    };

    // Listen to BroadcastChannel
    useEffect(() => {
        const bc = new BroadcastChannel('nobatuk_channel');
        setChannel(bc);

        bc.onmessage = async (event) => {
            const { type, payload } = event.data;

            // Always reload data on any update
            if (db) {
                await loadCustomers(db);
            }

            if (type === 'CALL_NEXT' && payload) {
                setAnimation('next');
                setTimeout(() => setAnimation(''), 600);
                speakArabic(payload.number, payload.name);
            } else if (type === 'REPEAT_CALL' && payload) {
                setAnimation('repeat');
                setTimeout(() => setAnimation(''), 600);
                speakArabic(payload.number, payload.name);
            } else if (type === 'HOLD') {
                setAnimation('hold');
                setTimeout(() => setAnimation(''), 600);
            } else if (type === 'RESET') {
                setCurrentCustomer(null);
            }
        };

        return () => bc.close();
    }, [db]);

    if (!soundEnabled) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-center" dir="rtl">
                <div className="space-y-6">
                    <div className="text-white text-2xl font-bold">يرجى النقر لتفعيل الصوت</div>
                    <Button
                        onClick={enableSound}
                        size="lg"
                        className="text-xl px-8 py-6"
                    >
                        تفعيل شاشة العرض
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
            <div className="text-center">
                <div className={`transition-all duration-500 ${animation === 'next' ? 'scale-110 opacity-0' :
                        animation === 'repeat' ? 'animate-pulse' :
                            animation === 'hold' ? 'opacity-30 scale-95' :
                                'scale-100 opacity-100'
                    }`}>
                    <div className="text-slate-500 text-4xl mb-8">الرقم الحالي</div>
                    <div style={{ fontSize: '650px' }} className="font-bold text-slate-900 leading-none">
                        {currentCustomer ? currentCustomer.number : '-'}
                    </div>
                </div>
            </div>
        </div>
    );
}

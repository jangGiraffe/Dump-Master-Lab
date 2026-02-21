import React, { useState, useEffect } from 'react';
import quotes from '../assets/quotes.json';
import { Quote } from 'lucide-react';

export const RandomQuote: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [quote, setQuote] = useState({ text: '', author: '' });

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setQuote(quotes[randomIndex]);
    }, []);

    if (!quote.text) return null;

    return (
        <div className={`flex flex-col items-center justify-center text-center bg-blue-50/50 dark:bg-blue-900/10 p-6 md:p-8 rounded-2xl border border-blue-100 dark:border-blue-800/30 transition-all hover:shadow-md group ${className}`}>
            <Quote className="w-8 h-8 text-primary/30 dark:text-blue-500/30 mb-4 group-hover:text-primary transition-colors transform group-hover:scale-110" />
            <div className="max-w-2xl">
                <p className="text-sm md:text-base lg:text-lg text-gray-700 dark:text-slate-200 font-medium leading-relaxed italic mb-3">
                    "{quote.text}"
                </p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                    — {quote.author}
                </p>
            </div>
        </div>
    );
};

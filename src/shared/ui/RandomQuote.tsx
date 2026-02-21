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
        <div className={`flex items-start bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 transition-all hover:shadow-md group ${className}`}>
            <Quote className="w-5 h-5 text-primary/40 dark:text-blue-400/40 mr-3 mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
            <div>
                <p className="text-sm md:text-base text-gray-700 dark:text-slate-200 font-medium leading-relaxed italic">
                    "{quote.text}"
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 font-normal">
                    — {quote.author}
                </p>
            </div>
        </div>
    );
};

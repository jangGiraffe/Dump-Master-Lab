import React, { useState, useEffect, useRef } from 'react';

export const StudyCactus: React.FC = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Calculate distance from center (scaled down for subtle movement)
            const dx = (e.clientX - centerX) / 100;
            const dy = (e.clientY - centerY) / 100;

            // Cap the movement to keep pupils inside eyes
            const limit = 2.5;
            setMousePos({
                x: Math.max(-limit, Math.min(limit, dx)),
                y: Math.max(-limit, Math.min(limit, dy))
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="flex justify-center items-center w-full my-4 opacity-100 transition-opacity cursor-pointer animate-fadeIn">
            <svg
                ref={svgRef}
                width="240" height="140" viewBox="0 0 200 120"
                xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg"
            >
                <defs>
                    <style>
                        {`
              @keyframes skyCycle {
                0%, 100% { fill: #87CEEB; } /* Day */
                30% { fill: #4a90e2; } /* Evening */
                50% { fill: #1a2a6c; } /* Night */
                70% { fill: #b21f1f; } /* Dawn */
                90% { fill: #87CEEB; } 
              }
              @keyframes sunMoonCycle {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes blink {
                0%, 94%, 98% { transform: scaleY(1); }
                96%, 100% { transform: scaleY(0.1); }
              }
              @keyframes floatBook {
                0%, 100% { transform: translateY(0px) rotate(-2deg); }
                50% { transform: translateY(-4px) rotate(-2deg); }
              }
              @keyframes bookGlow {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.8; }
              }
              @keyframes musicNote {
                0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 0.8; }
                100% { transform: translate(10px, -20px) scale(1.2); opacity: 0; }
              }
            `}
                    </style>

                    <clipPath id="window-clip">
                        <circle cx="100" cy="55" r="45" />
                    </clipPath>

                    <radialGradient id="lamp-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFF8DC" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#FFF8DC" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Window / Sky Background */}
                <circle cx="100" cy="55" r="45" style={{ animation: 'skyCycle 12s infinite' }} stroke="#E2E8F0" strokeWidth="4" />

                {/* Sun & Moon Orbit */}
                <g clipPath="url(#window-clip)">
                    <g style={{ animation: 'sunMoonCycle 12s linear infinite', transformOrigin: '100px 55px' }}>
                        {/* Sun */}
                        <circle cx="100" cy="15" r="10" fill="#FFD700" />
                        <circle cx="100" cy="15" r="14" fill="#FFD700" opacity="0.3" />

                        {/* Moon */}
                        <path d="M 96 90 A 8 8 0 1 0 106 100 A 10 10 0 1 1 96 90" fill="#FFF8DC" />
                    </g>

                    {/* Desk inside window (optional, but gives depth) */}
                    <rect x="55" y="80" width="90" height="20" fill="#334155" opacity="0.5" />
                </g>

                {/* Window Frame / Sill overlay */}
                <path d="M 50 100 L 150 100 L 155 105 L 45 105 Z" fill="#94A3B8" />

                {/* Cactus Pot */}
                <path d="M 70 90 L 130 90 L 120 110 L 80 110 Z" fill="#D97706" />
                <rect x="68" y="90" width="64" height="6" rx="2" fill="#B45309" />
                <path d="M 90 90 L 110 90 L 108 110 L 92 110 Z" fill="rgba(0,0,0,0.1)" />

                {/* Cactus Body */}
                <path d="M 75 90 L 75 45 A 25 25 0 0 1 125 45 L 125 90 Z" fill="#22C55E" />

                {/* Cactus Ribs */}
                <path d="M 87.5 90 L 87.5 30 M 100 90 L 100 20 M 112.5 90 L 112.5 30" stroke="#16A34A" strokeWidth="2" opacity="0.3" strokeLinecap="round" />

                {/* Left Arm */}
                <path d="M 75 65 L 60 65 A 5 5 0 0 0 55 70 L 55 78 A 5 5 0 0 0 65 78 L 65 75 L 75 75" fill="#22C55E" />
                <path d="M 60 70 L 60 76" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />

                {/* Right Arm */}
                <path d="M 125 70 L 140 70 A 5 5 0 0 1 145 75 L 145 83 A 5 5 0 0 1 135 83 L 135 80 L 125 80" fill="#16A34A" />

                {/* Spikes */}
                <g stroke="#86EFAC" strokeWidth="1" strokeLinecap="round">
                    <line x1="73" y1="55" x2="69" y2="53" />
                    <line x1="127" y1="58" x2="131" y2="56" />
                    <line x1="73" y1="75" x2="69" y2="76" />
                    <line x1="127" y1="80" x2="131" y2="82" />
                </g>

                {/* Graduation Cap */}
                <g transform="translate(100, 24) scale(1.2)">
                    {/* Base of cap */}
                    <path d="M -14 0 L 14 0 L 14 6 Q 0 10 -14 6 Z" fill="#1F2937" />
                    {/* Top board */}
                    <polygon points="0,-12 24,-2 0,8 -24,-2" fill="#111827" />
                    {/* Tassel Button */}
                    <circle cx="0" cy="-2" r="2" fill="#F59E0B" />
                    {/* Tassel string */}
                    <path d="M 0 -2 L -15 2 L -15 10" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
                    {/* Tassel fringe */}
                    <polygon points="-16,10 -14,10 -13,15 -17,15" fill="#F59E0B" />
                </g>

                {/* Eyes */}
                <g style={{ animation: 'blink 5s infinite', transformOrigin: '100px 58px' }}>
                    {/* Left Eye */}
                    <rect x="80" y="52" width="16" height="18" rx="2" fill="white" stroke="#111827" strokeWidth="1.5" />
                    <rect
                        x={82 + mousePos.x}
                        y={55 + mousePos.y}
                        width="8" height="12" rx="1.5" fill="#111827"
                        style={{ transition: 'all 0.1s ease-out' }}
                    />

                    {/* Right Eye */}
                    <rect x="104" y="52" width="16" height="18" rx="2" fill="white" stroke="#111827" strokeWidth="1.5" />
                    <rect
                        x={106 + mousePos.x}
                        y={55 + mousePos.y}
                        width="8" height="12" rx="1.5" fill="#111827"
                        style={{ transition: 'all 0.1s ease-out' }}
                    />
                </g>

                {/* Mouth */}
                <g transform="translate(100, 75)">
                    <rect x="-18" y="0" width="36" height="11" rx="2.5" fill="#111827" />
                    {/* Top Teeth */}
                    <rect x="-14" y="1" width="4" height="4" fill="white" />
                    <rect x="-6" y="1" width="4" height="4" fill="white" />
                    <rect x="2" y="1" width="4" height="4" fill="white" />
                    <rect x="10" y="1" width="4" height="4" fill="white" />
                    {/* Bottom Teeth */}
                    <rect x="-10" y="6" width="4" height="4" fill="white" />
                    <rect x="-2" y="6" width="4" height="4" fill="white" />
                    <rect x="6" y="6" width="4" height="4" fill="white" />
                </g>

                {/* Book Glow / Desk Light */}
                <g style={{ animation: 'bookGlow 6s infinite ease-in-out' }}>
                    <ellipse cx="100" cy="103" rx="30" ry="10" fill="url(#lamp-glow)" />
                </g>

                {/* Floating Book */}
                <g style={{ animation: 'floatBook 3s ease-in-out infinite', transformOrigin: '100px 103px' }}>
                    {/* Pages */}
                    <path d="M 100 104 Q 88 98 75 103 L 70 93 Q 85 86 100 97 Z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" strokeLinejoin="round" />
                    <path d="M 100 104 Q 112 98 125 103 L 130 93 Q 115 86 100 97 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" strokeLinejoin="round" />
                    <path d="M 100 97 L 100 104" stroke="#94A3B8" strokeWidth="1.5" />

                    {/* Text lines */}
                    <g stroke="#94A3B8" strokeWidth="0.5" strokeLinecap="round">
                        <line x1="78" y1="96" x2="95" y2="94" />
                        <line x1="76" y1="99" x2="95" y2="97" />
                        <line x1="74" y1="102" x2="90" y2="100" />

                        <line x1="122" y1="96" x2="105" y2="94" />
                        <line x1="124" y1="99" x2="105" y2="97" />
                        <line x1="126" y1="102" x2="110" y2="100" />
                    </g>
                </g>

                {/* Music Notes */}
                <g style={{ animation: 'musicNote 4s linear infinite', transformOrigin: '120px 40px' }}>
                    <text x="115" y="40" fontSize="8" fill="#FDE047" style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.5)' }}>♪</text>
                </g>
                <g style={{ animation: 'musicNote 4s linear infinite 2s', transformOrigin: '130px 50px' }}>
                    <text x="125" y="50" fontSize="6" fill="#FCA5A5" style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.5)' }}>♫</text>
                </g>

            </svg>
        </div>
    );
};

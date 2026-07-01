'use client';

import { Box, SxProps, Theme } from '@mui/material';

export type IllustrationName =
    | 'empty'
    | 'messages'
    | 'homework'
    | 'learners'
    | 'behavior'
    | 'grades'
    | 'classes'
    | 'notifications';

const PALETTE = {
    primary: '#6366f1',
    secondary: '#06b6d4',
    accent: '#f59e0b',
    muted: '#94a3b8',
};

function SvgWrap({ children, sx }: { children: React.ReactNode; sx?: SxProps<Theme> }) {
    return (
        <Box sx={{ width: 120, height: 120, mx: 'auto', mb: 2, ...sx }} aria-hidden>
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                {children}
            </svg>
        </Box>
    );
}

export function EmptyIllustration({ name = 'empty' }: { name?: IllustrationName }) {
    switch (name) {
        case 'messages':
            return (
                <SvgWrap>
                    <rect x="20" y="30" width="80" height="55" rx="12" fill={PALETTE.muted} opacity="0.2" />
                    <path d="M32 48h56M32 58h40M32 68h48" stroke={PALETTE.primary} strokeWidth="3" strokeLinecap="round" />
                    <circle cx="88" cy="38" r="14" fill={PALETTE.secondary} opacity="0.9" />
                    <path d="M82 38h12M88 32v12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </SvgWrap>
            );
        case 'homework':
            return (
                <SvgWrap>
                    <rect x="28" y="22" width="64" height="76" rx="8" fill={PALETTE.primary} opacity="0.15" />
                    <rect x="34" y="32" width="52" height="8" rx="4" fill={PALETTE.primary} opacity="0.5" />
                    <rect x="34" y="48" width="40" height="6" rx="3" fill={PALETTE.muted} opacity="0.4" />
                    <rect x="34" y="60" width="44" height="6" rx="3" fill={PALETTE.muted} opacity="0.4" />
                    <circle cx="78" cy="78" r="18" fill={PALETTE.accent} opacity="0.85" />
                    <path d="M72 78l4 4 8-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </SvgWrap>
            );
        case 'learners':
            return (
                <SvgWrap>
                    <circle cx="45" cy="42" r="16" fill={PALETTE.primary} opacity="0.25" />
                    <circle cx="75" cy="42" r="16" fill={PALETTE.secondary} opacity="0.25" />
                    <path d="M22 88c0-14 10-24 23-24s23 10 23 24M52 88c0-14 10-24 23-24s23 10 23 24" stroke={PALETTE.primary} strokeWidth="3" strokeLinecap="round" />
                </SvgWrap>
            );
        case 'behavior':
            return (
                <SvgWrap>
                    <path d="M60 18l8 18h20l-16 12 6 18-18-12-18 12 6-18-16-12h20z" fill={PALETTE.accent} opacity="0.85" />
                    <circle cx="60" cy="88" r="20" fill={PALETTE.primary} opacity="0.15" />
                    <path d="M52 88h16" stroke={PALETTE.primary} strokeWidth="3" strokeLinecap="round" />
                </SvgWrap>
            );
        case 'grades':
            return (
                <SvgWrap>
                    <rect x="24" y="70" width="14" height="28" rx="4" fill={PALETTE.muted} opacity="0.35" />
                    <rect x="44" y="52" width="14" height="46" rx="4" fill={PALETTE.primary} opacity="0.5" />
                    <rect x="64" y="38" width="14" height="60" rx="4" fill={PALETTE.secondary} opacity="0.6" />
                    <rect x="84" y="58" width="14" height="40" rx="4" fill={PALETTE.accent} opacity="0.7" />
                </SvgWrap>
            );
        case 'classes':
            return (
                <SvgWrap>
                    <rect x="22" y="36" width="76" height="52" rx="10" stroke={PALETTE.primary} strokeWidth="3" />
                    <path d="M22 48h76" stroke={PALETTE.primary} strokeWidth="3" />
                    <rect x="32" y="58" width="20" height="20" rx="4" fill={PALETTE.secondary} opacity="0.4" />
                    <rect x="58" y="58" width="32" height="8" rx="4" fill={PALETTE.muted} opacity="0.35" />
                    <rect x="58" y="72" width="24" height="6" rx="3" fill={PALETTE.muted} opacity="0.35" />
                </SvgWrap>
            );
        case 'notifications':
            return (
                <SvgWrap>
                    <path d="M60 24a22 22 0 0122 22v14l8 10H30l8-10V46a22 22 0 0122-22z" fill={PALETTE.primary} opacity="0.2" stroke={PALETTE.primary} strokeWidth="2.5" />
                    <circle cx="78" cy="36" r="10" fill="#ef4444" />
                    <path d="M48 82a12 12 0 0024 0" stroke={PALETTE.muted} strokeWidth="2.5" strokeLinecap="round" />
                </SvgWrap>
            );
        default:
            return (
                <SvgWrap>
                    <circle cx="60" cy="60" r="40" fill={PALETTE.primary} opacity="0.1" />
                    <path d="M44 62c0-9 7-16 16-16s16 7 16 16" stroke={PALETTE.primary} strokeWidth="3" strokeLinecap="round" />
                    <circle cx="48" cy="48" r="4" fill={PALETTE.primary} />
                    <circle cx="72" cy="48" r="4" fill={PALETTE.primary} />
                </SvgWrap>
            );
    }
}

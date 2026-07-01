'use client';

import { Box, SxProps, Theme } from '@mui/material';
import { BRAND } from '@/lib/branding';

type BrandLogoVariant = 'full' | 'icon';

interface BrandLogoProps {
    variant?: BrandLogoVariant;
    height?: number;
    alt?: string;
    src?: string;
    /** White padded container for use on dark/colored backgrounds */
    onDark?: boolean;
    sx?: SxProps<Theme>;
}

export default function BrandLogo({
    variant = 'full',
    height,
    alt,
    src,
    onDark = false,
    sx,
}: BrandLogoProps) {
    const imageSrc = src ?? (variant === 'icon' ? BRAND.logoIconUrl : BRAND.logoUrl);
    const defaultHeight = variant === 'icon' ? 40 : 64;

    const image = (
        <Box
            component="img"
            src={imageSrc}
            alt={alt ?? `${BRAND.name} logo`}
            sx={{
                height: height ?? defaultHeight,
                width: 'auto',
                maxWidth: variant === 'full' ? 360 : undefined,
                objectFit: 'contain',
                display: 'block',
                ...sx,
            }}
        />
    );

    if (onDark) {
        return (
            <Box
                sx={{
                    display: 'inline-flex',
                    bgcolor: 'white',
                    borderRadius: 2,
                    p: 1.5,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                }}
            >
                {image}
            </Box>
        );
    }

    return image;
}

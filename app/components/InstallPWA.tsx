'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Typography, IconButton, Paper, Slide } from '@mui/material';
import { Close, DownloadForOffline, InstallMobile } from '@mui/icons-material';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only show if the user hasn't seen it recently (could add localStorage logic)
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
        setShowBanner(false);
    };

    return (
        <Slide direction="up" in={showBanner} mountOnEnter unmountOnExit>
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: { xs: 16, md: 'auto' },
                    right: { xs: 16, md: 32 },
                    p: 2,
                    zIndex: 9999,
                    borderRadius: 3,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    boxShadow: 10
                }}
            >
                <InstallMobile />
                <Box>
                    <Typography variant="subtitle2" fontWeight="bold">EduLink is better in-app</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>Add to your home screen for instant access.</Typography>
                </Box>
                <Box display="flex" gap={1} ml="auto">
                    <Button
                        size="small"
                        variant="contained"
                        color="secondary"
                        onClick={handleInstallClick}
                        sx={{ borderRadius: 2, fontWeight: 'bold' }}
                    >
                        Install
                    </Button>
                    <IconButton size="small" color="inherit" onClick={() => setShowBanner(false)}>
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </Paper>
        </Slide>
    );
}

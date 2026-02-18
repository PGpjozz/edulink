'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
    useEffect(() => {
        // Temporarily disabled to prevent SW registration errors
        // if ('serviceWorker' in navigator) {
        //     navigator.serviceWorker
        //         .register('/sw.js')
        //         .then((registration) => {
        //             console.log('SW registered: ', registration);
        //         })
        //         .catch((registrationError) => {
        //             console.log('SW registration failed: ', registrationError);
        //         });
        // }
    }, []);

    return null;
}

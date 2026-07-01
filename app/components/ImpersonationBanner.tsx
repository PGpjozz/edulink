'use client';

import { Alert, Button } from '@mui/material';
import { signOut } from 'next-auth/react';

export default function ImpersonationBanner() {
    return (
        <Alert
            severity="warning"
            sx={{ borderRadius: 0 }}
            action={
                <Button color="inherit" size="small" onClick={() => signOut({ callbackUrl: '/dashboard/provider' })}>
                    End session
                </Button>
            }
        >
            You are viewing this school account via audited provider impersonation.
        </Alert>
    );
}

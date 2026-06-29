'use client';

import { useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

type Props = {
    action: string;
    fields: Record<string, string>;
};

export default function PayFastRedirect({ action, fields }: Props) {
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        formRef.current?.submit();
    }, [action, fields]);

    return (
        <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
            <CircularProgress />
            <Typography>Redirecting to PayFast…</Typography>
            <form ref={formRef} action={action} method="POST" style={{ display: 'none' }}>
                {Object.entries(fields).map(([name, value]) => (
                    <input key={name} type="hidden" name={name} value={value} />
                ))}
            </form>
        </Box>
    );
}

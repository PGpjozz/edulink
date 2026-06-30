'use client';

import { useRef, useState } from 'react';
import { Box, Button, Typography, LinearProgress, Alert, Link as MuiLink, IconButton } from '@mui/material';
import { CloudUpload, InsertDriveFile, Close } from '@mui/icons-material';

export type UploadedFile = { url: string; name: string };

export default function FileUpload({
    onUploaded,
    label = 'Attach file',
    accept,
    initial,
}: {
    onUploaded: (file: UploadedFile | null) => void;
    label?: string;
    accept?: string;
    initial?: UploadedFile | null;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [file, setFile] = useState<UploadedFile | null>(initial ?? null);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setUploading(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Upload failed');
                return;
            }
            const data = await res.json();
            const uploaded = { url: data.url, name: data.name };
            setFile(uploaded);
            onUploaded(uploaded);
        } catch {
            setError('Upload failed');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const clear = () => {
        setFile(null);
        onUploaded(null);
    };

    return (
        <Box sx={{ my: 1 }}>
            <input ref={inputRef} type="file" hidden accept={accept} onChange={handleChange} />
            {file ? (
                <Box display="flex" alignItems="center" gap={1} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <InsertDriveFile color="action" fontSize="small" />
                    <MuiLink href={file.url} target="_blank" rel="noopener" sx={{ flex: 1 }} noWrap>
                        {file.name}
                    </MuiLink>
                    <IconButton size="small" onClick={clear} aria-label="Remove file"><Close fontSize="small" /></IconButton>
                </Box>
            ) : (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloudUpload />}
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? 'Uploading…' : label}
                </Button>
            )}
            {uploading && <LinearProgress sx={{ mt: 1 }} />}
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            {!file && !uploading && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Max 10MB.
                </Typography>
            )}
        </Box>
    );
}

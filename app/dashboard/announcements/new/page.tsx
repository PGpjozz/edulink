'use client';

import { useState } from 'react';
import {
    Container, Typography, Box, Paper, TextField, Button, FormControl,
    InputLabel, Select, MenuItem, Alert, Stack,
} from '@mui/material';
import { useRouter } from 'next/navigation';

export default function NewAnnouncementPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('SCHOOL');
    const [grade, setGrade] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, audience, grade: audience === 'GRADE' ? grade : undefined }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error || 'Failed to post');
            return;
        }
        router.push('/dashboard/announcements');
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>Post announcement</Typography>
            <Paper sx={{ p: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <TextField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
                        <TextField label="Message" required multiline minRows={4} value={content} onChange={(e) => setContent(e.target.value)} />
                        <FormControl fullWidth>
                            <InputLabel>Audience</InputLabel>
                            <Select value={audience} label="Audience" onChange={(e) => setAudience(e.target.value)}>
                                <MenuItem value="SCHOOL">Whole school</MenuItem>
                                <MenuItem value="GRADE">Specific grade</MenuItem>
                                <MenuItem value="PARENTS">Parents only</MenuItem>
                                <MenuItem value="LEARNERS">Learners only</MenuItem>
                            </Select>
                        </FormControl>
                        {audience === 'GRADE' && (
                            <TextField label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
                        )}
                        <Box display="flex" gap={2}>
                            <Button type="submit" variant="contained" disabled={loading}>Publish</Button>
                            <Button variant="outlined" onClick={() => router.back()}>Cancel</Button>
                        </Box>
                    </Stack>
                </Box>
            </Paper>
        </Container>
    );
}

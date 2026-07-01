'use client';

import { useEffect, useState } from 'react';
import {
    Container, Box, Button, Stack, Chip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import { Assignment } from '@mui/icons-material';
import PageHeader from '@/app/components/ui/PageHeader';
import PageTransition from '@/app/components/ui/PageTransition';
import ContentPanel from '@/app/components/ui/ContentPanel';
import EmptyState from '@/app/components/ui/EmptyState';

type HomeworkItem = {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    subject?: { name: string };
    teacher?: { firstName: string; lastName: string };
    submissions?: { id: string; note?: string; submittedAt: string }[];
};

export default function LearnerHomeworkPage() {
    const [items, setItems] = useState<HomeworkItem[]>([]);
    const [selected, setSelected] = useState<HomeworkItem | null>(null);
    const [note, setNote] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const load = () => {
        fetch('/api/homework').then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []));
    };

    useEffect(() => { load(); }, []);

    const openSubmit = (h: HomeworkItem) => {
        setSelected(h);
        setNote(h.submissions?.[0]?.note ?? '');
        setFileUrl('');
        setError('');
    };

    const submit = async () => {
        if (!selected) return;
        setLoading(true);
        setError('');
        const res = await fetch(`/api/homework/${selected.id}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note, fileUrl: fileUrl.trim() || undefined }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(data.error || 'Submit failed');
            return;
        }
        setSelected(null);
        load();
    };

    return (
        <PageTransition>
            <Container maxWidth="md">
                <PageHeader
                    title="My homework"
                    subtitle="View assignments and submit your work."
                />

                <Stack spacing={2}>
                    {items.map((h) => {
                        const submitted = h.submissions && h.submissions.length > 0;
                        return (
                            <ContentPanel key={h.id} title={h.title} subtitle={h.description}>
                                <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                                    {h.subject && <Chip size="small" label={h.subject.name} />}
                                    <Chip size="small" label={`Due ${new Date(h.dueDate).toLocaleDateString()}`} />
                                    {submitted ? (
                                        <Chip size="small" color="success" label="Submitted" />
                                    ) : (
                                        <Button size="small" variant="contained" onClick={() => openSubmit(h)}>
                                            Submit
                                        </Button>
                                    )}
                                </Box>
                            </ContentPanel>
                        );
                    })}
                    {items.length === 0 && (
                        <EmptyState
                            icon={<Assignment sx={{ fontSize: 56 }} />}
                            title="All caught up"
                            description="No homework assigned right now."
                        />
                    )}
                </Stack>

            <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Submit: {selected?.title}</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        label="Your answer / notes"
                        multiline
                        minRows={4}
                        fullWidth
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                    <TextField
                        label="Attachment link (optional)"
                        placeholder="Google Drive, OneDrive, etc."
                        fullWidth
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        sx={{ mt: 2 }}
                        helperText="Paste a share link if your work is in a file"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelected(null)}>Cancel</Button>
                    <Button variant="contained" onClick={submit} disabled={loading}>
                        {loading ? 'Submitting…' : 'Submit'}
                    </Button>
                </DialogActions>
            </Dialog>
            </Container>
        </PageTransition>
    );
}

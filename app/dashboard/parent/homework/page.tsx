'use client';

import { Suspense, useEffect, useState } from 'react';
import {
    Container, Typography, Box, Paper, Stack, Chip,
} from '@mui/material';
import { CircularProgress } from '@mui/material';
import ParentChildPicker from '@/app/components/ParentChildPicker';
import { useParentChild } from '@/lib/useParentChild';

type HomeworkItem = {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    subject?: { name: string };
    submissions?: { submittedAt: string; grade?: number; feedback?: string }[];
};

function ParentHomeworkInner() {
    const { children, selected, loading, setChildId, learnerProfileId } = useParentChild();
    const [items, setItems] = useState<HomeworkItem[]>([]);

    useEffect(() => {
        if (!learnerProfileId) return;
        fetch(`/api/homework?learnerId=${learnerProfileId}`)
            .then((r) => r.json())
            .then((d) => setItems(Array.isArray(d) ? d : []));
    }, [learnerProfileId]);

    if (loading) {
        return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>Homework</Typography>

            {selected && (
                <ParentChildPicker
                    options={children}
                    value={selected.id}
                    onChange={setChildId}
                />
            )}

            <Stack spacing={2}>
                {items.map((h) => {
                    const sub = h.submissions?.[0];
                    return (
                        <Paper key={h.id} variant="outlined" sx={{ p: 2 }}>
                            <Typography fontWeight="bold">{h.title}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {h.description}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                {h.subject && <Chip size="small" label={h.subject.name} />}
                                <Chip size="small" label={`Due ${new Date(h.dueDate).toLocaleDateString()}`} />
                                {sub ? (
                                    <Chip
                                        size="small"
                                        color="success"
                                        label={sub.grade != null ? `Graded: ${sub.grade}%` : 'Submitted'}
                                    />
                                ) : (
                                    <Chip size="small" color="warning" label="Not submitted" />
                                )}
                            </Box>
                            {sub?.feedback && (
                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                    Feedback: {sub.feedback}
                                </Typography>
                            )}
                        </Paper>
                    );
                })}
                {items.length === 0 && (
                    <Typography color="text.secondary">No homework for this learner.</Typography>
                )}
            </Stack>
        </Container>
    );
}

export default function ParentHomeworkPage() {
    return (
        <Suspense fallback={<Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}>
            <ParentHomeworkInner />
        </Suspense>
    );
}

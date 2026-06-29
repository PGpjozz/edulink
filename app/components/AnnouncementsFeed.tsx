'use client';

import { useEffect, useState } from 'react';
import {
    Box, Typography, Paper, Chip, CircularProgress, Alert, Stack,
} from '@mui/material';
import { Campaign as CampaignIcon } from '@mui/icons-material';

type Announcement = {
    id: string;
    title: string;
    content: string;
    audience: string;
    grade?: string;
    publishedAt: string;
    author?: { firstName: string; lastName: string; role: string };
    class?: { name: string };
};

export default function AnnouncementsFeed({ compact = false }: { compact?: boolean }) {
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/announcements')
            .then((r) => r.json())
            .then((d) => setItems(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={compact ? 2 : 4}>
                <CircularProgress size={compact ? 24 : 32} />
            </Box>
        );
    }

    if (items.length === 0) {
        return (
            <Alert severity="info" icon={<CampaignIcon />}>
                No announcements right now.
            </Alert>
        );
    }

    return (
        <Stack spacing={2}>
            {items.map((a) => (
                <Paper key={a.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">{a.title}</Typography>
                        <Chip
                            size="small"
                            label={
                                a.audience === 'SCHOOL' ? 'Whole school'
                                    : a.audience === 'PARENTS' ? 'Parents'
                                        : a.audience === 'LEARNERS' ? 'Learners'
                                            : a.audience === 'GRADE' ? `Grade ${a.grade}`
                                                : a.class?.name ?? 'Class'
                            }
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                        {a.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {a.author ? `${a.author.firstName} ${a.author.lastName}` : 'Staff'}
                        {' · '}
                        {new Date(a.publishedAt).toLocaleString()}
                    </Typography>
                </Paper>
            ))}
        </Stack>
    );
}

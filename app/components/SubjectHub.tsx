'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    IconButton,
    CircularProgress
} from '@mui/material';
import {
    CloudUpload,
    InsertDriveFile,
    Download,
    Delete,
    Assignment,
    CheckCircle,
    Error as ErrorIcon
} from '@mui/icons-material';

interface SubjectHubProps {
    subjectId: string;
    role: string;
}

export default function SubjectHub({ subjectId, role }: SubjectHubProps) {
    const [resources, setResources] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);

    // New Resource State
    const [newTitle, setNewTitle] = useState('');
    const [newFileUrl, setNewFileUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resRes, assessRes] = await Promise.all([
                fetch(`/api/subjects/${subjectId}/resources`),
                fetch(`/api/subjects/${subjectId}/assessments`) // Reusing existing assessments endpoint if possible or just filter
            ]);
            setResources(await resRes.json());
            const allAssess = await assessRes.json();
            setAssessments(allAssess);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [subjectId]);

    const handleUploadResource = async () => {
        setUploading(true);
        try {
            const res = await fetch(`/api/subjects/${subjectId}/resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    fileUrl: newFileUrl || 'https://example.com/mock-file.pdf',
                    fileType: 'PDF'
                })
            });
            if (res.ok) {
                setUploadOpen(false);
                setNewTitle('');
                setNewFileUrl('');
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    // Submission State
    const [submittingAssessment, setSubmittingAssessment] = useState<any>(null);
    const [submissionFile, setSubmissionFile] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitWork = async () => {
        if (!submittingAssessment || !submissionFile) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/assessments/${submittingAssessment.id}/submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: submissionFile || 'https://example.com/student-submission.pdf' })
            });
            if (res.ok) {
                setSubmittingAssessment(null);
                setSubmissionFile('');
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Grid container spacing={4}>
                {/* Resources Section */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="bold">Learning Resources</Typography>
                            {(role === 'TEACHER' || role === 'PRINCIPAL') && (
                                <Button
                                    size="small"
                                    startIcon={<CloudUpload />}
                                    variant="contained"
                                    onClick={() => setUploadOpen(true)}
                                >
                                    Upload
                                </Button>
                            )}
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            {resources.map((res: any) => (
                                <ListItem
                                    key={res.id}
                                    secondaryAction={
                                        <IconButton edge="end" component="a" href={res.fileUrl} target="_blank">
                                            <Download />
                                        </IconButton>
                                    }
                                >
                                    <ListItemIcon><InsertDriveFile /></ListItemIcon>
                                    <ListItemText
                                        primary={res.title}
                                        secondary={new Date(res.createdAt).toLocaleDateString()}
                                    />
                                </ListItem>
                            ))}
                            {resources.length === 0 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                    No resources uploaded yet.
                                </Typography>
                            )}
                        </List>
                    </Paper>
                </Grid>

                {/* Submissions/Assessments Section */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>Active Tasks</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List>
                            {assessments.map((assess: any) => (
                                <ListItem key={assess.id}>
                                    <ListItemIcon><Assignment /></ListItemIcon>
                                    <ListItemText
                                        primary={assess.title}
                                        secondary={`Due: ${new Date(assess.date).toLocaleDateString()}`}
                                    />
                                    {role === 'LEARNER' ? (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => setSubmittingAssessment(assess)}
                                        >
                                            Submit Work
                                        </Button>
                                    ) : (
                                        <Button variant="text" size="small">View Submissions</Button>
                                    )}
                                </ListItem>
                            ))}
                            {assessments.length === 0 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                    No assessments scheduled.
                                </Typography>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* Upload Dialog */}
            <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Share Resource</DialogTitle>
                <DialogContent>
                    <Box mt={2} display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Resource Title"
                            fullWidth
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                        <TextField
                            label="File URL (Simulated)"
                            placeholder="https://..."
                            fullWidth
                            value={newFileUrl}
                            onChange={(e) => setNewFileUrl(e.target.value)}
                        />
                        <Typography variant="caption" color="text.secondary">
                            In a real app, this would be a file picker reaching S3/storage.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleUploadResource}
                        disabled={uploading || !newTitle}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Submission Dialog */}
            <Dialog open={!!submittingAssessment} onClose={() => setSubmittingAssessment(null)} fullWidth maxWidth="xs">
                <DialogTitle>Submit: {submittingAssessment?.title}</DialogTitle>
                <DialogContent>
                    <Box mt={2} display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Submission URL (Simulated)"
                            fullWidth
                            value={submissionFile}
                            onChange={(e) => setSubmissionFile(e.target.value)}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Ensure you provide a valid link to your completed worksheet or document.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSubmittingAssessment(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitWork}
                        disabled={isSubmitting || !submissionFile}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

'use client';

import { useRef, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
    Alert, TextField, Table, TableHead, TableRow, TableCell, TableBody, Chip, Link as MuiLink,
} from '@mui/material';
import { UploadFile, Download } from '@mui/icons-material';

type Row = Record<string, string>;
type ImportResult = { row: number; status: 'created' | 'error'; name?: string; error?: string };

const FIELDS = ['role', 'firstName', 'lastName', 'email', 'idNumber', 'grade', 'gender', 'employeeNumber', 'staffTitle', 'password'];
const HEADER_ALIASES: Record<string, string> = {
    role: 'role', firstname: 'firstName', lastname: 'lastName', email: 'email',
    idnumber: 'idNumber', admissionno: 'idNumber', 'admission no': 'idNumber',
    grade: 'grade', gender: 'gender', employeenumber: 'employeeNumber', employeeno: 'employeeNumber',
    stafftitle: 'staffTitle', title: 'staffTitle', jobtitle: 'staffTitle', password: 'password',
};

function parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
}

function parseCsv(text: string): Row[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = parseLine(lines[0]).map((h) => HEADER_ALIASES[h.toLowerCase()] || h);
    return lines.slice(1).map((line) => {
        const cells = parseLine(line);
        const row: Row = {};
        headers.forEach((h, i) => { if (FIELDS.includes(h)) row[h] = cells[i] ?? ''; });
        return row;
    });
}

const TEMPLATE = [
    'role,firstName,lastName,email,idNumber,grade,gender,employeeNumber,staffTitle,password',
    'LEARNER,Liam,Mokoena,,DC8001,8,Male,,,',
    'TEACHER,Amanda,Jacobs,amanda.jacobs@example.com,,,,EMP009,,',
    'STAFF,Rebecca,Khumalo,rebecca.khumalo@example.com,,,,EMP036,Librarian,',
].join('\n');

export default function BulkImportModal({
    open, onClose, onImported, onNotify,
}: {
    open: boolean;
    onClose: () => void;
    onImported?: () => void;
    onNotify?: (msg: string) => void;
}) {
    const [text, setText] = useState('');
    const [rows, setRows] = useState<Row[]>([]);
    const [results, setResults] = useState<ImportResult[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const reset = () => { setText(''); setRows([]); setResults(null); setError(''); };

    const handleParse = (raw: string) => {
        setText(raw);
        setResults(null);
        setError('');
        try {
            setRows(parseCsv(raw));
        } catch {
            setError('Could not parse CSV');
            setRows([]);
        }
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const raw = await f.text();
        handleParse(raw);
        if (fileRef.current) fileRef.current.value = '';
    };

    const downloadTemplate = () => {
        const blob = new Blob([TEMPLATE], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edulink-import-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
        if (rows.length === 0) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Import failed'); return; }
            setResults(data.results);
            onImported?.();
            onNotify?.(`Imported ${data.created} of ${data.total} users.`);
        } catch {
            setError('Import failed');
        } finally {
            setBusy(false);
        }
    };

    const errorCount = results?.filter((r) => r.status === 'error').length ?? 0;
    const createdCount = results?.filter((r) => r.status === 'created').length ?? 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Bulk import users (CSV)</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Import learners and staff in bulk. Columns: role, firstName, lastName, email, idNumber
                    (admission no for learners), grade, gender, employeeNumber, staffTitle, password.
                    Roles: LEARNER, TEACHER, HOD, SCHOOL_ADMIN, PARENT, STAFF. Blank passwords default to one
                    the user must change at first login.
                </Typography>
                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <Button size="small" startIcon={<Download />} onClick={downloadTemplate}>Download template</Button>
                    <Button size="small" startIcon={<UploadFile />} onClick={() => fileRef.current?.click()}>Upload .csv</Button>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <TextField
                    label="Paste CSV"
                    multiline
                    minRows={5}
                    fullWidth
                    value={text}
                    onChange={(e) => handleParse(e.target.value)}
                    placeholder={TEMPLATE}
                    sx={{ mb: 2, fontFamily: 'monospace' }}
                />

                {rows.length > 0 && !results && (
                    <>
                        <Typography variant="subtitle2" gutterBottom>Preview — {rows.length} row(s)</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Role</TableCell><TableCell>Name</TableCell>
                                    <TableCell>Email / ID</TableCell><TableCell>Grade/Title</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.slice(0, 6).map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{r.role}</TableCell>
                                        <TableCell>{r.firstName} {r.lastName}</TableCell>
                                        <TableCell>{r.email || r.idNumber || '—'}</TableCell>
                                        <TableCell>{r.grade || r.staffTitle || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {rows.length > 6 && <Typography variant="caption" color="text.secondary">…and {rows.length - 6} more</Typography>}
                    </>
                )}

                {results && (
                    <Box>
                        <Box display="flex" gap={1} mb={1}>
                            <Chip color="success" label={`${createdCount} created`} />
                            {errorCount > 0 && <Chip color="error" label={`${errorCount} failed`} />}
                        </Box>
                        {errorCount > 0 && (
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Row</TableCell><TableCell>Name</TableCell><TableCell>Error</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {results.filter((r) => r.status === 'error').map((r) => (
                                        <TableRow key={r.row}>
                                            <TableCell>{r.row}</TableCell>
                                            <TableCell>{r.name || '—'}</TableCell>
                                            <TableCell><Typography variant="body2" color="error">{r.error}</Typography></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => { reset(); onClose(); }}>Close</Button>
                {!results && (
                    <Button variant="contained" onClick={handleImport} disabled={busy || rows.length === 0}>
                        {busy ? 'Importing…' : `Import ${rows.length || ''} user(s)`}
                    </Button>
                )}
                {results && <Button variant="contained" onClick={reset}>Import more</Button>}
            </DialogActions>
        </Dialog>
    );
}

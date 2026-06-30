import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Divider,
    TextField,
    IconButton,
    CircularProgress,
    Chip,
    useTheme,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Badge,
    ListItemButton
} from '@mui/material';
import { Send, School, Add } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface Message {
    id: string;
    senderId: string;
    recipientId: string;
    content: string;
    subject: string;
    readAt: string | null;
    createdAt: string;
    sender: { id: string, firstName: string, lastName: string, role: string };
    recipient: { id: string, firstName: string, lastName: string, role: string };
}

interface Conversation {
    id: string;
    user: { id: string; firstName: string; lastName: string; role: string };
    lastMessage: string;
    timestamp: string;
    subject: string;
    unreadCount: number;
}

const POLL_INTERVAL_MS = 15000;

export default function MessagingInterface() {
    const { data: session } = useSession();
    const theme = useTheme();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [openDialog, setOpenDialog] = useState(false);
    const [recipients, setRecipients] = useState<any[]>([]);
    const [selectedRecipientId, setSelectedRecipientId] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);

    const buildConversations = useCallback((data: Message[]) => {
        const convos: Record<string, Conversation> = {};
        data.forEach((msg) => {
            const otherUser = msg.senderId === session?.user?.id ? msg.recipient : msg.sender;
            const otherUserId = otherUser.id;
            const isUnread = msg.recipientId === session?.user?.id && !msg.readAt;

            if (!convos[otherUserId]) {
                convos[otherUserId] = {
                    id: otherUserId,
                    user: otherUser,
                    lastMessage: msg.content,
                    timestamp: msg.createdAt,
                    subject: msg.subject,
                    unreadCount: isUnread ? 1 : 0,
                };
            } else {
                if (isUnread) convos[otherUserId].unreadCount += 1;
            }
        });
        return Object.values(convos);
    }, [session?.user?.id]);

    const fetchConversations = useCallback(() => {
        return fetch('/api/messages')
            .then(res => res.json())
            .then((data: Message[]) => {
                setConversations(buildConversations(data));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [buildConversations]);

    const fetchRecipients = () => {
        fetch('/api/users/recipients')
            .then(res => res.json())
            .then(setRecipients);
    };

    const markConversationRead = async (senderId: string) => {
        await fetch('/api/messages', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId }),
        });
    };

    useEffect(() => {
        fetchConversations();
        fetchRecipients();
    }, [fetchConversations, session?.user?.id]);

    useEffect(() => {
        const interval = setInterval(fetchConversations, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    useEffect(() => {
        if (!selectedUserId) return;

        setLoading(true);
        fetch(`/api/messages?userId=${selectedUserId}`)
            .then(res => res.json())
            .then((data: Message[]) => {
                setMessages(data);
                setLoading(false);
                markConversationRead(selectedUserId).then(() => {
                    setConversations(prev =>
                        prev.map(c => c.id === selectedUserId ? { ...c, unreadCount: 0 } : c)
                    );
                });
            })
            .catch(() => setLoading(false));
    }, [selectedUserId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedUserId) return;

        setSending(true);
        try {
            const existingSubject = messages[0]?.subject ?? 'General';
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: selectedUserId,
                    subject: existingSubject,
                    content: newMessage
                })
            });

            if (res.ok) {
                const msg = await res.json();
                const fullMsg: Message = {
                    ...msg,
                    sender: {
                        id: session?.user?.id ?? '',
                        firstName: 'Me',
                        lastName: '',
                        role: session?.user?.role ?? '',
                    },
                    recipient: selectedUser ?? { id: '', firstName: '', lastName: '', role: '' },
                };
                setMessages(prev => [...prev, fullMsg]);
                setNewMessage('');
                fetchConversations();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const handleStartNewChat = async () => {
        if (!selectedRecipientId || !newMessage.trim()) return;
        setSending(true);
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: selectedRecipientId,
                    subject: 'General',
                    content: newMessage
                })
            });
            if (res.ok) {
                setOpenDialog(false);
                setNewMessage('');
                setSelectedRecipientId('');
                setSelectedUserId(selectedRecipientId);
                fetchConversations();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const selectedUser = conversations.find(c => c.id === selectedUserId)?.user;
    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return (
        <Paper sx={{ height: '70vh', display: 'flex', overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{ width: { xs: 80, sm: 320 }, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        Chats{totalUnread > 0 ? ` (${totalUnread})` : ''}
                    </Typography>
                    <IconButton color="primary" onClick={() => setOpenDialog(true)} disabled={recipients.length === 0}>
                        <Add />
                    </IconButton>
                </Box>
                <Divider />
                <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {conversations.length === 0 && !loading && (
                        <Box px={2} py={4} textAlign="center">
                            <Typography variant="body2" color="text.secondary">No conversations yet</Typography>
                        </Box>
                    )}
                    {conversations.map((convo) => (
                        <ListItem key={convo.id} disablePadding sx={{ px: { xs: 1, sm: 2 } }}>
                            <ListItemButton
                                selected={selectedUserId === convo.id}
                                onClick={() => setSelectedUserId(convo.id)}
                                sx={{ borderRadius: 2 }}
                            >
                                <ListItemAvatar>
                                    <Badge color="error" variant="dot" invisible={convo.unreadCount === 0}>
                                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                                            {convo.user.firstName[0]}
                                        </Avatar>
                                    </Badge>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${convo.user.firstName} ${convo.user.lastName}`}
                                    secondary={convo.lastMessage}
                                    sx={{ display: { xs: 'none', sm: 'block' } }}
                                    primaryTypographyProps={{ fontWeight: convo.unreadCount > 0 ? 'bold' : 'medium' }}
                                    secondaryTypographyProps={{ noWrap: true }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                {selectedUserId ? (
                    <>
                        <Box p={2} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{selectedUser?.firstName[0]}</Avatar>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {selectedUser?.firstName} {selectedUser?.lastName}
                                </Typography>
                                <Chip size="small" label={selectedUser?.role} color="primary" variant="outlined" sx={{ height: 20 }} />
                            </Box>
                        </Box>

                        <Box
                            ref={scrollRef}
                            sx={{
                                flexGrow: 1,
                                p: 3,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2
                            }}
                        >
                            {loading ? (
                                <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.senderId === session?.user?.id;
                                    return (
                                        <Box
                                            key={msg.id}
                                            sx={{
                                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                maxWidth: '75%'
                                            }}
                                        >
                                            <Paper
                                                sx={{
                                                    p: 2,
                                                    bgcolor: isMe ? 'primary.main' : 'background.paper',
                                                    color: isMe ? 'primary.contrastText' : 'text.primary',
                                                    borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                    boxShadow: 1
                                                }}
                                            >
                                                <Typography variant="body1">{msg.content}</Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        mt: 0.5,
                                                        display: 'block',
                                                        textAlign: 'right',
                                                        opacity: 0.6
                                                    }}
                                                >
                                                    {format(new Date(msg.createdAt), 'HH:mm')}
                                                </Typography>
                                            </Paper>
                                        </Box>
                                    );
                                })
                            )}
                        </Box>

                        <Box p={2} sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                            <Box display="flex" gap={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Type your message here..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 4
                                        }
                                    }}
                                />
                                <IconButton
                                    color="primary"
                                    disabled={!newMessage.trim() || sending}
                                    onClick={handleSendMessage}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                                    }}
                                >
                                    {sending ? <CircularProgress size={24} color="inherit" /> : <Send />}
                                </IconButton>
                            </Box>
                        </Box>
                    </>
                ) : (
                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="text.secondary">
                        <School sx={{ fontSize: 64, mb: 2, opacity: 0.1 }} />
                        <Typography variant="h6">Select a chat to view messages</Typography>
                        {recipients.length > 0 ? (
                            <Button variant="text" startIcon={<Add />} onClick={() => setOpenDialog(true)}>Start new conversation</Button>
                        ) : (
                            <Typography variant="body2" sx={{ mt: 1 }}>Messaging is available between parents and school staff.</Typography>
                        )}
                    </Box>
                )}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
                    <DialogTitle>New Conversation</DialogTitle>
                    <DialogContent>
                        <Box mt={1} display="flex" flexDirection="column" gap={2}>
                            <TextField
                                select
                                fullWidth
                                label="Recipient"
                                value={selectedRecipientId}
                                onChange={(e) => setSelectedRecipientId(e.target.value)}
                            >
                                {recipients.map((r: any) => (
                                    <MenuItem key={r.id} value={r.id}>
                                        {r.firstName} {r.lastName} ({r.role})
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth
                                label="Message"
                                multiline
                                rows={3}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleStartNewChat}
                            disabled={sending || !selectedRecipientId || !newMessage.trim()}
                        >
                            Send Initial Message
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Paper>
    );
}

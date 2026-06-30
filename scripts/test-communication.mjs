const base = 'http://localhost:3000';

async function login(email, password) {
    const csrfRes = await fetch(`${base}/api/auth/csrf`);
    const { csrfToken } = await csrfRes.json();
    const cookies = csrfRes.headers.getSetCookie?.() ?? [];

    const body = new URLSearchParams({
        csrfToken,
        identifier: email,
        password,
        redirect: 'false',
        json: 'true',
    });

    const res = await fetch(`${base}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: cookies.map((c) => c.split(';')[0]).join('; '),
        },
        body,
        redirect: 'manual',
    });

    const sessionCookies = [
        ...cookies.map((c) => c.split(';')[0]),
        ...(res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]),
    ].join('; ');

    return sessionCookies;
}

async function api(cookie, path, options = {}) {
    const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
            Cookie: cookie,
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

async function run() {
    const parentCookie = await login('parent@demo.com', 'password123');
    const teacherCookie = await login('teacher@demo.com', 'password123');
    const principalCookie = await login('principal@demo.com', 'password123');

    console.log('=== Messages GET (parent) ===');
    const parentMsgs = await api(parentCookie, '/api/messages');
    console.log(parentMsgs.status, Array.isArray(parentMsgs.data) ? `${parentMsgs.data.length} messages` : parentMsgs.data);

    console.log('=== Recipients (parent) ===');
    const recipients = await api(parentCookie, '/api/users/recipients');
    console.log(recipients.status, recipients.data?.map?.(r => `${r.firstName} (${r.role})`) ?? recipients.data);

    console.log('=== Send message (parent -> teacher) ===');
    const teacherId = recipients.data?.[0]?.id;
    const send = await api(parentCookie, '/api/messages', {
        method: 'POST',
        body: JSON.stringify({
            recipientId: teacherId,
            subject: 'Test',
            content: 'API test message from parent',
        }),
    });
    console.log(send.status, send.data?.id ? 'sent' : send.data);

    console.log('=== Unread messages (teacher) ===');
    const unread = await api(teacherCookie, '/api/messages?unreadOnly=true');
    console.log(unread.status, Array.isArray(unread.data) ? `${unread.data.length} unread` : unread.data);

    console.log('=== Mark read (teacher) ===');
    const markRead = await api(teacherCookie, '/api/messages', {
        method: 'PATCH',
        body: JSON.stringify({ senderId: 'mock-parent-1' }),
    });
    console.log(markRead.status, markRead.data);

    console.log('=== Notifications (parent) ===');
    const notifs = await api(parentCookie, '/api/notifications');
    console.log(notifs.status, Array.isArray(notifs.data) ? `${notifs.data.length} notifications` : notifs.data);

    console.log('=== Mark all read (parent) ===');
    const markAll = await api(parentCookie, '/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAllRead: true }),
    });
    console.log(markAll.status, markAll.data);

    console.log('=== Create announcement (principal) ===');
    const ann = await api(principalCookie, '/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
            title: 'Test Announcement',
            content: 'This is a test announcement for communication features.',
            audience: 'PARENTS',
        }),
    });
    console.log(ann.status, ann.data?.id ? 'created' : ann.data);

    console.log('=== Check parent got notification ===');
    const notifsAfter = await api(parentCookie, '/api/notifications');
    const newNotif = notifsAfter.data?.find?.(n => n.title === 'New announcement');
    console.log(notifsAfter.status, newNotif ? 'notification created' : 'no notification found');

    console.log('=== Learner recipients (should be empty) ===');
    const learnerCookie = await login('learner@demo.com', 'password123');
    const learnerRecipients = await api(learnerCookie, '/api/users/recipients');
    console.log(learnerRecipients.status, learnerRecipients.data);

    console.log('\nAll communication API tests completed.');
}

run().catch(console.error);

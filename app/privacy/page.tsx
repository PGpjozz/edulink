import { Container, Typography, Box, Paper } from '@mui/material';

export const metadata = {
    title: 'Privacy Policy — EduLink',
};

export default function PrivacyPage() {
    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Privacy Policy (POPIA)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Version 2026-01 · Last updated June 2026
                </Typography>

                <Box component="section" sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>1. Who we are</Typography>
                    <Typography paragraph>
                        EduLink is a school management platform. Each school using EduLink is the responsible party
                        for learner and parent personal information. EduLink (the platform operator) processes data
                        on behalf of schools as a service provider under the Protection of Personal Information Act (POPIA).
                    </Typography>
                </Box>

                <Box component="section" sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>2. What we collect</Typography>
                    <Typography component="ul" sx={{ pl: 3 }}>
                        <li>Name, email, phone number, and role (staff, parent, learner)</li>
                        <li>South African ID number (learners only, for secure sign-in)</li>
                        <li>Academic records: grades, attendance, homework, behaviour, assessments</li>
                        <li>Messages between parents and school staff</li>
                        <li>Billing and payment references (processed via PayFast)</li>
                    </Typography>
                </Box>

                <Box component="section" sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>3. How we use data</Typography>
                    <Typography paragraph>
                        Data is used solely to deliver school administration services: teaching, reporting,
                        communication, and fee collection. We do not sell personal information. Schools may not
                        use learner data for purposes unrelated to education without appropriate consent.
                    </Typography>
                </Box>

                <Box component="section" sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>4. Security</Typography>
                    <Typography paragraph>
                        Passwords are hashed. Access is role-based and scoped per school. Audit logs record
                        sensitive actions. Production deployments require strong secrets, PayFast for payments,
                        and verified email for account recovery.
                    </Typography>
                </Box>

                <Box component="section" sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>5. Your rights</Typography>
                    <Typography paragraph>
                        Under POPIA you may request access to, correction of, or deletion of your personal information.
                        Signed-in users can download a copy of their account data from{' '}
                        <code>/api/user/data-export</code> while logged in.
                        Contact your school administrator for full academic record requests.
                    </Typography>
                </Box>

                <Box component="section" sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>6. Retention</Typography>
                    <Typography paragraph>
                        Schools determine retention periods for academic records in line with departmental requirements.
                        When a school leaves EduLink, data export can be arranged before account closure.
                    </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                    <a href="/auth/signin">Back to sign in</a>
                </Typography>
            </Paper>
        </Container>
    );
}

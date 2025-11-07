# 12. Security & Compliance

- **OAuth 2.0**: Google Calendar tokens stored encrypted in DB
- **Webhook Validation**: Verify Google Chat webhooks before storing
- **Role-Based Projection**: Timeline events filtered by `visibility` field
- **Rate Limiting**: 100 req/min per recruiter for dashboard endpoints
- **Data Encryption**: Webhook URLs encrypted at rest (AES-256)
- **GDPR**: Candidate timeline events respect data deletion requests

---

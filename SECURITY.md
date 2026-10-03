# Security and privacy

## Data sent to hosted inference

When a user actively opts in, Facet sends the current professional profile and recent conversation messages to the configured Hugging Face Inference Provider. This can include names, employers, locations, achievements, skills, and work preferences. Facet does not send local files, environment variables, or the API token as model content.

Users can leave hosted AI unchecked and use deterministic demo mode without sending conversation data to an external model provider.

## Deployment checklist

Before using Facet with real personal data:

- Add authentication and profile ownership checks.
- Replace file persistence with an encrypted managed database.
- Implement export, correction, retention, and deletion controls.
- Restrict CORS to the deployed application origin.
- Put the service behind TLS and a production rate limiter.
- Review the selected inference provider's data processing and retention terms.
- Store `HF_TOKEN` in a secret manager, never in source control.
- Add audit logging that records actions without duplicating profile content.

## Reporting a vulnerability

Please open a private security advisory in the GitHub repository. Do not include real personal information or secrets in the report.


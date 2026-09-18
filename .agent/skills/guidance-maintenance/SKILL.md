# Guidance Maintenance
Keep agent guidance and skills stable enough that ordinary implementation changes do not require documentation churn.
## Keep
Document durable project contracts, security boundaries, coding standards, module responsibilities, supported interfaces, and verification rules.
## Do Not Duplicate
Do not maintain current file inventories, exact script counts, release numbers, provider URLs, installed-app lists, extension lists, generated output, or one-off fixes in agent guidance. The repository and the implementation are the source of truth for those details.
## Update Rule
Update guidance only when a durable contract or working standard changes. A normal bug fix, file move, dependency refresh, or implementation refactor does not require updating every guidance file.
When a path move makes a direct documentation or CI reference stale, update that reference as part of the same change. Keep README edits limited to the smallest user-facing detail required by the request.
Do not add history, migration narratives, or explanations of previous agent mistakes to guidance files.

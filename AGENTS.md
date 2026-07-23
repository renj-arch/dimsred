## Reminders

- **remind**: `Get-ChildItem -Recurse -Filter "*.md" | Select-String -Pattern "\b$(Get-Date -Format 'MMMM')\b" | ForEach-Object { $_.Filename }` — finds markdown files mentioning the current month (e.g. birthdays, deadlines in Obsidian vault)

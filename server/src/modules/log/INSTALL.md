# Install express-validator

Run this command to install the validation library:

```bash
npm install express-validator
```

This adds request validation middleware to check:
- Required fields
- Data types
- Valid formats (ISO8601 dates, MongoDB IDs, etc.)
- Valid values (enums like REQUEST/RESPONSE)
- Value ranges (limit 1-1000, statusCode 100-599)

Then you can start the service:

```bash
node src/modules/log/app.js
```

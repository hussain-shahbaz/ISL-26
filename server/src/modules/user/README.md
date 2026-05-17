# User Module

A complete monolithic microservice-like module for managing User, Role, and UserIdentifier entities using Prisma ORM and PostgreSQL.

## Module Structure

```
user/
├── user-controller.js      # HTTP request handlers
├── user-service.js         # Business logic
├── user-repository.js      # Database operations (Prisma)
├── user-validator.js       # Input validation
├── user-model.js           # Entity schema definition
├── user-module.js          # Module entry point
├── user-route.js           # Route definitions
├── db.js                   # Prisma client initialization
├── index.js                # Module exports
├── package.json            # Dependencies
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
└── .env                    # Environment variables
```

## Features

- **Complete CRUD Operations**: Create, read, update, delete users
- **User Identifiers**: Manage department, degree program, batch information
- **Role-Based System**: ADMIN, INSTRUCTOR, STUDENT roles
- **Soft Deletes**: Preserve data integrity with soft delete functionality
- **Input Validation**: Comprehensive validation for all inputs
- **Prisma ORM**: Type-safe database operations
- **PostgreSQL**: Robust relational database
- **Class-Based Architecture**: Clean, scalable code structure
- **Error Handling**: Comprehensive error handling and logging

## API Endpoints

### User Management
- `POST /api/user/create` - Create a new user
- `GET /api/user/get-users` - Get all users with optional filters
- `GET /api/user/get/:id` - Get user by ID
- `PUT /api/user/update/:id` - Update user details
- `DELETE /api/user/delete/:id` - Soft delete user
- `POST /api/user/restore/:id` - Restore deleted user

### User Identifier Management
- `POST /api/user/:id/identifier` - Create user identifier
- `GET /api/user/:id/identifier` - Get user identifier
- `PUT /api/user/:id/identifier` - Update user identifier

### Statistics
- `GET /api/user/statistics` - Get user count by role

## Database Schema

### User Model
- `id` (UUID): Unique identifier
- `name` (String): User's full name (max 100)
- `email` (String): User's email (unique, max 100)
- `role` (Enum): ADMIN, INSTRUCTOR, or STUDENT
- `university` (String): Default "UET" (max 50)
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `isDeleted` (Boolean): Soft delete flag
- `identifier` (Relationship): One-to-one with UserIdentifier

### UserIdentifier Model
- `id` (UUID): Unique identifier
- `identifier` (String): Registration/roll number (unique, max 50)
- `department` (String): Department name (max 100)
- `degreeProgram` (String): Degree program (optional, max 100)
- `batch` (Int): Batch year (optional)
- `userId` (Foreign Key): Reference to User

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Initialize Prisma:
```bash
npx prisma migrate dev --name init
```

4. Generate Prisma Client:
```bash
npx prisma generate
```

### Running the Module

As a standalone module (if your app structure supports it):
```bash
npm start
```

For development with hot reload:
```bash
npm run dev
```

## Usage Examples

### Create a User
```javascript
const UserService = require('./user-service');

const newUser = await UserService.createUser({
  name: "John Doe",
  email: "john@example.com",
  role: "STUDENT",
  university: "UET"
});
```

### Get User by ID
```javascript
const user = await UserService.getUserById(userId);
```

### Create User Identifier
```javascript
await UserService.createUserIdentifier(userId, {
  identifier: "2021-EE-123",
  department: "Electrical Engineering",
  degreeProgram: "Bachelor's",
  batch: 2021
});
```

## Error Handling

All methods include comprehensive error handling:
- Validation errors return 400 (Bad Request)
- Not found errors return 404 (Not Found)
- Server errors return 500 (Internal Server Error)

Each response includes:
```json
{
  "success": true/false,
  "message": "Descriptive message",
  "data": {...} // or empty on error
}
```

## Development

### Adding New Features
1. Update the Prisma schema if needed
2. Run migration: `npx prisma migrate dev --name feature-name`
3. Add validation in `user-validator.js`
4. Add database operations in `user-repository.js`
5. Add business logic in `user-service.js`
6. Add HTTP handler in `user-controller.js`
7. Add route in `user-route.js`

### Testing
(Add test commands here)

## Contributing
(Add contribution guidelines here)

## License
(Add license information here)

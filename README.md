# Fiserv Inventory Management System

A comprehensive inventory management system for tracking parts, machines, and their usage.

## Features

- Part inventory management
- Machine tracking
- Part-to-machine assignment
- Usage history tracking
- Guest access for viewing inventory
- Admin access for managing inventory
- Real-time search functionality
- Low stock alerts
- Export functionality for reports

## Tech Stack

- Frontend:
  - React
  - TypeScript
  - React Bootstrap
  - Axios
  - Redux Toolkit

- Backend:
  - Node.js
  - Express
  - PostgreSQL
  - JWT Authentication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fiservinventory-app.git
   cd fiservinventory-app
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4. Set up environment variables:
   - Create a `.env` file in the backend directory
   - Add the following variables:
     ```
     PORT=3001
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=your_database_name
     DB_USER=your_database_user
     DB_PASSWORD=your_database_password
     JWT_SECRET=your_jwt_secret
     ```

5. Initialize the database:
   ```bash
   cd ../backend
   npm run db:init
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Access the application at `http://localhost:3000`

## Usage

### Guest Access
- Click "Continue as Guest" on the login page
- View parts inventory
- Search for parts
- View machine assignments
- View usage history

### Admin Access
- Log in with admin credentials
- Full access to all features
- Add/remove parts
- Manage machines
- Generate reports
- Export data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# TrackWise - Personal Finance Tracker

A responsive personal finance tracker web application built with Node.js, Express.js, and MySQL.

## Features

- User authentication (login/register)
- Track income and expenses
- View transaction history
- Responsive design with black/white/grey theme
- Secure password handling
- Session-based authentication

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm (Node Package Manager)

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd trackwise
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=trackwise
SESSION_SECRET=your_session_secret_key_here
```

4. Set up the database:
- Create a MySQL database named 'trackwise'
- Import the schema from `schema.sql`

5. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Project Structure

```
trackwise/
├── public/
│   ├── css/
│   │   └── style.css
│   │   
│   ├── js/
│   │   └── auth.js
│   ├── index.html
│   └── register.html
├── server.js
├── schema.sql
├── package.json
└── README.md
```

## Security Features

- Password hashing using bcrypt
- SQL injection prevention using prepared statements
- Session-based authentication
- Secure password storage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 